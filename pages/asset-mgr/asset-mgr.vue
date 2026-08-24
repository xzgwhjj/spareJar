<template>
  <view class="asset-page">
    <view class="topbar" :style="{ paddingTop: pagePaddingTop }">
      <view class="back-btn" @click="goBack"><text>←</text></view>
      <text class="topbar-title">资产账户</text>
      <view class="topbar-actions">
        <view class="cam-btn" @click="pickAndRecognizeAsset" title="截图建账"
          ><text>📷</text></view
        >
        <view class="add-btn" @click="openAdd"><text>+</text></view>
      </view>
    </view>

    <scroll-view
      class="page-scroll"
      scroll-y
      enhanced
      :show-scrollbar="false"
      style="flex: 1"
    >
      <!-- 总览 -->
      <view class="glass-hero card-in-1">
        <text class="ov-title">总资产净值</text>
        <text
          class="ov-amount"
          :style="{ color: totals.full >= 0 ? 'var(--g5)' : 'var(--red-soft)' }"
          >¥{{ fmt(totals.full) }}</text
        >
        <view class="ov-sub">
          <view class="ov-sub-item">
            <text class="ov-sub-val">¥{{ fmt(totals.disposable) }}</text>
            <text class="ov-sub-lbl">可支配</text>
          </view>
          <view class="ov-divider" />
          <view class="ov-sub-item">
            <text class="ov-sub-val">¥{{ fmt(totals.investment) }}</text>
            <text class="ov-sub-lbl">投资市值</text>
          </view>
        </view>
      </view>

      <!-- 我的钱包分配入口（FR-1.1） -->
      <view v-if="walletAccount" class="wallet-alloc glass-mid" @click="openAlloc">
        <view class="wa-left">
          <text class="wa-icon">👛</text>
          <view class="wa-text">
            <text class="wa-name">我的钱包</text>
            <text class="wa-sub"
              >余额 ¥{{ fmt(walletAccount.balance) }}，可分配到具体账户</text
            >
          </view>
        </view>
        <text class="wa-btn">分配</text>
      </view>

      <!-- 分类 Tab -->
      <view class="class-tabs">
        <view
          v-for="c in classTabs"
          :key="c.id"
          class="class-tab"
          :class="{ active: classTab === c.id }"
          @click="classTab = c.id"
          >{{ c.label }}</view
        >
      </view>

      <!-- 账户列表 -->
      <view
        v-for="a in filteredAccounts"
        :key="a._id"
        class="account-card glass-mid card-item"
        @click="openDetail(a)"
      >
        <view class="acc-row">
          <view class="acc-icon" :style="{ background: colorBgFor(a) }"
            ><text>{{ iconFor(a) }}</text></view
          >
          <view class="acc-info">
            <view class="acc-name-row">
              <text class="acc-name">{{ a.name }}</text>
              <text class="acc-type">{{ subtypeLabel(a) }}</text>
            </view>
            <text v-if="a.account_class === 'investment'" class="acc-sub">
              市值 ¥{{ fmt(a.market_value) }} · 盈亏
              <text
                :style="{ color: a.profit_loss >= 0 ? 'var(--g5)' : 'var(--red-soft)' }"
                >{{ a.profit_loss >= 0 ? "+" : "" }}¥{{ fmt(a.profit_loss) }}</text
              >
            </text>
            <text v-else-if="a.account_class === 'liability'" class="acc-sub">欠款</text>
            <text v-else-if="!a.include_in_disposable" class="acc-sub">不计入可支配</text>
          </view>
          <view class="acc-balance-group">
            <text
              class="acc-balance"
              :style="{
                color:
                  a.account_class === 'liability'
                    ? 'var(--red-soft)'
                    : a.balance >= 0
                    ? 'var(--ink)'
                    : 'var(--red-soft)',
              }"
              >{{ a.account_class === "liability" ? "欠款 ¥" : "¥"
              }}{{ fmt(a.balance) }}</text
            >
            <view class="acc-actions">
              <text class="acc-edit" @click.stop="openEdit(a)">✏️</text>
              <text class="acc-del" @click.stop="onDelete(a)">🗑️</text>
            </view>
          </view>
        </view>
      </view>

      <view v-if="!filteredAccounts.length" class="empty-tip"
        >暂无{{ classLabel }}账户，点击右上角 + 添加</view
      >

      <view style="height: 24px" />
    </scroll-view>

    <!-- 新增/编辑弹窗 -->
    <view v-if="showSheet" class="sheet-overlay" @click="showSheet = false">
      <view class="sheet-panel" @click.stop>
        <view class="sheet-handle"><view class="handle-bar" /></view>
        <text class="sheet-title">{{ editingAccount ? "编辑账户" : "新增账户" }}</text>

        <text class="form-label">账户名称</text>
        <input class="sheet-input" v-model="form.name" placeholder="如：招商储蓄卡" />

        <text class="form-label">账户类型</text>
        <view class="type-grid">
          <view
            v-for="c in classTabs"
            :key="c.id"
            class="type-chip"
            :class="{ active: form.account_class === c.id }"
            @click="onClassChange(c.id)"
            >{{ c.label }}</view
          >
        </view>

        <text class="form-label">子类型</text>
        <view class="type-grid">
          <view
            v-for="s in SUBTYPES[form.account_class]"
            :key="s.v"
            class="type-chip"
            :class="{ active: form.account_subtype === s.v }"
            @click="form.account_subtype = s.v"
            >{{ s.icon }} {{ s.label }}</view
          >
        </view>

        <text v-if="!editingAccount" class="form-label">初始余额（元）</text>
        <number-field
          v-if="!editingAccount"
          class="sheet-input"
          :model-value="form.balanceStr"
          placeholder="0"
          title="初始余额"
          :decimal-places="2"
          :max-integer="12"
          @update:model-value="(v) => (form.balanceStr = v)"
        />

        <block v-if="form.account_class !== 'investment'">
          <view class="toggle-row">
            <text class="toggle-lbl">计入可支配</text>
            <switch
              :checked="form.include_in_disposable"
              @change="(e) => (form.include_in_disposable = e.detail.value)"
              color="#25cc5d"
            />
          </view>
          <view class="toggle-row">
            <text class="toggle-lbl">计入日限额</text>
            <switch
              :checked="form.include_in_daily_limit"
              @change="(e) => (form.include_in_daily_limit = e.detail.value)"
              color="#25cc5d"
            />
          </view>
          <view class="toggle-row">
            <text class="toggle-lbl">计入总资产</text>
            <switch
              :checked="form.include_in_total_asset"
              @change="(e) => (form.include_in_total_asset = e.detail.value)"
              color="#25cc5d"
            />
          </view>
        </block>

        <view class="save-btn" @click="saveAccount">
          <text>{{ editingAccount ? "保存修改" : "添加账户" }}</text>
        </view>
      </view>
    </view>

    <!-- 我的钱包分配弹框（FR-1.1） -->
    <view v-if="showAlloc" class="sheet-mask" @click="showAlloc = false">
      <view class="sheet" @click.stop>
        <view class="sheet-title">分配「我的钱包」</view>
        <view class="alloc-from">
          <text class="af-label">从</text>
          <text class="af-name">👛 我的钱包</text>
          <text class="af-bal">¥{{ fmt(walletAccount.balance) }}</text>
        </view>
        <text class="form-label">分配到</text>
        <scroll-view scroll-y enhanced :show-scrollbar="false" class="sheet-scroll">
          <view
            v-for="t in allocTargets"
            :key="t._id"
            class="sheet-item"
            :class="{ active: allocTarget === t._id }"
            @click="allocTarget = t._id"
          >
            <text class="sheet-item-icon">{{ t.icon }}</text>
            <text class="sheet-item-name">{{ t.name }}</text>
            <text class="sheet-item-sub">余 {{ fmt(t.balance) }}</text>
            <text v-if="allocTarget === t._id" class="sheet-item-check">✓</text>
          </view>
          <view v-if="!allocTargets.length" class="empty-tip">暂无其他账户可分配</view>
        </scroll-view>
        <text class="form-label">分配金额</text>
        <view class="amount-row" @click="openAllocKeyboard()">
          <text class="cur">¥</text>
          <text class="amt" :class="{ placeholder: !allocAmount }">{{
            allocAmount || "0.00"
          }}</text>
        </view>
        <view
          class="sheet-confirm"
          :class="{
            disabled:
              !allocTarget ||
              !allocAmount ||
              Number(allocAmount) <= 0 ||
              Number(allocAmount) > walletAccount.balance / 100,
          }"
          @click="submitAlloc"
          >确认分配</view
        >
        <view class="sheet-cancel" @click="showAlloc = false">取消</view>
      </view>
    </view>

    <!-- 全局数字键盘（单例）：由 main.js 全局注册 -->
    <amount-keyboard />
  </view>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from "vue";
