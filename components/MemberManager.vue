<template>
  <view v-if="visible" class="mask" @click.self="close">
    <view class="sheet" @click.stop>
      <view class="sheet-header">
        <text class="sheet-title">成员管理</text>
        <text class="sheet-sub">{{ ledgerName }}</text>
        <text class="close-btn" @click="close">✕</text>
      </view>

      <scroll-view scroll-y class="member-list">
        <view v-for="m in members" :key="m._id" class="member-item">
          <view class="avatar">
            <image
              v-if="avatarSrc(m)"
              :src="avatarSrc(m)"
              class="avatar-img"
              mode="aspectFit"
            />
            <text v-else>👤</text>
          </view>
          <view class="member-info">
            <text class="member-name"
              >{{ m.nickname }}<text v-if="m.is_self" class="tag">本人</text></text
            >
            <text class="member-rel"
              >{{ relationLabel(m.relation)
              }}<text v-if="m.bio" class="member-bio"> · {{ m.bio }}</text></text
            >
          </view>
          <view class="member-actions">
            <view
              class="link-btn"
              :class="{ on: isLinked(m._id) }"
              @click="toggleLink(m._id)"
              >{{ isLinked(m._id) ? "已加入" : "加入账本" }}</view
            >
            <text class="edit-link" @click="openEdit(m)">编辑</text>
          </view>
        </view>
        <view v-if="!members.length" class="empty">还没有成员</view>
      </scroll-view>

      <view class="add-btn" @click="openAdd">新增成员</view>
    </view>

    <!-- 新增/编辑表单：与 .sheet 平级，避免嵌套 fixed / 点击穿透导致整个弹框关闭 -->
    <view v-if="formVisible" class="form-mask" @click.self="cancelForm">
      <view class="form" @click.stop>
        <text class="form-title">{{ editingId ? "编辑成员" : "新增成员" }}</text>

        <view class="f-field avatar-field" @click="chooseAvatar">
          <image
            v-if="avatarDisplay"
            :src="avatarDisplay"
            mode="aspectFill"
            class="avatar-preview"
          />
          <view v-else class="avatar-placeholder">
            <text class="avatar-plus">＋</text>
            <text class="avatar-tip">{{ avatarUploading ? "上传中…" : "上传头像" }}</text>
          </view>
          <text v-if="avatarDisplay" class="avatar-clear" @click.stop="form.avatar = ''"
            >×</text
          >
        </view>

        <view class="f-field">
          <input
            class="f-input"
            v-model="form.nickname"
            placeholder="昵称（必填）"
            maxlength="20"
          />
        </view>

        <view class="f-row">
          <view class="f-field relation-field">
            <picker
              :range="relationOptions"
              range-key="label"
              :value="relationIndex"
              @change="onRelationChange"
            >
              <view class="f-picker">{{ displayRelation }}</view>
            </picker>
          </view>

          <view v-if="form.relation === 'other'" class="f-field">
            <input
              class="f-input"
              v-model="form.customRelation"
              placeholder="请输入自定义关系"
              maxlength="20"
            />
          </view>
        </view>

        <view class="f-field">
          <textarea
            class="f-textarea"
            v-model="form.bio"
            placeholder="简介/备注（选填）"
            maxlength="200"
          />
        </view>
        <view class="form-actions">
          <view class="form-cancel" @click="cancelForm">取消</view>
          <view
            v-if="editingId && !isSelfMember(editingId)"
            class="form-del"
            @click="doRemove"
            >删除</view
          >
          <view class="form-save" @click="doSave">保存</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import {
  getMembers,
  getLedgerMembers,
  addMember,
  updateMember,
  removeMember,
  linkMember,
  unlinkMember,
} from "@/api/sparejar.js";
import { state } from "@/stores/core/state.js";
import { cdn, createCloudImageResolver } from "@/utils/cdn.js";
import { deleteMemberAvatar } from "@/utils/cloudFile.js";

