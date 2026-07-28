<template>
  <view class="cat-page" data-cmp="CategoryMgr">
    <view class="topbar">
      <view class="back-btn" @click="goBack"><text>←</text></view>
      <text class="topbar-title">分类管理</text>
      <view class="add-btn" @click="openCreate"><text>＋</text></view>
    </view>

    <!-- 支出/收入 Tab -->
    <view class="type-tabs">
      <view class="type-tab" :class="{ active: currentType === 'expense' }" @click="switchType('expense')">
        <text>支出</text>
      </view>
      <view class="type-tab" :class="{ active: currentType === 'income' }" @click="switchType('income')">
        <text>收入</text>
      </view>
    </view>

    <scroll-view class="page-scroll" scroll-y enhanced :show-scrollbar="false">
      <view v-if="loading" class="empty-tip"><text>加载中…</text></view>

      <view v-else-if="!grouped.length" class="empty-tip"><text>暂无分类</text></view>

      <view v-for="g in grouped" :key="g.code" class="group-block">
        <view class="group-head">
          <text class="group-icon">{{ g.icon }}</text>
          <text class="group-name">{{ g.name }}</text>
        </view>

        <view
          v-for="(cat, idx) in g.cats"
          :key="cat._id"
          class="cat-row"
          :class="{ hidden: cat.is_hidden }"
        >
          <text class="cat-icon">{{ cat.icon }}</text>
          <view class="cat-info">
            <text class="cat-name">{{ cat.name }}</text>
            <view class="cat-tags">
              <text v-if="cat.is_system" class="tag tag-sys">系统</text>
              <text v-else class="tag tag-custom">自定义</text>
              <text v-if="cat.is_hidden" class="tag tag-hidden">已隐藏</text>
              <text v-if="cat.usage_count > 0" class="tag tag-usage">{{ cat.usage_count }} 笔账目</text>
            </view>
          </view>

          <view class="cat-actions">
            <!-- 排序：仅自定义，组内上下移 -->
            <template v-if="!cat.is_system">
              <view class="act-btn" :class="{ disabled: isFirstInGroup(g, idx) }" @click="move(g, idx, -1)"><text>↑</text></view>
              <view class="act-btn" :class="{ disabled: isLastInGroup(g, idx) }" @click="move(g, idx, 1)"><text>↓</text></view>
              <view class="act-btn" @click="openEdit(cat)"><text>✏️</text></view>
              <view class="act-btn act-danger" @click="openDelete(cat)"><text>🗑</text></view>
            </template>
            <view class="act-btn" @click="toggleHide(cat)">
              <text>{{ cat.is_hidden ? '👁' : '🚫' }}</text>
            </view>
          </view>
        </view>
      </view>

      <view style="height:40px;" />
    </scroll-view>

    <!-- 新建/编辑弹窗 -->
    <view v-if="editSheetOpen" class="sheet-overlay" @click="editSheetOpen = false">
      <view class="sheet-panel" @click.stop>
        <view class="sheet-handle"><view class="handle-bar" /></view>
        <text class="sheet-title">{{ editingCat ? '编辑分类' : '新建分类' }}</text>

        <text class="form-label">名称</text>
        <input class="sheet-input" v-model="form.name" maxlength="32" placeholder="如：奶茶、打车" />

        <text class="form-label" style="margin-top:14px;">图标</text>
        <view class="emoji-grid">
          <view
            v-for="em in EMOJIS"
            :key="em"
            class="emoji-cell"
            :class="{ active: form.icon === em }"
            @click="form.icon = em"
          ><text>{{ em }}</text></view>
        </view>

        <text class="form-label" style="margin-top:14px;">所属分组</text>
        <view class="seg-group">
          <view
            v-for="gp in groups"
            :key="gp.code"
            class="seg-btn"
            :class="{ active: form.group === gp.code }"
            @click="form.group = gp.code"
          >{{ gp.name }}</view>
        </view>

        <view class="save-btn" @click="saveEdit"><text>{{ editingCat ? '保存' : '创建' }}</text></view>
      </view>
    </view>

    <!-- 删除/合并弹窗 -->
    <view v-if="deleteSheetOpen" class="sheet-overlay" @click="deleteSheetOpen = false">
      <view class="sheet-panel" @click.stop>
        <view class="sheet-handle"><view class="handle-bar" /></view>
        <text class="sheet-title">删除分类</text>

        <view v-if="deletingCat && deletingCat.usage_count > 0" class="merge-tip">
          <text>该分类下有 {{ deletingCat.usage_count }} 笔账目，删除前请选择合并目标（账目将转移至目标分类）：</text>
        </view>
        <view v-else class="merge-tip">
          <text>确认删除该自定义分类？此操作不可恢复。</text>
        </view>

        <view v-if="deletingCat && deletingCat.usage_count > 0" class="merge-list">
          <view
            v-for="t in mergeTargets"
            :key="t._id"
            class="merge-item"
            :class="{ active: mergeTargetId === t._id }"
            @click="mergeTargetId = t._id"
          >
            <text class="merge-icon">{{ t.icon }}</text>
            <text class="merge-name">{{ t.name }}</text>
            <text v-if="mergeTargetId === t._id" class="merge-check">✓</text>
          </view>
          <view v-if="!mergeTargets.length" class="merge-empty"><text>无其他可选分类</text></view>
        </view>

        <view class="save-btn danger" @click="confirmDelete"><text>确认删除</text></view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '@/stores/user.js'