import { useUserStore } from "@/stores/user.js";
import { formatFen, safeYuanToFen, fenToYuanString } from "@/utils/money.js";
import { useNumberKeyboard } from "@/stores/numberKeyboard.js";
import { recognizeAsset as apiRecognizeAsset } from "@/api/sparejar.js";
import { onLoad } from "@dcloudio/uni-app";

const userStore = useUserStore();
const state = userStore.state;

const classTabs = [
  { id: "daily", label: "日常" },
  { id: "special", label: "专项" },
  { id: "investment", label: "投资" },
  { id: "liability", label: "负债" },
];
const classTab = ref("daily");
const classLabel = computed(
  () => classTabs.find((c) => c.id === classTab.value)?.label || ""
);

const SUBTYPES = {
  daily: [
    { v: "wechat", label: "微信", icon: "💚" },
    { v: "alipay", label: "支付宝", icon: "💙" },
    { v: "bank", label: "银行卡", icon: "🏦" },
    { v: "cash", label: "现金", icon: "💵" },
  ],
  special: [
    { v: "provident_fund", label: "公积金", icon: "🏠" },
    { v: "insurance", label: "医保", icon: "🛡️" },
  ],
  investment: [
    { v: "fund", label: "基金", icon: "📈" },
    { v: "stock", label: "股票", icon: "📊" },
    { v: "bond", label: "债券", icon: "📜" },
    { v: "gold", label: "黄金", icon: "🪙" },
    { v: "wealth", label: "理财", icon: "💼" },
    { v: "other", label: "其他", icon: "📦" },
  ],
  liability: [
    { v: "huabei", label: "花呗", icon: "🌸" },
    { v: "credit_card", label: "信用卡", icon: "💳" },
    { v: "jdbt", label: "京东白条", icon: "🛒" },
    { v: "loan", label: "借款", icon: "🤝" },
    { v: "other", label: "其他", icon: "📦" },
  ],
};
const subtypeMap = {};
for (const k in SUBTYPES) for (const s of SUBTYPES[k]) subtypeMap[s.v] = s;

