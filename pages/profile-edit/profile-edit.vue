<template>
  <view class="edit-page">
    <view class="nav-bar">
      <view class="nav-back" @click="goBack"><text class="nav-back-icon">‹</text></view>
      <text class="nav-title">编辑资料</text>
      <view style="width: 48rpx" />
    </view>

    <view class="avatar-section">
      <image class="avatar-preview" :src="previewAvatar || defaultAvatar" mode="aspectFill" />
      <button class="avatar-btn" open-type="chooseAvatar" @chooseavatar="onChooseAvatar">
        选择微信头像
      </button>
      <view class="avatar-alt" @click="chooseFromAlbum">
        <text>从相册 / 拍照选择</text>
      </view>
    </view>

    <view class="field">
      <text class="field-label">昵称</text>
      <input
        class="field-input"
        v-model="nickname"
        maxlength="20"
        placeholder="请输入昵称"
        placeholder-class="field-ph"
      />
    </view>

    <view class="save-btn" @click="save"><text>保存</text></view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useUserStore } from '@/stores/user.js'
import { cdn } from '@/utils/cdn.js'

const { state, updateProfile } = useUserStore()

const defaultAvatar = cdn('/app_static/images/icon_avatar.png')
const nickname = ref((state.user && state.user.nickname) || '')
const tempAvatar = ref('') // 选中后的本地临时路径
const uploadedAvatar = ref('') // 已上传云存储的 fileID
const needUpload = computed(() => !!(tempAvatar.value && !uploadedAvatar.value))

const previewAvatar = computed(() => {
  if (tempAvatar.value) return tempAvatar.value
  if (uploadedAvatar.value) return uploadedAvatar.value
  const u = state.user && state.user.avatar_url
  return u || ''
})

function goBack() {
  if (getCurrentPages().length > 1) uni.navigateBack()
  else uni.reLaunch({ url: '/pages/profile/profile' })
}

// 微信头像：open-type=chooseAvatar 返回临时路径
function onChooseAvatar(e) {
  tempAvatar.value = (e.detail && e.detail.avatarUrl) || ''
}

function chooseFromAlbum() {
  uni.chooseImage({
    count: 1,
    sourceType: ['album', 'camera'],
    success: (res) => {
      if (res && res.tempFilePaths && res.tempFilePaths[0]) {
        tempAvatar.value = res.tempFilePaths[0]
      }
    },
  })
}

// 若选了新头像，先上传到云存储得到永久 fileID；否则沿用当前头像
async function ensureAvatar() {
  if (!needUpload.value) {
    return (state.user && state.user.avatar_url) || ''
  }
  const ext = (tempAvatar.value.split('.').pop() || 'png').split('?')[0]
  const cloudPath = `user_avatar/${Date.now()}_${Math.floor(Math.random() * 1e6)}.${ext}`
  const res = await uniCloud.uploadFile({ filePath: tempAvatar.value, cloudPath })
  uploadedAvatar.value = res.fileID
  return res.fileID
}

async function save() {
  const name = nickname.value.trim()
  if (!name) {
    uni.showToast({ title: '请输入昵称', icon: 'none' })
    return
  }
  uni.showLoading({ title: '保存中' })
  try {
    const patch = { nickname: name }
    const avatar = await ensureAvatar()
    if (avatar) patch.avatar_url = avatar
    await updateProfile(patch)
    uni.hideLoading()
    uni.showToast({ title: '已保存', icon: 'success' })
    setTimeout(() => goBack(), 500)
  } catch (err) {
    uni.hideLoading()
    uni.showToast({ title: (err && err.message) || '保存失败', icon: 'none' })
  }
}
</script>

<style scoped>
.edit-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #f3fbf5 0%, #f7faf8 40%, #ffffff 100%);
  padding: 0 40rpx;
  box-sizing: border-box;
}

.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 40rpx 0 24rpx;
}
.nav-back {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.nav-back-icon {
  font-size: 48rpx;
  color: var(--ink);
  line-height: 1;
}
.nav-title {
  font-size: 34rpx;
  font-weight: 800;
  color: var(--ink);
}

.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 40rpx 0 48rpx;
}
.avatar-preview {
  width: 160rpx;
  height: 160rpx;
  border-radius: 50%;
  border: 4rpx solid #fff;
  box-shadow: 0 8rpx 30rpx rgba(37, 204, 93, 0.18);
  background: #eef6f0;
}
.avatar-btn {
  margin-top: 28rpx;
  background: linear-gradient(135deg, var(--g4), var(--g5));
  color: #fff;
  font-size: 26rpx;
  font-weight: 700;
  border-radius: 40rpx;
  padding: 14rpx 40rpx;
  line-height: 1.4;
}
.avatar-btn::after {
  border: none;
}
.avatar-alt {
  margin-top: 18rpx;
  font-size: 22rpx;
  color: var(--ink4);
  text-decoration: underline;
}

.field {
  display: flex;
  align-items: center;
  gap: 24rpx;
  background: #fff;
  border-radius: 24rpx;
  padding: 28rpx 28rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.04);
}
.field-label {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--ink);
  flex-shrink: 0;
}
.field-input {
  flex: 1;
  font-size: 28rpx;
  color: var(--ink);
}
.field-ph {
  color: var(--ink4);
}

.save-btn {
  margin-top: 60rpx;
  background: linear-gradient(135deg, var(--g4), var(--g5));
  color: #fff;
  font-size: 30rpx;
  font-weight: 800;
  text-align: center;
  padding: 28rpx;
  border-radius: 40rpx;
  box-shadow: 0 12rpx 40rpx rgba(37, 204, 93, 0.3);
}
</style>