import {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories
} from '@/api/sparejar.js'
import { getGroupsByType } from '@/constants/categoryGroups.js'

const userStore = useUserStore()

const currentType = ref('expense')
const cats = ref([])
const loading = ref(false)

const groups = computed(() => getGroupsByType(currentType.value))

/** 按二级分组折叠，仅含当前 type */
const grouped = computed(() => {
  return groups.value
    .map((g) => ({
      code: g.code,
      name: g.name,
      icon: g.icon,
      cats: cats.value.filter((c) => c.type === currentType.value && c.group === g.code)
    }))
    .filter((g) => g.cats.length)
})

/** 删除时的合并目标：同 type、非自身、未隐藏 */
const deletingCat = ref(null)
const mergeTargetId = ref('')
const mergeTargets = computed(() => {
  if (!deletingCat.value) return []
  return cats.value.filter(
    (c) => c._id !== deletingCat.value._id && !c.is_hidden
  )
})

const editSheetOpen = ref(false)
const deleteSheetOpen = ref(false)
const editingCat = ref(null)
const form = ref({ name: '', icon: '📦', group: '' })

const EMOJIS = [
  '🍜', '🥡', '🧋', '🛒', '🏪', '🚌', '🚕', '⛽', '🅿️', '📞',
  '📦', '🏠', '🏦', '🚗', '💧', '💡', '🔥', '🏢', '🌐', '📱',
  '👕', '👟', '💇', '💄', '🛋️', '🍳', '📱', '✈️', '🏨', '🎬',
  '🎮', '🏋️', '🎨', '🐱', '📚', '🏥', '💊', '🩺', '🛡️', '🦷',
  '🎓', '📖', '💻', '📝', '👶', '🧧', '🍻', '🎁', '💰', '📈'
]