const totals = computed(
  () =>
    state.assetTotals || {
      disposable: 0,
      investment: 0,
      withInvest: 0,
      full: 0,
      specialExtra: 0,
    }
);
const filteredAccounts = computed(() =>
  (state.assets || []).filter((a) => a.account_class === classTab.value)
);

/* FR-1.1 我的钱包分配 */
const walletAccount = computed(
  () =>
    (state.assets || []).find(
      (a) => a.account_class === "daily" && a.name === "我的钱包"
    ) || null
);
const allocTargets = computed(() =>
  (state.assets || [])
    .filter((a) => a._id !== (walletAccount.value && walletAccount.value._id))
    .map((a) => ({
      _id: a._id,
      name: a.name,
      balance: a.current_balance || 0,
      icon: iconFor(a),
    }))
);
const showAlloc = ref(false);
const allocTarget = ref("");
const allocAmount = ref("");
function openAlloc() {
  allocTarget.value = "";
  allocAmount.value = "";
  showAlloc.value = true;
}
function openAllocKeyboard() {
  const kb = useNumberKeyboard();
  kb.open({
    value: allocAmount.value,
    title: "分配金额",
    onInput: (v) => {
      allocAmount.value = v;
    },
  });
}
async function submitAlloc() {
  if (!walletAccount.value) return;
  if (!allocTarget.value) {
    uni.showToast({ title: "请选择目标账户", icon: "none" });
    return;
  }
  const yuan = Number(allocAmount.value || 0);
  if (!yuan || yuan <= 0) {
    uni.showToast({ title: "请输入分配金额", icon: "none" });
    return;
  }
  if (yuan > (walletAccount.value.current_balance || 0) / 100) {
    uni.showToast({ title: "超出钱包余额", icon: "none" });
    return;
  }
  const fen = safeYuanToFen(allocAmount.value).value;
  try {
    await userStore.transferBetweenAccountsAction(
      walletAccount.value._id,
      allocTarget.value,
      fen,
      "钱包分配"
    );
    uni.showToast({ title: "分配成功", icon: "success" });
    showAlloc.value = false;
    allocAmount.value = "";
    allocTarget.value = "";
  } catch (e) {
    uni.showToast({ title: (e && e.message) || "分配失败", icon: "none" });
  }
}