const RELATIONS = [
  { value: "self", label: "本人" },
  { value: "family", label: "家人" },
  { value: "partner", label: "伴侣" },
  { value: "friend", label: "朋友" },
  { value: "child", label: "孩子" },
  { value: "colleague", label: "同事" },
  { value: "other", label: "其他" },
];

export default {
  name: "MemberManager",
  props: {
    visible: { type: Boolean, default: false },
    ledgerId: { type: String, default: "" },
    ledgerName: { type: String, default: "" },
  },
  data() {
    return {
      members: [],
      linkedIds: [],
      relationOptions: RELATIONS,
      formVisible: false,
      editingId: "",
      avatarUploading: false,
      // 云端头像清理跟踪（对齐 wish/sticker 的孤儿文件清理逻辑）
      avatarSessionUploads: [], // 本次表单会话内上传的云端 fileID（未保存前需清理）
      avatarKeptFileID: "", // 当前表单正在使用的头像 fileID（保存成功后不再清理）
      avatarOrig: "", // 编辑时数据库里的原头像 fileID（cloud://），替换时清理
      form: { nickname: "", avatar: "", relation: "other", customRelation: "", bio: "" },
      // 云存储图片解析器：cloud:// 需解析成临时 URL 才能被 <image> 渲染
      cloud: createCloudImageResolver(),
    };
  },
  watch: {
    visible(v) {
      if (v) this.load();
    },
  },
  created() {
    // 跟随 App 切回前台刷新云存储临时链接（撑过切后台过期）
    this._onAppShow = () => this.onAppShow();
    uni.$on("app-show", this._onAppShow);
  },
  beforeDestroy() {
    if (this._onAppShow) uni.$off("app-show", this._onAppShow);
  },
  computed: {
    relationIndex() {
      const i = this.relationOptions.findIndex((x) => x.value === this.form.relation);
      return i < 0 ? this.relationOptions.length - 1 : i;
    },
    displayRelation() {
      if (this.form.relation === "other" && this.form.customRelation.trim()) {
        return this.form.customRelation.trim();
      }
      return this.relationLabel(this.form.relation);
    },
    selfAvatar() {
      const u = state.user || {};
      return u.avatar || u.avatar_url || "";
    },
    defaultAvatar() {
      return cdn("/app_static/images/icon_avatar.png");
    },
    // 表单头像显示地址：cloud:// 解析为临时 URL，本地路径/普通 URL 原样返回
    avatarDisplay() {
      return this.cloud.display(this.form.avatar);
    },
  },
  methods: {
    async load() {
      if (!this.ledgerId) return;
      try {
        const [all, linked] = await Promise.all([
          getMembers(),
          getLedgerMembers(this.ledgerId),
        ]);
        this.members = all || [];
        this.linkedIds = (linked || []).map((m) => m._id);
        this.resolveMemberAvatars(); // 解析成员头像（cloud:// → 临时 URL）
      } catch (e) {
        console.error("[MemberManager] load failed", e);
      }
    },
    // 解析成员列表中所有 cloud:// 头像为临时显示 URL
    resolveMemberAvatars() {
      const ids = (this.members || []).map((m) => m.avatar_url).filter(Boolean);
      const self = this.selfAvatar;
      if (self && String(self).startsWith("cloud://")) ids.push(self);
      this.cloud.resolve(ids);
    },
    // 解析当前表单头像（cloud:// → 临时 URL）
    resolveAvatar() {
      this.cloud.resolve([this.form.avatar]);
    },
    // App 切回前台：刷新成员头像与表单头像的临时链接（撑过过期）
    onAppShow() {
      this.resolveMemberAvatars();
      this.resolveAvatar();
    },
    isLinked(id) {
      return this.linkedIds.includes(id);
    },
    isSelfMember(id) {
      const m = this.members.find((x) => x._id === id);
      return !!(m && m.is_self);
    },
    relationLabel(v) {
      const r = RELATIONS.find((x) => x.value === v);
      return r ? r.label : "其他";
    },
    avatarSrc(m) {
      if (m.is_self) {
        return this.cloud.display(this.selfAvatar || this.defaultAvatar);
      }
      return this.cloud.display(m.avatar_url || "");
    },
    onRelationChange(e) {
      const i = Number(e.detail.value);
      this.form.relation = this.relationOptions[i].value;
    },
    async toggleLink(id) {
      try {
        if (this.isLinked(id)) {
          await unlinkMember(id, this.ledgerId);
          this.linkedIds = this.linkedIds.filter((x) => x !== id);
        } else {
          await linkMember(id, this.ledgerId);
          this.linkedIds.push(id);
        }
        this.$emit("change");
      } catch (e) {
        console.error("[MemberManager] toggleLink failed", e);
        uni.showToast({ title: "操作失败", icon: "none" });
      }
    },
    openAdd() {
      this.editingId = "";
      this.avatarSessionUploads = [];
      this.avatarKeptFileID = "";
      this.avatarOrig = "";
      this.form = {
        nickname: "",
        avatar: "",
        relation: "other",
        customRelation: "",
        bio: "",
      };
      // 延迟到下一 tick 再显示表单遮罩，避免本次点击「穿透」到新出现的遮罩而瞬间关闭
      this.$nextTick(() => {
        this.formVisible = true;
      });
      this.resolveAvatar(); // 新增加头像为空，无操作
    },
    openEdit(m) {
      this.editingId = m._id;
      const known = RELATIONS.some((r) => r.value === m.relation);
      this.form = {
        nickname: m.nickname || "",
        avatar: m.avatar_url || "",
        relation: known ? m.relation || "other" : "other",
        customRelation: known ? "" : m.relation || "",
        bio: m.bio || "",
      };
      // 重置本次会话上传跟踪
      this.avatarSessionUploads = [];
      this.avatarKeptFileID = "";
      // 记录编辑前的原头像 fileID（cloud://），替换成功后再清理
      const orig = m.avatar_url || "";
      this.avatarOrig = String(orig).startsWith("cloud://") ? orig : "";
      this.resolveAvatar(); // 解析编辑前已有头像（cloud:// → 临时 URL）
      this.$nextTick(() => {
        this.formVisible = true;
      });
    },
    cancelForm() {
      // 取消：清理本次会话内已上传但未保存的云端孤儿文件
      this.avatarSessionUploads.forEach((f) => this.disposeAvatar(f));
      this.avatarSessionUploads = [];
      this.avatarKeptFileID = "";
      this.avatarOrig = "";
      this.formVisible = false;
      this.editingId = "";
    },
    async doSave() {
      if (!this.form.nickname.trim()) {
        uni.showToast({ title: "请填写昵称", icon: "none" });
        return;
      }
      if (this.form.relation === "other" && !this.form.customRelation.trim()) {
        uni.showToast({ title: "请填写关系", icon: "none" });
        return;
      }
      const relation =
        this.form.relation === "other"
          ? this.form.customRelation.trim()
          : this.form.relation;
      const payload = {
        nickname: this.form.nickname,
        avatar: this.form.avatar,
        relation,
        bio: this.form.bio,
      };
      try {
        if (this.editingId) {
          await updateMember(this.editingId, payload);
        } else {
          const res = await addMember(payload);
          // 新增后默认加入当前账本
          if (res && res._id) {
            await linkMember(res._id, this.ledgerId);
            this.linkedIds.push(res._id);
          }
        }
        // 清理云端孤儿文件：未被采用的会话上传 + 被替换的旧头像
        this.avatarSessionUploads
          .filter((f) => f !== this.avatarKeptFileID)
          .forEach((f) => this.disposeAvatar(f));
        if (this.avatarKeptFileID && this.avatarKeptFileID !== this.avatarOrig) {
          this.disposeAvatar(this.avatarOrig);
        }
        this.avatarSessionUploads = [];
        this.avatarKeptFileID = "";
        this.avatarOrig = "";
        this.formVisible = false;
        this.editingId = "";
        await this.load();
        this.$emit("change");
      } catch (e) {
        console.error("[MemberManager] save failed", e);
        // 保存失败：已上传但未落库的云端头像需清理
        this.avatarSessionUploads.forEach((f) => this.disposeAvatar(f));
        this.avatarSessionUploads = [];
        this.avatarKeptFileID = "";
        this.avatarOrig = "";
        uni.showToast({ title: "保存失败", icon: "none" });
      }
    },
    async doRemove() {
      try {
        // 删除成员前清理其云端头像（若存在 cloud:// 文件）
        const m = this.members.find((x) => x._id === this.editingId);
        if (m && m.avatar_url && String(m.avatar_url).startsWith("cloud://")) {
          this.disposeAvatar(m.avatar_url);
        }
        await removeMember(this.editingId);
        this.formVisible = false;
        this.editingId = "";
        this.avatarSessionUploads = [];
        this.avatarKeptFileID = "";
        this.avatarOrig = "";
        await this.load();
        this.$emit("change");
      } catch (e) {
        console.error("[MemberManager] remove failed", e);
        uni.showToast({ title: "删除失败", icon: "none" });
      }
    },
    disposeAvatar(fileID) {
      // 仅对 cloud:// 文件做尽力删除，失败不阻塞主流程（与 sticker-lib 一致）
      if (!fileID || !String(fileID).startsWith("cloud://")) return;
      deleteMemberAvatar(fileID).catch(() => {});
    },
    async chooseAvatar() {
      if (this.avatarUploading) return;
      let imgPath = "";
      try {
        const res = await uni.chooseImage({
          count: 1,
          sizeType: ["compressed"],
          sourceType: ["album", "camera"],
        });
        imgPath = (res.tempFilePaths || [])[0] || "";
      } catch (e) {
        return; // 用户取消选择
      }
      if (!imgPath) return;

      const prev = this.form.avatar; // 记住旧值，上传失败时回退
      this.form.avatar = imgPath; // 立即用本地临时路径回显，避免依赖云端地址解析
      this.avatarUploading = true;
      uni.showLoading({ title: "上传中…", mask: true });
      try {
        const ext = (imgPath.split(".").pop() || "png").split("?")[0].toLowerCase();
        const uid = uni.getStorageSync("uid") || "anon";
        const cloudPath = `member-avatars/${uid}/${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}.${ext}`;
        const up = await uniCloud.uploadFile({ filePath: imgPath, cloudPath });
        const fileID = (up && up.fileID) || ""; // 云端 fileID，用于删除清理
        // 优先用 fileID（cloud://，小程序原生支持且不会过期）；
        // 仅当取不到 fileID 时回退 up.url（临时地址，切后台后可能失效）
        const url = fileID || (up && up.url) || "";
        if (url) {
          if (fileID) {
            // 记录本次会话上传，未保存前可被取消/失败清理
            this.avatarSessionUploads.push(fileID);
            this.avatarKeptFileID = fileID; // 当前采用的头像
          }
          this.form.avatar = url; // 落库/回显使用稳定地址（fileID 优先）
          this.resolveAvatar(); // 解析 cloud:// 为临时 URL 供 <image> 渲染
        } else {
          this.form.avatar = prev; // 无返回地址，回退
          uni.showToast({ title: "上传失败", icon: "none" });
        }
      } catch (e) {
        console.error("[MemberManager] avatar upload failed", e);
        this.form.avatar = prev; // 上传异常，回退到原头像
        uni.showToast({ title: "上传失败", icon: "none" });
      } finally {
        this.avatarUploading = false;
        uni.hideLoading();
      }
    },
    close() {
      this.$emit("close");
    },
  },
};
</script>

