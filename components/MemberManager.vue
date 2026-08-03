<template>
  <view v-if="visible" class="mask" @click.self="close">
    <view class="sheet">
      <view class="sheet-header">
        <text class="sheet-title">成员管理</text>
        <text class="sheet-sub">{{ ledgerName }}</text>
        <text class="close-btn" @click="close">✕</text>
      </view>

      <scroll-view scroll-y class="member-list">
        <view v-for="m in members" :key="m._id" class="member-item">
          <view class="avatar">{{ m.avatar_url || (m.is_self ? '🙋' : '👤') }}</view>
          <view class="member-info">
            <text class="member-name">{{ m.nickname }}<text v-if="m.is_self" class="tag">本人</text></text>
            <text class="member-rel">{{ relationLabel(m.relation) }}<text v-if="m.bio" class="member-bio"> · {{ m.bio }}</text></text>
          </view>
          <view class="member-actions">
            <view
              class="link-btn"
              :class="{ on: isLinked(m._id) }"
              @click="toggleLink(m._id)"
            >{{ isLinked(m._id) ? '已加入' : '加入账本' }}</view>
            <text class="edit-link" @click="openEdit(m)">编辑</text>
          </view>
        </view>
        <view v-if="!members.length" class="empty">还没有成员</view>
      </scroll-view>

      <view class="add-btn" @click="openAdd">+ 新增成员</view>

      <!-- 新增/编辑表单 -->
      <view v-if="formVisible" class="form-mask" @click.self="cancelForm">
        <view class="form">
          <text class="form-title">{{ editingId ? '编辑成员' : '新增成员' }}</text>
          <input class="f-input" v-model="form.nickname" placeholder="昵称（必填）" maxlength="20" />
          <input class="f-input" v-model="form.avatar" placeholder="头像 emoji 或图片URL（选填）" maxlength="100" />
          <picker :range="relationOptions" range-key="label" :value="relationIndex" @change="onRelationChange">
            <view class="f-picker">{{ relationLabel(form.relation) }}</view>
          </picker>
          <textarea class="f-textarea" v-model="form.bio" placeholder="简介/备注（选填）" maxlength="200" />
          <view class="form-actions">
            <view class="form-cancel" @click="cancelForm">取消</view>
            <view v-if="editingId && !isSelfMember(editingId)" class="form-del" @click="doRemove">删除</view>
            <view class="form-save" @click="doSave">保存</view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { getMembers, getLedgerMembers, addMember, updateMember, removeMember, linkMember, unlinkMember } from '@/api/sparejar.js'

const RELATIONS = [
  { value: 'self', label: '本人' },
  { value: 'family', label: '家人' },
  { value: 'partner', label: '伴侣' },
  { value: 'friend', label: '朋友' },
  { value: 'child', label: '孩子' },
  { value: 'colleague', label: '同事' },
  { value: 'other', label: '其他' }
]

export default {
  name: 'MemberManager',
  props: {
    visible: { type: Boolean, default: false },
    ledgerId: { type: String, default: '' },
    ledgerName: { type: String, default: '' }
  },
  data() {
    return {
      members: [],
      linkedIds: [],
      relationOptions: RELATIONS,
      formVisible: false,
      editingId: '',
      form: { nickname: '', avatar: '', relation: 'other', bio: '' }
    }
  },
  watch: {
    visible(v) {
      if (v) this.load()
    }
  },
  methods: {
    async load() {
      if (!this.ledgerId) return
      try {
        const [all, linked] = await Promise.all([
          getMembers(),
          getLedgerMembers(this.ledgerId)
        ])
        this.members = all || []
        this.linkedIds = (linked || []).map((m) => m._id)
      } catch (e) {
        console.error('[MemberManager] load failed', e)
      }
    },
    isLinked(id) {
      return this.linkedIds.includes(id)
    },
    isSelfMember(id) {
      const m = this.members.find((x) => x._id === id)
      return !!(m && m.is_self)
    },
    relationLabel(v) {
      const r = RELATIONS.find((x) => x.value === v)
      return r ? r.label : '其他'
    },
    onRelationChange(e) {
      const i = Number(e.detail.value)
      this.form.relation = this.relationOptions[i].value
    },
    async toggleLink(id) {
      try {
        if (this.isLinked(id)) {
          await unlinkMember(id, this.ledgerId)
          this.linkedIds = this.linkedIds.filter((x) => x !== id)
        } else {
          await linkMember(id, this.ledgerId)
          this.linkedIds.push(id)
        }
        this.$emit('change')
      } catch (e) {
        console.error('[MemberManager] toggleLink failed', e)
        uni.showToast({ title: '操作失败', icon: 'none' })
      }
    },
    openAdd() {
      this.editingId = ''
      this.form = { nickname: '', avatar: '', relation: 'other', bio: '' }
      this.formVisible = true
    },
    openEdit(m) {
      this.editingId = m._id
      this.form = {
        nickname: m.nickname || '',
        avatar: m.avatar_url || '',
        relation: m.relation || 'other',
        bio: m.bio || ''
      }
      this.formVisible = true
    },
    cancelForm() {
      this.formVisible = false
      this.editingId = ''
    },
    async doSave() {
      if (!this.form.nickname.trim()) {
        uni.showToast({ title: '请填写昵称', icon: 'none' })
        return
      }
      try {
        if (this.editingId) {
          await updateMember(this.editingId, { ...this.form })
        } else {
          const res = await addMember({ ...this.form })
          // 新增后默认加入当前账本
          if (res && res._id) {
            await linkMember(res._id, this.ledgerId)
            this.linkedIds.push(res._id)
          }
        }
        this.formVisible = false
        this.editingId = ''
        await this.load()
        this.$emit('change')
      } catch (e) {
        console.error('[MemberManager] save failed', e)
        uni.showToast({ title: '保存失败', icon: 'none' })
      }
    },
    async doRemove() {
      try {
        await removeMember(this.editingId)
        this.formVisible = false
        this.editingId = ''
        await this.load()
        this.$emit('change')
      } catch (e) {
        console.error('[MemberManager] remove failed', e)
        uni.showToast({ title: '删除失败', icon: 'none' })
      }
    },
    close() {
      this.$emit('close')
    }
  }
}
</script>