function fmt(fen) {
  return formatFen(fen || 0);
}
function subtypeLabel(a) {
  const s = subtypeMap[a.account_subtype];
  return s ? s.label : a.account_subtype;
}
function iconFor(a) {
  const s = subtypeMap[a.account_subtype];
  return s ? s.icon : "💳";
}

/* 子类 → 卡片底色 */
const SUBTYPE_BG = {
  wechat: "#e8f8ec",
  alipay: "#e8f1fb",
  bank: "#f3f0ff",
  cash: "#e1fae3",
  provident_fund: "#eaf3ff",
  insurance: "#fdeef0",
  fund: "#fffbeb",
  stock: "#eef5ff",
  bond: "#f3f0ff",
  gold: "#fbf3e0",
  wealth: "#eafaf1",
  other: "#eef1f4",
  huabei: "#ffeef2",
  credit_card: "#eef1f4",
  jdbt: "#fff3e6",
  loan: "#fdeef0",
};
function colorBgFor(a) {
  return SUBTYPE_BG[a.account_subtype] || "#e1fae3";
}

const showSheet = ref(false);
const editingAccount = ref(null);
const form = reactive({
  name: "",
  account_class: "daily",
  account_subtype: "wechat",
  balanceStr: "",
  include_in_disposable: true,
  include_in_daily_limit: true,
  include_in_total_asset: true,
});

function openAdd() {
  editingAccount.value = null;
  Object.assign(form, {
    name: "",
    account_class: "daily",
    account_subtype: "wechat",
    balanceStr: "",
    include_in_disposable: true,
    include_in_daily_limit: true,
    include_in_total_asset: true,
  });
  showSheet.value = true;
}