<style scoped lang="scss">
.mask {
  @include sj-theme-css-vars;
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
  color: var(--ink);
}
.sheet-sub {
  display: block;
  font-size: 24rpx;
  color: var(--ink4);
  margin-top: 6rpx;
}
.close-btn {
  position: absolute;
  right: 0;
  top: 0;
  font-size: 36rpx;
  color: var(--ink4);
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
  border-bottom: 1rpx solid var(--g1);
}
.avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: var(--g1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36rpx;
  margin-right: 18rpx;
  overflow: hidden;
}
.avatar-img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  display: block;
}
.member-info {
  flex: 1;
  min-width: 0;
}
.member-name {
  font-size: 30rpx;
  color: var(--ink);
  display: flex;
  align-items: center;
}
.tag {
  font-size: 20rpx;
  color: #fff;
  background: var(--g5);
  border-radius: 8rpx;
  padding: 2rpx 8rpx;
  margin-left: 12rpx;
}
.member-rel {
  font-size: 24rpx;
  color: var(--ink4);
  display: block;
  margin-top: 6rpx;
}
.member-bio {
  color: var(--ink4);
}
.member-actions {
  display: flex;
  align-items: center;
}
.link-btn {
  font-size: 24rpx;
  color: var(--g5);
  border: 1rpx solid var(--g5);
  border-radius: 24rpx;
  padding: 8rpx 18rpx;
}
.link-btn.on {
  color: #fff;
  background: var(--g5);
}
.edit-link {
  font-size: 24rpx;
  color: var(--ink4);
  margin-left: 18rpx;
  padding: 8rpx;
}
.add-btn {
  margin-top: 20rpx;
  text-align: center;
  font-size: 30rpx;
  color: var(--g5);
  padding: 22rpx;
  border: 1rpx dashed var(--g5);
  border-radius: 16rpx;
}
.empty {
  text-align: center;
  color: var(--ink4);
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
  color: var(--ink);
  display: block;
  margin-bottom: 24rpx;
}
.f-field {
  width: 100%;
  box-sizing: border-box;
  border: 2rpx solid var(--g2);
  border-radius: 12rpx;
  padding: 4rpx 20rpx;
  margin-bottom: 18rpx;
}
.f-row {
  display: flex;
  align-items: stretch;
}
.f-row .f-field {
  flex: 1 1 0;
  min-width: 0;
}
.f-row .f-field:not(:last-child) {
  margin-right: 16rpx;
}
/* 同时存在两个字段时，左侧（关系选择）窄于右侧（自定义输入） */
.f-row .f-field:first-child:not(:last-child) {
  flex: 0 0 30%;
}
.f-input,
.f-picker,
.f-textarea {
  width: 100%;
  box-sizing: border-box;
  border: none;
  padding: 0;
  font-size: 28rpx;
  background: transparent;
}
.f-input {
  height: 76rpx;
  line-height: 76rpx;
}
.f-textarea {
  height: 140rpx;
  padding: 16rpx 0;
  line-height: 1.5;
}
.f-picker {
  color: var(--ink);
  min-height: 76rpx;
  display: flex;
  align-items: center;
}
.relation-field {
  background: var(--g0);
  border: 2rpx solid var(--g1);
}
.avatar-field {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24rpx;
  min-height: 180rpx;
  background: var(--g0);
  border: 2rpx solid var(--g1);
}
.avatar-preview {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
}
.avatar-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.avatar-plus {
  font-size: 48rpx;
  color: var(--g5);
  line-height: 1;
}
.avatar-tip {
  font-size: 24rpx;
  color: var(--ink4);
  margin-top: 8rpx;
}
.avatar-clear {
  position: absolute;
  right: 16rpx;
  top: 16rpx;
  width: 40rpx;
  height: 40rpx;
  line-height: 40rpx;
  text-align: center;
  border-radius: 50%;
  background: var(--ink4);
  color: #fff;
  font-size: 28rpx;
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
  color: var(--ink4);
  background: var(--g1);
  margin-right: 16rpx;
}
.form-del {
  color: var(--red-soft);
  background: var(--red-bg);
  margin-right: 16rpx;
}
.form-save {
  color: #fff;
  background: var(--g5);
}
</style>