<style scoped>
.mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 100;
  display: flex;
  align-items: flex-end;
}
.sheet {
  width: 100%;
  background: #fff;
  border-radius: 24rpx 24rpx 0 0;
  padding: 28rpx 28rpx calc(28rpx + env(safe-area-inset-bottom));
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}
.sheet-header {
  position: relative;
  text-align: center;
  margin-bottom: 20rpx;
}
.sheet-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1f2329;
}
.sheet-sub {
  display: block;
  font-size: 24rpx;
  color: #8a9099;
  margin-top: 6rpx;
}
.close-btn {
  position: absolute;
  right: 0;
  top: 0;
  font-size: 36rpx;
  color: #8a9099;
  padding: 0 10rpx;
}
.member-list {
  flex: 1;
  min-height: 200rpx;
}
.member-item {
  display: flex;
  align-items: center;
  padding: 18rpx 0;
  border-bottom: 1rpx solid #f0f2f5;
}
.avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: #f2f4f7;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36rpx;
  margin-right: 18rpx;
}
.member-info {
  flex: 1;
  min-width: 0;
}
.member-name {
  font-size: 30rpx;
  color: #1f2329;
  display: flex;
  align-items: center;
}
.tag {
  font-size: 20rpx;
  color: #fff;
  background: #07c160;
  border-radius: 8rpx;
  padding: 2rpx 8rpx;
  margin-left: 12rpx;
}
.member-rel {
  font-size: 24rpx;
  color: #8a9099;
  display: block;
  margin-top: 6rpx;
}
.member-bio {
  color: #aab0b8;
}
.member-actions {
  display: flex;
  align-items: center;
}
.link-btn {
  font-size: 24rpx;
  color: #1989fa;
  border: 1rpx solid #1989fa;
  border-radius: 24rpx;
  padding: 8rpx 18rpx;
}
.link-btn.on {
  color: #fff;
  background: #1989fa;
}
.edit-link {
  font-size: 24rpx;
  color: #8a9099;
  margin-left: 18rpx;
  padding: 8rpx;
}
.add-btn {
  margin-top: 20rpx;
  text-align: center;
  font-size: 30rpx;
  color: #1989fa;
  padding: 22rpx;
  border: 1rpx dashed #1989fa;
  border-radius: 16rpx;
}
.empty {
  text-align: center;
  color: #b5bac1;
  font-size: 26rpx;
  padding: 60rpx 0;
}
.form-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
}
.form {
  width: 86%;
  background: #fff;
  border-radius: 20rpx;
  padding: 32rpx;
}
.form-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1f2329;
  display: block;
  margin-bottom: 24rpx;
}
.f-input,
.f-picker,
.f-textarea {
  width: 100%;
  box-sizing: border-box;
  border: 1rpx solid #e5e8ed;
  border-radius: 12rpx;
  padding: 18rpx 20rpx;
  font-size: 28rpx;
  margin-bottom: 18rpx;
  background: #fafbfc;
}
.f-textarea {
  height: 140rpx;
}
.f-picker {
  color: #1f2329;
}
.form-actions {
  display: flex;
  margin-top: 10rpx;
}
.form-cancel,
.form-save,
.form-del {
  flex: 1;
  text-align: center;
  padding: 20rpx;
  font-size: 30rpx;
  border-radius: 12rpx;
}
.form-cancel {
  color: #8a9099;
  background: #f2f4f7;
  margin-right: 16rpx;
}
.form-del {
  color: #fa5151;
  background: #fdeaea;
  margin-right: 16rpx;
}
.form-save {
  color: #fff;
  background: #1989fa;
}
</style>