// FR-2.2 截图建账：选图 → 上传云 → OCR 识别账户名/余额/类别 → 预填新建表单
const recognizing = ref(false);
async function pickAndRecognizeAsset() {
  if (recognizing.value) return;
  let imgPath = "";
  try {
    const res = await uni.chooseImage({
      count: 1,
      sizeType: ["compressed"],
      sourceType: ["album", "camera"],
    });
    imgPath = res.tempFilePaths && res.tempFilePaths[0];
  } catch (_e) {
    return;
  }
  if (!imgPath) return;
  recognizing.value = true;
  uni.showLoading({ title: "识别中...", mask: true });
  try {
    const up = await uniCloud.uploadFile({
      filePath: imgPath,
      cloudPath: `asset-ocr/${Date.now()}-${Math.floor(Math.random() * 1e6)}.jpg`,
    });
    const r = await apiRecognizeAsset(up.fileID);
    if (!r || r.success !== true) {
      uni.showToast({ title: "识别失败，请手动添加", icon: "none" });
      recognizing.value = false;
      uni.hideLoading();
      return;
    }
    const ic = r.suggested_class || "daily";
    const sub = (SUBTYPES[ic] || SUBTYPES.daily).some((s) => s.v === r.suggested_subtype)
      ? r.suggested_subtype
      : (SUBTYPES[ic] || SUBTYPES.daily)[0].v;
    // 各账户类别默认计入规则（与云函数 ACCOUNT_CLASS_DEFAULTS 对齐）
    const classDefaults = {
      daily: { d: true, l: true, t: true },
      special: { d: true, l: false, t: true },
      investment: { d: false, l: false, t: true },
      liability: { d: false, l: false, t: false },
    }[ic] || { d: true, l: true, t: true };

    // FR-2.3：若已存在同名账户，直接并入（入金到已有账户），不新建
    const existing = (state.assets || []).find(
      (a) => a.name === r.account_name && a.account_class === ic
    );
    if (existing && r.balance_fen > 0) {
      const addYuan = fenToYuanString(r.balance_fen);
      uni.showModal({
        title: "并入已有账户",
        content: `已存在「${existing.name}」，是否将识别出的 ¥${addYuan} 直接加到该账户（不新建）？`,
        confirmText: "并入",
        cancelText: "仍新建",
        success: async (m) => {
          if (m.confirm) {
            try {
              const target = (existing.current_balance || 0) + r.balance_fen;
              await userStore.adjustAccountBalanceAction(existing._id, target);
              uni.showToast({ title: "已并入该账户", icon: "success" });
            } catch (e) {
              uni.showToast({ title: (e && e.message) || "并入失败", icon: "none" });
            }
          } else {
            openRecognizedSheet(r, ic, sub, classDefaults);
          }
        },
      });
      recognizing.value = false;
      uni.hideLoading();
      return;
    }

    openRecognizedSheet(r, ic, sub, classDefaults);
  } catch (e) {
    uni.showToast({ title: "识别失败，请手动添加", icon: "none" });
  } finally {
    recognizing.value = false;
    uni.hideLoading();
  }
}
// 将 OCR 识别结果预填到新建账户表单
function openRecognizedSheet(r, ic, sub, classDefaults) {
  editingAccount.value = null;
  Object.assign(form, {
    name: r.account_name || "",
    account_class: ic,
    account_subtype: sub,
    balanceStr: r.balance_fen ? fenToYuanString(r.balance_fen) : "",
    include_in_disposable: classDefaults.d,
    include_in_daily_limit: classDefaults.l,
    include_in_total_asset: classDefaults.t,
  });
  showSheet.value = true;
  uni.showToast({ title: "已识别，请确认", icon: "none" });
}
function openEdit(a) {
  editingAccount.value = a;
  Object.assign(form, {
    name: a.name,
    account_class: a.account_class,
    account_subtype: a.account_subtype,
    balanceStr: "",
    include_in_disposable: !!a.include_in_disposable,
    include_in_daily_limit: !!a.include_in_daily_limit,
    include_in_total_asset: !!a.include_in_total_asset,
  });
  showSheet.value = true;
}
function onClassChange(c) {
  form.account_class = c;
  form.account_subtype = SUBTYPES[c][0].v;
  const def = {
    daily: { d: true, l: true, t: true },
    special: { d: false, l: false, t: false },
    investment: { d: false, l: false, t: false },
    liability: { d: false, l: false, t: false },
  }[c];
  form.include_in_disposable = def.d;
  form.include_in_daily_limit = def.l;
  form.include_in_total_asset = def.t;
}
async function saveAccount() {
  if (!form.name) {
    uni.showToast({ title: "请输入账户名称", icon: "none" });
    return;
  }
  const payload = {
    name: form.name,
    account_class: form.account_class,
    account_subtype: form.account_subtype,
    include_in_disposable: form.include_in_disposable,
    include_in_daily_limit: form.include_in_daily_limit,
    include_in_total_asset: form.include_in_total_asset,
  };
  try {
    if (editingAccount.value) {
      payload.account_id = editingAccount.value._id;
      await userStore.updateAssetAccountAction(payload);
    } else {
      const parsed = safeYuanToFen(form.balanceStr || "0");
      payload.initial_balance = parsed.ok ? parsed.value : 0;
      await userStore.createAssetAccountAction(payload);
    }
    showSheet.value = false;
    uni.showToast({ title: "保存成功", icon: "success" });
  } catch (e) {
    uni.showToast({ title: (e && e.message) || "保存失败", icon: "none" });
  }
}
function onDelete(a) {
  uni.showModal({
    title: "删除确认",
    content: `确定删除「${a.name}」吗？`,
    success: async (res) => {
      if (res.confirm) {
        await userStore.deleteAssetAccountAction(a._id);
        uni.showToast({ title: "已删除", icon: "success" });
      }
    },
  });
}
function openDetail(a) {
  uni.navigateTo({ url: `/pages/asset-detail/asset-detail?id=${a._id}` });
}
function goBack() {
  uni.navigateBack();
}