async function load() {
  if (!userStore.state.uid) return
  loading.value = true
  try {
    const res = await listCategories({ type: currentType.value, include_hidden: true })
    cats.value = res || []
    // 同步刷新记账页可用的分类（不含隐藏）
    await userStore.loadCategories(false)
  } catch (err) {
    uni.showToast({ title: (err && err.message) || '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function switchType(t) {
  if (currentType.value === t) return
  currentType.value = t
  editSheetOpen.value = false
  deleteSheetOpen.value = false
  load()
}

function goBack() {
  uni.navigateBack({ delta: 1, fail: () => uni.switchTab({ url: '/pages/profile/profile' }) })
}

function openCreate() {
  editingCat.value = null
  form.value = { name: '', icon: '📦', group: groups.value[0].code }
  editSheetOpen.value = true
}

function openEdit(cat) {
  editingCat.value = cat
  form.value = { name: cat.name, icon: cat.icon, group: cat.group }
  editSheetOpen.value = true
}

async function saveEdit() {
  const name = (form.value.name || '').trim()
  if (!name) {
    uni.showToast({ title: '请输入分类名称', icon: 'none' })
    return
  }
  try {
    if (editingCat.value) {
      await updateCategory(editingCat.value._id, {
        name,
        icon: form.value.icon,
        group: form.value.group
      })
    } else {
      await createCategory({
        type: currentType.value,
        name,
        icon: form.value.icon,
        group: form.value.group
      })
    }
    editSheetOpen.value = false
    uni.showToast({ title: '已保存', icon: 'success' })
    await load()
  } catch (err) {
    uni.showToast({ title: (err && err.message) || '保存失败', icon: 'none' })
  }
}

async function toggleHide(cat) {
  try {
    await updateCategory(cat._id, { is_hidden: !cat.is_hidden })
    await load()
  } catch (err) {
    uni.showToast({ title: (err && err.message) || '操作失败', icon: 'none' })
  }
}

function isFirstInGroup(g, idx) {
  return idx === 0
}
function isLastInGroup(g, idx) {
  return idx === g.cats.length - 1
}

async function move(g, idx, dir) {
  if (dir < 0 && idx === 0) return
  if (dir > 0 && idx === g.cats.length - 1) return
  const list = g.cats.slice()
  const tmp = list[idx]
  list[idx] = list[idx + dir]
  list[idx + dir] = tmp
  const orderedIds = list.map((c) => c._id)
  try {
    await reorderCategories(currentType.value, g.code, orderedIds)
    await load()
  } catch (err) {
    uni.showToast({ title: (err && err.message) || '排序失败', icon: 'none' })
  }
}

function openDelete(cat) {
  deletingCat.value = cat
  mergeTargetId.value = ''
  deleteSheetOpen.value = true
}

async function confirmDelete() {
  const cat = deletingCat.value
  if (!cat) return
  if (cat.usage_count > 0 && !mergeTargetId.value) {
    uni.showToast({ title: '请选择合并目标分类', icon: 'none' })
    return
  }
  try {
    await deleteCategory(cat._id, cat.usage_count > 0 ? mergeTargetId.value : null)
    deleteSheetOpen.value = false
    uni.showToast({ title: '已删除', icon: 'success' })
    await load()
  } catch (err) {
    uni.showToast({ title: (err && err.message) || '删除失败', icon: 'none' })
  }
}

onMounted(load)
</script>

<style scoped>
.cat-page { width: 100%; height: 100%; overflow: hidden; position: relative; background: #f2fcf2; display: flex; flex-direction: column; }
.topbar { display: flex; align-items: center; justify-content: space-between; padding: 50px 16px 12px; }
.back-btn, .add-btn { width: 36px; height: 36px; border-radius: 50%; background: rgba(255,255,255,0.7); display: flex; align-items: center; justify-content: center; font-size: 20px; color: #25cc5d; border: 1px solid #c2f2c8; cursor: pointer; }
.add-btn { font-size: 22px; color: #fff; background: linear-gradient(135deg,#4fd974,#25cc5d); border: none; }
.topbar-title { font-size: 17px; font-weight: 800; color: #0f1c14; }

.type-tabs { display: flex; gap: 8px; padding: 0 16px 12px; }
.type-tab { flex: 1; text-align: center; padding: 10px; border-radius: 14px; background: rgba(255,255,255,0.6); border: 1px solid #c2f2c8; font-size: 14px; font-weight: 700; color: #6b8c7a; cursor: pointer; }
.type-tab.active { background: linear-gradient(135deg,#4fd974,#25cc5d); color: #fff; border-color: transparent; }

.page-scroll { flex: 1; padding: 0 16px; }
.empty-tip { text-align: center; color: #9bb8a8; font-size: 13px; padding: 40px 0; }

.group-block { margin-bottom: 14px; }
.group-head { display: flex; align-items: center; gap: 8px; padding: 8px 4px; }
.group-icon { font-size: 16px; }
.group-name { font-size: 13px; font-weight: 700; color: #6b8c7a; }

.cat-row { display: flex; align-items: center; gap: 12px; padding: 12px 14px; margin-bottom: 8px; border-radius: 16px; background: rgba(255,255,255,0.7); border: 1px solid #e3f5e6; }
.cat-row.hidden { opacity: 0.55; }
.cat-icon { font-size: 24px; width: 32px; text-align: center; }
.cat-info { flex: 1; }
.cat-name { font-size: 15px; font-weight: 700; color: #0f1c14; display: block; }
.cat-tags { display: flex; gap: 6px; margin-top: 4px; flex-wrap: wrap; }
.tag { font-size: 10px; padding: 1px 6px; border-radius: 6px; font-weight: 600; }
.tag-sys { background: #e8f3ff; color: #3b82f6; }
.tag-custom { background: #eafaf0; color: #25cc5d; }
.tag-hidden { background: #f1f1f1; color: #9bb8a8; }
.tag-usage { background: #fff4e0; color: #f59e0b; }

.cat-actions { display: flex; align-items: center; gap: 4px; }
.act-btn { width: 30px; height: 30px; border-radius: 9px; background: rgba(242,252,242,0.9); border: 1px solid #c2f2c8; display: flex; align-items: center; justify-content: center; font-size: 14px; cursor: pointer; }
.act-btn.disabled { opacity: 0.35; pointer-events: none; }
.act-danger { background: #fff0f0; border-color: #ffd2d2; }

/* Sheet */
.sheet-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.35); z-index: 300; display: flex; align-items: flex-end; justify-content: center; }
.sheet-panel { width: 100%; max-width: 480px; max-height: 88vh; overflow-y: auto; background: linear-gradient(180deg,rgba(255,255,255,0.98),rgba(242,252,242,0.96)); border-radius: 24px 24px 0 0; padding: 0 20px 30px; }
.sheet-handle { display: flex; justify-content: center; padding: 12px 0 8px; }
.handle-bar { width: 38px; height: 4px; border-radius: 3px; background: rgba(194,242,200,0.8); }
.sheet-title { font-size: 17px; font-weight: 700; color: #0f1c14; display: block; margin-bottom: 12px; }
.form-label { font-size: 12px; color: #6b8c7a; font-weight: 600; display: block; margin-bottom: 8px; }
.sheet-input { width: 100%; box-sizing: border-box; padding: 12px 14px; border-radius: 14px; background: rgba(255,255,255,0.6); border: 1px solid #c2f2c8; font-size: 15px; color: #0f1c14; }

.emoji-grid { display: grid; grid-template-columns: repeat(8, 1fr); gap: 6px; }
.emoji-cell { aspect-ratio: 1; display: flex; align-items: center; justify-content: center; font-size: 20px; border-radius: 10px; background: rgba(255,255,255,0.6); border: 1px solid #e3f5e6; cursor: pointer; }
.emoji-cell.active { border-color: #25cc5d; background: #eafaf0; }

.seg-group { display: flex; flex-wrap: wrap; gap: 8px; }
.seg-btn { padding: 8px 12px; border-radius: 12px; background: rgba(255,255,255,0.6); border: 1px solid #c2f2c8; font-size: 12px; font-weight: 600; color: #6b8c7a; cursor: pointer; }
.seg-btn.active { background: linear-gradient(135deg,#4fd974,#25cc5d); color: #fff; border-color: transparent; }

.save-btn { width: 100%; padding: 14px; border-radius: 16px; background: linear-gradient(135deg,#4fd974,#25cc5d); text-align: center; color: #fff; font-size: 14px; font-weight: 800; margin-top: 20px; cursor: pointer; }
.save-btn.danger { background: linear-gradient(135deg,#ff8a8a,#ff6b6b); }

.merge-tip { font-size: 13px; color: #6b8c7a; line-height: 1.6; margin-bottom: 12px; }
.merge-list { max-height: 40vh; overflow-y: auto; }
.merge-item { display: flex; align-items: center; gap: 10px; padding: 12px 14px; border-radius: 14px; background: rgba(255,255,255,0.6); border: 1px solid #e3f5e6; margin-bottom: 8px; cursor: pointer; }
.merge-item.active { border-color: #25cc5d; background: #eafaf0; }
.merge-icon { font-size: 20px; }
.merge-name { flex: 1; font-size: 14px; font-weight: 600; color: #0f1c14; }
.merge-check { color: #25cc5d; font-weight: 800; }
.merge-empty { text-align: center; color: #9bb8a8; font-size: 13px; padding: 20px 0; }
</style>
