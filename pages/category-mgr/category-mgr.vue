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

      <view v-else-if="!visibleCats.length" class="empty-tip"><text>暂无分类</text></view>

      <view
        v-for="(cat, idx) in visibleCats"
        :key="cat._id"
        class="cat-row"
        :class="{ hidden: cat.is_hidden }"
      >
        <image v-if="cat.icon_type === 'image' && cat.icon_url" class="cat-icon-img" :src="cloud.display(cat.icon_url)" mode="aspectFill" />
        <text v-else class="cat-icon">{{ cat.icon }}</text>
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
          <!-- 排序：仅自定义，整 type 内上下移 -->
          <template v-if="!cat.is_system">
            <view class="act-btn" :class="{ disabled: isFirst(idx) }" @click="move(idx, -1)"><text>↑</text></view>
            <view class="act-btn" :class="{ disabled: isLast(idx) }" @click="move(idx, 1)"><text>↓</text></view>
          </template>
          <!-- 预置分类与自定义分类都可编辑（改名/换图标） -->
          <view class="act-btn" @click="openEdit(cat)"><text>✏️</text></view>
          <!-- 预置分类不可删除 -->
          <view v-if="!cat.is_system" class="act-btn act-danger" @click="openDelete(cat)"><text>🗑</text></view>
          <view class="act-btn" @click="toggleHide(cat)">
            <text>{{ cat.is_hidden ? '👁' : '🚫' }}</text>
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

        <text class="form-label" style="margin-top:14px;">简介 / 备注（可选）</text>
        <textarea
          class="sheet-input desc-input"
          v-model="form.desc"
          maxlength="100"
          placeholder="补充这个分类的说明，可在贴纸详情中查看"
          auto-height
        />

        <text class="form-label" style="margin-top:14px;">图标</text>
        <view class="emoji-grid">
          <view
            v-for="em in EMOJIS"
            :key="em"
            class="emoji-cell"
            :class="{ active: form.icon_type !== 'image' && form.icon === em }"
            @click="pickEmoji(em)"
          ><text>{{ em }}</text></view>
        </view>

        <view class="icon-upload">
          <view class="upload-cell" @click="chooseIcon">
            <image
              v-if="form.icon_type === 'image' && form.icon_url"
              class="upload-prev"
              :src="cloud.display(form.icon_url)"
              mode="aspectFill"
            />
            <text v-else class="upload-plus">＋</text>
            <text class="upload-txt">{{ form.icon_type === 'image' ? '更换图片' : '上传图片' }}</text>
          </view>
          <text v-if="form.icon_type === 'image'" class="upload-clear" @click="clearIcon">移除</text>
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
          <text>该分类下有 {{ deletingCat.usage_count }} 笔账目，请选择处理方式：</text>
        </view>
        <view v-else class="merge-tip">
          <text>确认删除该自定义分类？此操作不可恢复。</text>
        </view>

        <template v-if="deletingCat && deletingCat.usage_count > 0">
          <view class="mode-list">
            <view class="mode-item" :class="{ active: delMode === 'keep' }" @click="delMode = 'keep'">
              <view class="mode-main">
                <text class="mode-name">保留账单，仅删除分类</text>
                <text class="mode-desc">账目仍显示为该分类，只是分类不再出现在选择列表</text>
              </view>
              <text v-if="delMode === 'keep'" class="mode-check">✓</text>
            </view>
            <view class="mode-item" :class="{ active: delMode === 'merge' }" @click="delMode = 'merge'">
              <view class="mode-main">
                <text class="mode-name">转移到其他分类</text>
                <text class="mode-desc">账目与贴纸转移到目标分类，账单保留</text>
              </view>
              <text v-if="delMode === 'merge'" class="mode-check">✓</text>
            </view>
            <view class="mode-item" :class="{ active: delMode === 'purge' }" @click="delMode = 'purge'">
              <view class="mode-main">
                <text class="mode-name">连同账单一并删除</text>
                <text class="mode-desc">同时删除这 {{ deletingCat.usage_count }} 笔账目，相关金额会同步回滚</text>
              </view>
              <text v-if="delMode === 'purge'" class="mode-check">✓</text>
            </view>
          </view>

          <view v-if="delMode === 'merge'" class="merge-list">
            <view
              v-for="t in mergeTargets"
              :key="t._id"
              class="merge-item"
              :class="{ active: mergeTargetId === t._id }"
              @click="mergeTargetId = t._id"
            >
              <image v-if="t.icon_type === 'image' && t.icon_url" class="merge-icon-img" :src="cloud.display(t.icon_url)" mode="aspectFill" />
              <text v-else class="merge-icon">{{ t.icon }}</text>
              <text class="merge-name">{{ t.name }}</text>
              <text v-if="mergeTargetId === t._id" class="merge-check">✓</text>
            </view>
            <view v-if="!mergeTargets.length" class="merge-empty"><text>无其他可选分类</text></view>
          </view>
        </template>

        <view class="save-btn danger" @click="confirmDelete"><text>确认删除</text></view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { onShow as uniOnShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/stores/user.js'
import { requireLogin } from '@/utils/guard.js';
import {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories
} from '@/api/sparejar.js'
import { createCloudImageResolver } from '@/utils/cdn.js'

const userStore = useUserStore()
// cloud:// 需解析成临时 URL 才能被 <image> 渲染；onShow 重新解析以撑过切后台过期
const cloud = createCloudImageResolver()
function resolveIcons() {
  const ids = [form.value.icon_url, ...(cats.value || []).map((c) => c.icon_url)].filter(Boolean)
  cloud.resolve(ids)
}
uniOnShow(resolveIcons)

const currentType = ref('expense')
const cats = ref([])
const loading = ref(false)

/** 当前 type 下所有分类，按 sort_order 平铺（不再按 group 折叠） */
const visibleCats = computed(() => {
  return cats.value
    .filter((c) => c.type === currentType.value)
    .slice()
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
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
const form = ref({ name: '', desc: '', icon: '📦', icon_type: 'emoji', icon_url: '' })

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
    resolveIcons() // 解析分类图标（cloud:// → 临时 URL）
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
  form.value = { name: '', desc: '', icon: '📦', icon_type: 'emoji', icon_url: '' }
  editSheetOpen.value = true
}

function openEdit(cat) {
  editingCat.value = cat
  form.value = { name: cat.name, desc: cat.desc || '', icon: cat.icon || '📦', icon_type: cat.icon_type || 'emoji', icon_url: cat.icon_url || '' }
  editSheetOpen.value = true
}

// 选 emoji 图标（切回 emoji 类型，清空自定义图标）
function pickEmoji(em) {
  form.value.icon = em
  form.value.icon_type = 'emoji'
  form.value.icon_url = ''
}
// 上传自定义图标：选图 → 传 uniCloud → 写入 icon_url
const iconUploading = ref(false)
async function chooseIcon() {
  let imgPath = ''
  try {
    const res = await uni.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera']
    })
    imgPath = (res.tempFilePaths && res.tempFilePaths[0]) || ''
  } catch (_e) {
    return // 用户取消
  }
  if (!imgPath) return
  iconUploading.value = true
  uni.showLoading({ title: '上传中…', mask: true })
  try {
    const ext = (imgPath.split('.').pop() || 'png').split('?')[0].toLowerCase()
    const cloudPath = `cat-icons/${userStore.state.uid || 'anon'}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const up = await uniCloud.uploadFile({ filePath: imgPath, cloudPath })
    const fileID = (up && up.fileID) || ''
    const url = fileID || (up && up.url) || ''
    if (url) {
      form.value.icon_type = 'image'
      form.value.icon_url = url
      cloud.resolve([url]) // cloud:// → 临时 URL 供 <image> 渲染
    } else {
      uni.showToast({ title: '上传失败，请重试', icon: 'none' })
    }
  } catch (err) {
    uni.showToast({ title: (err && err.message) || '上传失败', icon: 'none' })
  } finally {
    iconUploading.value = false
    uni.hideLoading()
  }
}
// 移除自定义图标，回退到 emoji
function clearIcon() {
  form.value.icon_type = 'emoji'
  form.value.icon_url = ''
}

async function saveEdit() {
  const name = (form.value.name || '').trim()
  if (!name) {
    uni.showToast({ title: '请输入分类名称', icon: 'none' })
    return
  }
  try {
    const isImage = form.value.icon_type === 'image'
    const iconUrl = isImage ? form.value.icon_url || '' : ''
    if (editingCat.value) {
      await updateCategory(editingCat.value._id, {
        name,
        desc: (form.value.desc || '').trim(),
        icon: form.value.icon,
        icon_type: form.value.icon_type || 'emoji',
        icon_url: iconUrl
      })
    } else {
      await createCategory({
        type: currentType.value,
        name,
        desc: (form.value.desc || '').trim(),
        icon: form.value.icon,
        icon_type: form.value.icon_type || 'emoji',
        icon_url: iconUrl
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

function isFirst(idx) {
  return idx === 0
}
function isLast(idx) {
  return idx === visibleCats.value.length - 1
}

async function move(idx, dir) {
  if (dir < 0 && idx === 0) return
  if (dir > 0 && idx === visibleCats.value.length - 1) return
  const list = visibleCats.value.slice()
  const tmp = list[idx]
  list[idx] = list[idx + dir]
  list[idx + dir] = tmp
  const orderedIds = list.map((c) => c._id)
  try {
    await reorderCategories(currentType.value, orderedIds)
    await load()
  } catch (err) {
    uni.showToast({ title: (err && err.message) || '排序失败', icon: 'none' })
  }
}

const delMode = ref('keep') // 'keep' 保留账单 | 'merge' 转移 | 'purge' 连同账单删除

function openDelete(cat) {
  if (cat.is_system) {
    uni.showToast({ title: '预置分类不可删除', icon: 'none' })
    return
  }
  deletingCat.value = cat
  mergeTargetId.value = ''
  delMode.value = 'keep'
  deleteSheetOpen.value = true
}

async function confirmDelete() {
  const cat = deletingCat.value
  if (!cat) return
  const hasTx = (cat.usage_count || 0) > 0
  const mode = hasTx ? delMode.value : 'merge'
  if (hasTx && mode === 'merge' && !mergeTargetId.value) {
    uni.showToast({ title: '请选择目标分类', icon: 'none' })
    return
  }
  try {
    await deleteCategory(cat._id, mode === 'merge' ? mergeTargetId.value : null, { mode })
    deleteSheetOpen.value = false
    uni.showToast({ title: '已删除', icon: 'success' })
    await load()
  } catch (err) {
    uni.showToast({ title: (err && err.message) || '删除失败', icon: 'none' })
  }
}

onMounted(() => {
  if (!requireLogin('/pages/category-mgr/category-mgr')) return
  load()
})
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

.cat-row { display: flex; align-items: center; gap: 12px; padding: 12px 14px; margin-bottom: 8px; border-radius: 16px; background: rgba(255,255,255,0.7); border: 1px solid #e3f5e6; }
.cat-row.hidden { opacity: 0.55; }
.cat-icon { font-size: 24px; width: 32px; text-align: center; }
.cat-icon-img { width: 32px; height: 32px; border-radius: 8px; }
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
.sheet-input.desc-input { min-height: 72px; line-height: 1.5; }

.emoji-grid { display: grid; grid-template-columns: repeat(8, 1fr); gap: 6px; }
.emoji-cell { aspect-ratio: 1; display: flex; align-items: center; justify-content: center; font-size: 20px; border-radius: 10px; background: rgba(255,255,255,0.6); border: 1px solid #e3f5e6; cursor: pointer; }
.emoji-cell.active { border-color: #25cc5d; background: #eafaf0; }

.icon-upload { display: flex; align-items: center; gap: 12px; margin-top: 12px; }
.upload-cell { display: flex; flex-direction: column; align-items: center; justify-content: center; width: 72px; height: 72px; border-radius: 12px; background: rgba(255,255,255,0.6); border: 1px dashed #25cc5d; cursor: pointer; }
.upload-prev { width: 100%; height: 100%; border-radius: 12px; }
.upload-plus { font-size: 26px; color: #25cc5d; line-height: 1; }
.upload-txt { margin-top: 4px; font-size: 11px; color: #6b8c7a; }
.upload-clear { font-size: 13px; color: #ff6b6b; text-decoration: underline; }

.seg-group { display: flex; flex-wrap: wrap; gap: 8px; }
.seg-btn { padding: 8px 12px; border-radius: 12px; background: rgba(255,255,255,0.6); border: 1px solid #c2f2c8; font-size: 12px; font-weight: 600; color: #6b8c7a; cursor: pointer; }
.seg-btn.active { background: linear-gradient(135deg,#4fd974,#25cc5d); color: #fff; border-color: transparent; }

.save-btn { width: 100%; padding: 14px; border-radius: 16px; background: linear-gradient(135deg,#4fd974,#25cc5d); text-align: center; color: #fff; font-size: 14px; font-weight: 800; margin-top: 20px; cursor: pointer; }
.save-btn.danger { background: linear-gradient(135deg,#ff8a8a,#ff6b6b); }

.merge-tip { font-size: 13px; color: #6b8c7a; line-height: 1.6; margin-bottom: 12px; }
.mode-list { display: flex; flex-direction: column; gap: 8px; }
.mode-item { display: flex; align-items: center; gap: 10px; padding: 12px 14px; border-radius: 14px; background: rgba(255,255,255,0.6); border: 1px solid #e3f5e6; cursor: pointer; }
.mode-item.active { border-color: #25cc5d; background: #eafaf0; }
.mode-main { flex: 1; display: flex; flex-direction: column; gap: 3px; }
.mode-name { font-size: 14px; font-weight: 700; color: #0f1c14; }
.mode-desc { font-size: 11px; color: #9bb8a8; }
.mode-check { color: #25cc5d; font-weight: 800; }
.merge-list { max-height: 40vh; overflow-y: auto; }
.merge-item { display: flex; align-items: center; gap: 10px; padding: 12px 14px; border-radius: 14px; background: rgba(255,255,255,0.6); border: 1px solid #e3f5e6; margin-bottom: 8px; cursor: pointer; }
.merge-item.active { border-color: #25cc5d; background: #eafaf0; }
.merge-icon { font-size: 20px; }
.merge-icon-img { width: 24px; height: 24px; border-radius: 6px; }
.merge-name { flex: 1; font-size: 14px; font-weight: 600; color: #0f1c14; }
.merge-check { color: #25cc5d; font-weight: 800; }
.merge-empty { text-align: center; color: #9bb8a8; font-size: 13px; padding: 20px 0; }
</style>