/* 顶部安全区 */
function resolveTopPadding() {
  try {
    const menuButton = uni.getMenuButtonBoundingClientRect();
    if (menuButton && menuButton.bottom > 0)
      return `${menuButton.bottom + uni.upx2px(16)}px`;
  } catch (_) {}
  const { statusBarHeight = 0 } = uni.getSystemInfoSync();
  return `${statusBarHeight + uni.upx2px(88)}px`;
}
const pagePaddingTop = ref(resolveTopPadding());

onLoad((q) => {
  if (q && q.action === "add") {
    nextTick(() => openAdd());
  }
});

onMounted(() => {
  pagePaddingTop.value = resolveTopPadding();
  userStore.loadAssetAccounts().catch(() => {});
});
</script>

<style scoped>
.asset-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #f2fcf2, #ffffff);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px 10px;
}
.back-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #6b8c7a;
  font-size: 16px;
}
.topbar-title {
  font-size: 17px;
  font-weight: 700;
  color: var(--ink);
}
.add-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #4fd974, #25cc5d);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #fff;
  font-size: 20px;
  font-weight: 300;
}
.topbar-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}
.cam-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 18px;
  border: 1px solid rgba(194, 242, 200, 0.6);
}

.glass-hero {
  margin: 16px;
  padding: 18px;
  text-align: center;
}
.ov-title {
  font-size: 12px;
  color: var(--ink4);
  display: block;
}
.ov-amount {
  font-size: 34px;
  font-weight: 900;
  display: block;
  margin-top: 4px;
  letter-spacing: -1;
}
.ov-sub {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 12px;
  gap: 20px;
}
.ov-sub-item {
  text-align: center;
}
.ov-sub-val {
  font-size: 15px;
  font-weight: 700;
  display: block;
  color: var(--ink);
}
.ov-sub-lbl {
  font-size: 10px;
  color: var(--ink4);
}
.ov-divider {
  width: 1px;
  height: 28px;
  background: rgba(194, 242, 200, 0.4);
}

.class-tabs {
  display: flex;
  gap: 8px;
  margin: 8px 16px 4px;
}
.class-tab {
  flex: 1;
  text-align: center;
  padding: 10px 0;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.6);
  font-size: 13px;
  font-weight: 600;
  color: var(--ink4);
  cursor: pointer;
}
.class-tab.active {
  background: linear-gradient(135deg, #4fd974, #25cc5d);
  color: #fff;
}

.account-card {
  margin: 10px 16px 0;
  padding: 14px 16px;
  cursor: pointer;
}
.acc-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.acc-icon {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 18px;
}
.acc-info {
  flex: 1;
  min-width: 0;
}
.acc-name-row {
  display: flex;
  align-items: center;
  gap: 6px;
}
.acc-name {
  font-size: 14px;
  font-weight: 700;
  color: var(--ink);
}
.acc-type {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 6px;
  background: rgba(194, 242, 200, 0.3);
  color: #6b8c7a;
}
.acc-sub {
  font-size: 11px;
  color: var(--ink4);
  display: block;
  margin-top: 2px;
}
.acc-balance-group {
  text-align: right;
}
.acc-balance {
  font-size: 16px;
  font-weight: 800;
  display: block;
}
.acc-actions {
  display: flex;
  gap: 6px;
  margin-top: 4px;
  justify-content: flex-end;
}
.acc-edit,
.acc-del {
  font-size: 12px;
  cursor: pointer;
  padding: 2px 4px;
}
.acc-edit:active,
.acc-del:active {
  opacity: 0.6;
}

.empty-tip {
  text-align: center;
  color: var(--ink4);
  font-size: 13px;
  padding: 40px 0;
}

.sheet-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  z-index: 300;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.sheet-panel {
  width: 100%;
  max-height: 86vh;
  overflow-y: auto;
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.98),
    rgba(242, 252, 242, 0.96)
  );
  border-radius: 24px 24px 0 0;
  padding: 0 20px 30px;
}
.sheet-handle {
  display: flex;
  justify-content: center;
  padding: 12px 0 8px;
}
.handle-bar {
  width: 38px;
  height: 4px;
  border-radius: 3px;
  background: rgba(194, 242, 200, 0.8);
}
.sheet-title {
  font-size: 16px;
  font-weight: 800;
  color: var(--ink);
  display: block;
  margin-bottom: 14px;
}

.form-label {
  font-size: 12px;
  color: #6b8c7a;
  font-weight: 600;
  display: block;
  margin-bottom: 6px;
  margin-top: 12px;
}
.sheet-input {
  width: 100%;
  height: 44px;
  border-radius: 14px;
  background: rgba(242, 252, 242, 0.8);
  border: 1px solid rgba(194, 242, 200, 0.4);
  padding: 0 14px;
  font-size: 14px;
  margin-bottom: 8px;
  box-sizing: border-box;
}

.type-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.type-chip {
  padding: 6px 14px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(194, 242, 200, 0.3);
  font-size: 12px;
  font-weight: 600;
  color: #6b8c7a;
  cursor: pointer;
}
.type-chip.active {
  background: linear-gradient(135deg, #4fd974, #25cc5d);
  color: #fff;
  border-color: transparent;
}

.toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
}
.toggle-lbl {
  font-size: 13px;
  color: var(--ink);
  font-weight: 600;
}

.save-btn {
  margin-top: 18px;
  padding: 14px;
  border-radius: 16px;
  background: linear-gradient(135deg, #4fd974, #25cc5d);
  text-align: center;
  color: #fff;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
}

/* 我的钱包分配入口（FR-1.1） */
.wallet-alloc {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 12px 0 4px;
  padding: 14px 16px;
  cursor: pointer;
}
.wa-left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.wa-icon {
  font-size: 30px;
}
.wa-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.wa-name {
  font-size: 14px;
  font-weight: 700;
  color: var(--ink);
}
.wa-sub {
  font-size: 11px;
  color: #6b8c7a;
}
.wa-btn {
  font-size: 13px;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, #4fd974, #25cc5d);
  padding: 7px 18px;
  border-radius: 999px;
}

.alloc-from {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 14px;
  background: rgba(242, 252, 242, 0.8);
  margin-bottom: 4px;
}
.af-label {
  font-size: 12px;
  color: #6b8c7a;
}
.af-name {
  font-size: 14px;
  font-weight: 700;
  color: var(--ink);
}
.af-bal {
  margin-left: auto;
  font-size: 14px;
  font-weight: 700;
  color: var(--g5);
}

.amount-row {
  display: flex;
  align-items: baseline;
  gap: 4px;
  padding: 12px 14px;
  border-radius: 14px;
  background: rgba(242, 252, 242, 0.8);
  border: 1px solid rgba(194, 242, 200, 0.4);
  margin-bottom: 8px;
  cursor: pointer;
}
.amount-row .cur {
  font-size: 18px;
  font-weight: 700;
  color: var(--ink);
}
.amount-row .amt {
  font-size: 22px;
  font-weight: 800;
  color: var(--ink);
}
.amount-row .amt.placeholder {
  color: #b0b4bb;
}

.sheet-confirm {
  margin-top: 16px;
  padding: 14px;
  border-radius: 16px;
  background: linear-gradient(135deg, #4fd974, #25cc5d);
  text-align: center;
  color: #fff;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
}
.sheet-confirm.disabled {
  opacity: 0.45;
}
.sheet-cancel {
  margin-top: 10px;
  padding: 14px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.7);
  text-align: center;
  color: #6b8c7a;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.sheet-item-sub {
  font-size: 11px;
  color: #6b8c7a;
  font-weight: 600;
  margin-left: 4px;
}
.empty-tip {
  font-size: 12px;
  color: #9aa3a8;
  text-align: center;
  padding: 20px 0;
}
</style>
