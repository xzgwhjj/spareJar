<template>
  <view class="ledger-page" data-cmp="LedgerPage" :style="{ paddingTop: pagePaddingTop }">
    <!-- 离屏画布：仅供封面主色提取使用（不可见） -->
    <canvas type="2d" id="coverColorCanvas" class="cover-color-canvas"></canvas>

    <!-- 极光背景 -->
    <view class="aurora-bg-wrap">
      <view class="aurora-bg-base" />
      <view class="aurora-band-1" />
      <view class="aurora-band-2" />
      <view class="blob-top-l" />
      <view class="blob-top-r" />
      <view class="blob-mid" />
    </view>

    <!-- 内容区 -->
    <scroll-view
      class="page-scroll"
      scroll-y
      enhanced
      :show-scrollbar="false"
      style="
        height: 100%;
        z-index: 2;
        padding-bottom: calc(90rpx + env(safe-area-inset-bottom));
      "
    >
      <!-- TopBar -->
      <view class="topbar">
        <view>
          <text class="topbar-sub">账本中心</text>
          <text class="topbar-title">我的账本</text>
        </view>
        <view class="topbar-actions">
          <view class="action-btn" @click="openMemberMgr"
            ><image
              class="action-img"
              :src="cdn('/app_static/images/icon_member.png')"
              mode="aspectFit"
          /></view>
          <view class="action-btn" @click="goAddAsset">
            <image
              class="add-img"
              :src="cdn('/app_static/images/icon_add_asset.png')"
              mode="aspectFit"
            />
          </view>
          <!-- <view class="action-btn" @click="goStickerLib"><text>⭐</text></view> -->
        </view>
      </view>

      <!-- Page tabs -->
      <!-- 待：替换图标 -->
      <view class="page-tab-bar">
        <view
          v-for="t in PAGE_TABS"
          :key="t.key"
          class="page-tab"
          :class="{ active: pageTab === t.key }"
          @click="switchTab(t.key)"
        >
          <text class="tab-label">{{ t.label }}</text>
        </view>
        <view
          class="tab-slider"
          :style="{
            left: 'calc(10rpx + ' + sliderIndex + ' * ((100% - 68rpx) / 4 + 16rpx))',
          }"
        ></view>
      </view>

      <!-- TAB: 账本 -->
      <LedgerTab v-show="pageTab === 'ledger'" />

      <!-- TAB: 资产 -->
      <AssetTab v-show="pageTab === 'asset'" />

      <!-- TAB: 报表 -->
      <ChartTab v-show="pageTab === 'chart'" />

      <!-- TAB: 贴纸 -->
      <StickerTab v-show="pageTab === 'sticker'" />

      <!-- 底部留白：避免列表最后一项被固定 TabBar 遮挡 -->
      <view class="list-bottom-gap" />
    </scroll-view>

    <!-- 贴纸消耗记账弹窗（独立组件） -->
    <ConsumeSheet
      :show="showConsume"
      :sticker="activeSticker"
      @update:show="showConsume = $event"
      @consumed="loadData"
    />

    <!-- 多选批量操作栏 -->
    <view v-if="multiSelect" class="batch-bar">
      <view class="batch-info">
        <text class="batch-count">已选 {{ selectedIds.length }} 个</text>
        <text v-if="selectedIds.length === 0" class="batch-hint">勾选要删除的账本</text>
      </view>
      <view class="batch-actions">
        <view class="batch-btn batch-cancel" @click="exitMultiSelect"
          ><text>取消</text></view
        >
        <view
          class="batch-btn batch-del"
          :class="{ disabled: selectedIds.length === 0 }"
          @click="selectedIds.length > 0 && openBatchDelete()"
        >
          <text
            >删除{{ selectedIds.length > 0 ? "(" + selectedIds.length + ")" : "" }}</text
          >
        </view>
      </view>
    </view>

    <!-- 删除确认弹窗（单选 / 多选通用）：列出即将删除的账本名称 -->
    <view v-if="showDelConfirm" class="sheet-overlay" @click="showDelConfirm = false">
      <view class="sheet-panel del-panel" @click.stop>
        <view class="sheet-handle">
          <view class="handle-bar" />
        </view>
        <text class="sheet-title">确认删除账本</text>
        <view class="del-list">
          <view v-for="d in delTargets" :key="d._id" class="del-item">
            <text class="del-emoji">{{ d.emoji }}</text>
            <text class="del-name">{{ d.name }}</text>
          </view>
        </view>
        <text class="del-tip">删除后账本及其记录将按所选方式处理，操作不可恢复</text>
        <view class="del-actions">
          <view class="del-btn del-transfer" @click="confirmDelete('transfer')">
            <text>数据转移至总账本</text>
          </view>
          <view class="del-btn del-purge" @click="confirmDelete('purge')">
            <text>彻底删除（含记录）</text>
          </view>
        </view>
        <view class="del-cancel" @click="showDelConfirm = false"><text>取消</text></view>
      </view>
    </view>

    <!-- 新建账本弹窗（独立组件，自带封面 / 取色 / 裁剪编辑器） -->
    <NewLedgerDialog
      :show="showNewLedger"
      :ledgers="ledgers"
      :max-custom-ledgers="(state.settings && state.settings.max_custom_ledgers) || 5"
      @update:show="showNewLedger = $event"
      @created="loadData"
    />

    <!-- 编辑账本弹窗（独立组件，自带封面 / 取色 / 裁剪编辑器） -->
    <EditLedgerDialog
      :show="showEdit"
      :ledger="editTarget"
      @update:show="showEdit = $event"
      @saved="loadData"
    />

    <!-- TabBar -->
    <TabBar :current="1" />

    <MemberManager
      :visible="showMemberMgr"
      :ledger-id="memberMgrLedgerId"
      :ledger-name="memberMgrLedgerName"
      @close="showMemberMgr = false"
    />

    <!-- 添加资产账户弹窗（本页直接弹出，与 asset-mgr 一致） -->
    <view v-if="showAssetSheet" class="mask" @tap="showAssetSheet = false">
      <view class="sheet" @tap.stop>
        <header class="sheet-header">
          <text class="sheet-title">添加资产账户</text>
          <view class="sheet-close" @tap="showAssetSheet = false">✕</view>
        </header>

        <!-- 截图建账入口（FR-2.2） -->
        <view class="cam-row" @tap="pickAndRecognizeAsset">
          <image
            class="cam-icon"
            :src="cdn('/app_static/images/icon_scan_asset.png')"
            mode="aspectFit"
          />
          <text class="cam-text">拍照 / 截图自动识别建资产账户</text>
        </view>

        <view class="form-grid">
          <view class="form-row form-row-icon">
            <text class="form-label">账户图标</text>
            <view class="icon-picker" @tap="pickAssetIcon">
              <image
                v-if="assetForm.iconFileID"
                class="icon-picker-img"
                :src="assetIconUrl"
                mode="aspectFill"
              />
              <text v-else class="icon-picker-add">＋</text>
              <view
                v-if="assetForm.iconFileID"
                class="icon-picker-clear"
                @tap.stop="clearAssetIcon"
                >✕</view
              >
            </view>
          </view>

          <view class="form-row">
            <text class="form-label">账户名称</text>
            <input
              v-model="assetForm.name"
              class="form-input"
              type="text"
              placeholder="如：招商银行卡"
              placeholder-class="form-ph"
              maxlength="20"
            />
          </view>

          <view class="form-row">
            <text class="form-label">账户类型</text>
            <view class="seg">
              <view
                v-for="opt in ASSET_CLASS_OPTIONS"
                :key="opt.value"
                class="seg-item"
                :class="{ active: assetForm.account_class === opt.value }"
                @tap="
                  assetForm.account_class = opt.value;
                  onAssetClassChange();
                "
                >{{ opt.label }}</view
              >
            </view>
          </view>

          <view class="form-row">
            <text class="form-label">子类型</text>
            <view class="seg seg-subtype">
              <view
                v-for="opt in assetSubtypes"
                :key="opt.v"
                class="seg-item"
                :class="{ active: assetForm.account_subtype === opt.v }"
                @tap="assetForm.account_subtype = opt.v"
                >{{ opt.label }}</view
              >
            </view>
          </view>

          <view v-if="assetForm.account_subtype === 'other'" class="form-row">
            <text class="form-label">子类名称</text>
            <input
              v-model="assetForm.subtype_name"
              class="form-input"
              type="text"
              placeholder="请输入自定义子类名称"
              placeholder-class="form-ph"
              maxlength="20"
            />
          </view>

          <view class="form-row">
            <text class="form-label">初始余额</text>
            <number-field
              v-model="assetForm.balance"
              class="form-amount"
              placeholder="0.00 元"
              title="初始余额"
            />
          </view>
          <text class="form-section-title">计入规则</text>
          <view class="form-switch-row">
            <view class="switch-item">
              <text class="switch-label">计入可支配</text>
              <view
                class="switch"
                :class="{ checked: assetForm.include_in_disposable }"
                @tap="assetForm.include_in_disposable = !assetForm.include_in_disposable"
              >
                <view class="slider">
                  <view class="dot dot-green" />
                  <view class="dot dot-gray" />
                </view>
              </view>
            </view>
            <view class="switch-item">
              <text class="switch-label">计入日限额</text>
              <view
                class="switch"
                :class="{ checked: assetForm.include_in_daily_limit }"
                @tap="
                  assetForm.include_in_daily_limit = !assetForm.include_in_daily_limit
                "
              >
                <view class="slider">
                  <view class="dot dot-green" />
                  <view class="dot dot-gray" />
                </view>
              </view>
            </view>
            <view class="switch-item">
              <text class="switch-label">计入总资产</text>
              <view
                class="switch"
                :class="{ checked: assetForm.include_in_total_asset }"
                @tap="
                  assetForm.include_in_total_asset = !assetForm.include_in_total_asset
                "
              >
                <view class="slider">
                  <view class="dot dot-green" />
                  <view class="dot dot-gray" />
                </view>
              </view>
            </view>
          </view>
          <view v-if="assetForm.include_in_daily_limit" class="form-row">
            <text class="form-label">日限额</text>
            <number-field
              v-model="assetForm.daily_limit"
              class="form-amount"
              placeholder="不填则不限制"
              title="日限额"
            />
          </view>

          <view class="form-row">
            <text class="form-label">备注</text>
            <input
              v-model="assetForm.note"
              class="form-input"
              type="text"
              placeholder="选填"
              placeholder-class="form-ph"
              maxlength="50"
            />
          </view>
        </view>

        <button class="sheet-confirm" :disabled="savingAsset" @tap="saveAssetAccount">
          保存账户
        </button>
      </view>
    </view>

    <!-- 全局数字键盘（单例）：由 main.js 全局注册 -->
    <amount-keyboard />
  </view>
</template>

<script setup>
import {
  deleteLedger,
  ensureMasterLedger,
  listLedgers,
  listTransactions,
  getLedgerDetail,
} from "@/api/sparejar.js";
import TabBar from "@/components/tabbar/tabbar.vue";
import MemberManager from "@/components/MemberManager.vue";
import NewLedgerDialog from "@/components/ledger/NewLedgerDialog.vue";
import EditLedgerDialog from "@/components/ledger/EditLedgerDialog.vue";
import ConsumeSheet from "@/components/ledger/ConsumeSheet.vue";
import LedgerTab from "@/components/ledger/tabs/LedgerTab.vue";
import AssetTab from "@/components/ledger/tabs/AssetTab.vue";
import ChartTab from "@/components/ledger/tabs/ChartTab.vue";
import StickerTab from "@/components/ledger/tabs/StickerTab.vue";
import { checkLoggedIn, useUserStore } from "@/stores/user.js";
import { createAssetAccountAction } from "@/stores/asset.js";
import { cdn, resolveCover, getCloudTempUrl, getCloudTempUrls } from "@/utils/cdn.js";
import { uploadAssetIcon } from "@/utils/cloudFile.js";
import { safeYuanToFen, fenToYuanString } from "@/utils/money.js";
import { recognizeAsset as apiRecognizeAsset } from "@/api/sparejar.js";
import { formatDateKey, formatMonthKey } from "@/utils/date.js";
import { rafTick, cancelRafTick, createCountUp, animateValue } from "@/utils/countUp.js";
import { onShow } from "@dcloudio/uni-app";
import {
  computed,
  getCurrentInstance,
  nextTick,
  onMounted,
  onUnmounted,
  provide,
  reactive,
  ref,
  watch,
} from "vue";

const instance = getCurrentInstance();
const PAGE_TABS = [
  { key: "ledger", label: "账本", icon: "📖" },
  { key: "asset", label: "资产", icon: "💰" },
  { key: "chart", label: "报表", icon: "📊" },
  { key: "sticker", label: "贴纸", icon: "🌟" },
];

const assetModes = [
  { id: "disposable", label: "可支配" },
  { id: "withInvest", label: "含投资" },
  { id: "total", label: "净资产" },
];

const userStore = useUserStore();
const {
  state,
  categoryMap,
  loadStickers,
  consumeStickerAction,
  deleteStickerAction,
} = userStore;

const pageTab = ref("ledger");
const sliderIndex = ref(0);
watch(pageTab, (k) => {
  sliderIndex.value = Math.max(
    0,
    PAGE_TABS.findIndex((t) => t.key === k)
  );
});
const assetMode = ref("disposable");

// 新建账本
const showNewLedger = ref(false);
function openNewLedger() {
  showNewLedger.value = true;
}

// 系统默认图库（LEDGER_ICONS）已抽到 composables/useCoverEditor.js 供弹窗组件共享
// 默认封面相对路径（封面为空时兜底展示）
const DEFAULT_COVER_REL = "/app_static/images/icon_cover.png";
const defaultCoverUrl = cdn(DEFAULT_COVER_REL);

// 封面加载失败（404 / 网络错误等）：用响应式错误表（按账本 _id 记录）回退到默认图。
// 注意：ledgerViews 是 computed，每次返回全新普通对象；若把 coverError 直接挂在 item 上，
// 该赋值非响应式、且不随 item 持久，导致 fallback 永不生效。故用独立响应式 map 记录失败项。
const coverErrors = reactive({});
// 云存储封面（用户上传，存 cloud:// fileID）解析后的临时访问 URL，按账本 _id 记录。
// 云存储与网页托管不互通，fileID 不能直接拼 CDN 域名，必须经 getTempFileURL 换临时链。
const coverUrlMap = reactive({});
// 封面显示：优先展示 3:4 版本（cover34），无则回退主封面 cover（4:3）。
// cloud:// → 用预解析的临时链（按 fileID 存）；/app_static → 拼 CDN；/ledger_img（旧数据）→ 留空走默认图
function coverDisplay(l) {
  const c = String(l.cover34 || l.cover || "");
  if (!c) return "";
  if (c.startsWith("cloud://")) return coverUrlMap[c] || "";
  if (c.startsWith("/ledger_img/")) return "";
  return resolveCover(c);
}
function onCoverError(item) {
  if (item && item._id) {
    coverErrors[item._id] = true;
  }
}

// 判断是否为图片路径（与 emoji 图标区分），兼容旧 emoji 数据
function isImg(v) {
  return (
    typeof v === "string" &&
    (v.startsWith("/") || v.startsWith("http") || v.startsWith("data:"))
  );
}


// 编辑账本
const showEdit = ref(false);
const editTarget = ref(null);

// 多选删除：模式开关、已选账本 id、删除确认弹窗目标
const multiSelect = ref(false);
const selectedIds = ref([]);
const delTargets = ref([]);
const showDelConfirm = ref(false);
// 就地操作菜单：记录当前展开菜单的账本 _id（仅一个，其他账本不受影响）
const openMenuId = ref(null);

// 真实账本 + 交易（用于聚合）
const ledgers = ref([]);
const transactions = ref([]);

// 调色板（无封面取色/旧账本回退）：与封面取色锚点一致，更深、更高饱和、对比更高
const PALETTE = [
  { color: "#8ae99b", colorBg: "#e1fae3" },
  { color: "#5b3fc4", colorBg: "#f3f0ff" },
];

const monthKey = (() => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
})();

const fmt = (fen) =>
  (fen / 100).toLocaleString("zh-CN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

const totalBalance = computed(() =>
  transactions.value.reduce(
    (s, t) => s + (t.type === "expense" ? -t.amount : t.amount),
    0
  )
);
const monthIncome = computed(() =>
  transactions.value
    .filter((t) => t.type !== "expense" && t.month_key === monthKey)
    .reduce((s, t) => s + t.amount, 0)
);
const monthExpense = computed(() =>
  transactions.value
    .filter((t) => t.type === "expense" && t.month_key === monthKey)
    .reduce((s, t) => s + t.amount, 0)
);
const monthNet = computed(() => monthIncome.value - monthExpense.value);

// ===== 报表专用：时间周期（复用既有日历维度）+ 账本筛选 =====
const repDim = ref("month"); // 'day' | 'month' | 'year'
const repKey = ref(monthKey); // 与 ovKey 同格式
const pad2k = (n) => (n < 10 ? `0${n}` : String(n));
function repDefaultKey(dim) {
  const now = new Date();
  if (dim === "day")
    return `${now.getFullYear()}-${pad2k(now.getMonth() + 1)}-${pad2k(now.getDate())}`;
  if (dim === "month") return `${now.getFullYear()}-${pad2k(now.getMonth() + 1)}`;
  return String(now.getFullYear());
}
// 切换维度时：仅当新维度下当前值格式不匹配才重置为默认（避免误清选择）
function setRepDim(dim) {
  if (dim === repDim.value) return;
  const k = repKey.value;
  const ok =
    (dim === "day" && /^\d{4}-\d{2}-\d{2}$/.test(k)) ||
    (dim === "month" && /^\d{4}-\d{2}$/.test(k)) ||
    (dim === "year" && /^\d{4}$/.test(k));
  repDim.value = dim;
  if (!ok) repKey.value = repDefaultKey(dim);
}
// 报表周期按钮展示文案
const repKeyLabel = computed(() => {
  const k = repKey.value || "";
  const dim = repDim.value;
  if (dim === "day") {
    const [y, m, d] = k.split("-");
    return `${y}年${Number(m)}月${Number(d)}日`;
  }
  if (dim === "month") {
    const [y, m] = k.split("-");
    return `${y}年${Number(m)}月`;
  }
  return `${k}年`;
});
// 周期选择弹层
const repPop = ref(false);
function openRepPop() {
  repPop.value = true;
}
function closeRepPop() {
  repPop.value = false;
}
// 弹层内日历格子的收/支汇总（随报表账本筛选联动）
const repDayExpenseMap = computed(() => {
  const map = {};
  for (const t of transactions.value) {
    if (t.type === "expense" && t.date_key && inRepLedger(t))
      map[t.date_key] = (map[t.date_key] || 0) + t.amount;
  }
  return map;
});
const repDayIncomeMap = computed(() => {
  const map = {};
  for (const t of transactions.value) {
    if (t.type !== "expense" && t.date_key && inRepLedger(t))
      map[t.date_key] = (map[t.date_key] || 0) + t.amount;
  }
  return map;
});
const repMonthExpenseMap = computed(() => {
  const map = {};
  for (const t of transactions.value) {
    if (t.type === "expense" && t.month_key && inRepLedger(t))
      map[t.month_key] = (map[t.month_key] || 0) + t.amount;
  }
  return map;
});
const repMonthIncomeMap = computed(() => {
  const map = {};
  for (const t of transactions.value) {
    if (t.type !== "expense" && t.month_key && inRepLedger(t))
      map[t.month_key] = (map[t.month_key] || 0) + t.amount;
  }
  return map;
});
const repYearExpenseMap = computed(() => {
  const map = {};
  for (const t of transactions.value) {
    if (t.type === "expense" && t.date_key && inRepLedger(t)) {
      const y = t.date_key.slice(0, 4);
      map[y] = (map[y] || 0) + t.amount;
    }
  }
  return map;
});
const repYearIncomeMap = computed(() => {
  const map = {};
  for (const t of transactions.value) {
    if (t.type !== "expense" && t.date_key && inRepLedger(t)) {
      const y = t.date_key.slice(0, 4);
      map[y] = (map[y] || 0) + t.amount;
    }
  }
  return map;
});
// 报表维度下的周期匹配（与 inSelectedPeriod 同逻辑）
function inRepPeriod(t) {
  const dim = repDim.value;
  const key = repKey.value;
  if (dim === "day") return t.date_key === key;
  if (dim === "month") return t.month_key === key;
  return (t.date_key || "").startsWith(key + "-");
}
// 当前周期已选账本（null=全部）
const repLedgerId = ref(null);
function inRepLedger(t) {
  return repLedgerId.value ? t.ledger_id === repLedgerId.value : true;
}
function inRep(t) {
  return inRepPeriod(t) && inRepLedger(t);
}

// ===== P0：本期概览（随报表周期联动）=====
const repIncome = computed(() =>
  transactions.value
    .filter((t) => t.type !== "expense" && inRep(t))
    .reduce((s, t) => s + t.amount, 0)
);
const repExpense = computed(() =>
  transactions.value
    .filter((t) => t.type === "expense" && inRep(t))
    .reduce((s, t) => s + t.amount, 0)
);
const repNet = computed(() => repIncome.value - repExpense.value);
const repSaveRate = computed(() =>
  repIncome.value > 0 ? Math.round((repNet.value / repIncome.value) * 100) : 0
);

// 环比：与上一周期对比（仅 day/month/year 有明确上一周期）
function prevKeyOf(dim, key) {
  if (dim === "month") {
    const [y, m] = key.split("-").map(Number);
    const d = new Date(y, m - 2, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }
  if (dim === "day") {
    const [y, m, d] = key.split("-").map(Number);
    const dt = new Date(y, m - 1, d - 1);
    return formatDateKey(dt);
  }
  return String(Number(key) - 1); // year
}
function periodAgg(key, filterFn) {
  const dim = repDim.value;
  return transactions.value
    .filter((t) => {
      const ok =
        dim === "day"
          ? t.date_key === key
          : dim === "month"
          ? t.month_key === key
          : (t.date_key || "").startsWith(key + "-");
      return ok && inRepLedger(t) && filterFn(t);
    })
    .reduce((s, t) => s + t.amount, 0);
}
// 环比率：返回正数=上升，负数=下降，null=无可比
function momRate(cur, prev) {
  if (!prev) return null;
  return Math.round(((cur - prev) / prev) * 100);
}
const prevKey = computed(() => prevKeyOf(repDim.value, repKey.value));
const repIncomeMom = computed(() =>
  momRate(
    repIncome.value,
    periodAgg(prevKey.value, (t) => t.type !== "expense")
  )
);
const repExpenseMom = computed(() =>
  momRate(
    repExpense.value,
    periodAgg(prevKey.value, (t) => t.type === "expense")
  )
);
const repNetMom = computed(() => {
  const prevNet =
    periodAgg(prevKey.value, (t) => t.type !== "expense") -
    periodAgg(prevKey.value, (t) => t.type === "expense");
  return momRate(repNet.value, prevNet);
});

// ===== 动态仪表盘：指标联动 + 数值滚动动画 =====
const DASH_DEFS = {
  income: { label: "收入", color: "#0ca678" },
  expense: { label: "支出", color: "#e8590c" },
  net: { label: "结余", color: "#2f9e44" },
  rate: { label: "结余率", color: "#7c6cf8" },
};
const dashMetric = ref("income");
function setDashMetric(k) {
  if (dashMetric.value === k) return;
  dashMetric.value = k;
}
const dashColor = computed(() => DASH_DEFS[dashMetric.value].color);
// 各指标当前值的展示文案（chips 用）
function metricValOf(k) {
  if (k === "income") return "¥" + fmt(repIncome.value);
  if (k === "expense") return "¥" + fmt(repExpense.value);
  if (k === "net") return "¥" + fmt(repNet.value);
  return repSaveRate.value + "%";
}

// 上期聚合（用于环比/对比）
const prevIncomeVal = computed(() =>
  periodAgg(prevKey.value, (t) => t.type !== "expense")
);
const prevExpenseVal = computed(() =>
  periodAgg(prevKey.value, (t) => t.type === "expense")
);
const prevNetVal = computed(() => prevIncomeVal.value - prevExpenseVal.value);
const prevRateVal = computed(() =>
  prevIncomeVal.value > 0 ? Math.round((prevNetVal.value / prevIncomeVal.value) * 100) : 0
);

// 当前选中指标的现值 / 上期值 / 环比
const dashCur = computed(() => {
  if (dashMetric.value === "income") return repIncome.value;
  if (dashMetric.value === "expense") return repExpense.value;
  if (dashMetric.value === "net") return repNet.value;
  return repSaveRate.value;
});
const dashPrev = computed(() => {
  if (dashMetric.value === "income") return prevIncomeVal.value;
  if (dashMetric.value === "expense") return prevExpenseVal.value;
  if (dashMetric.value === "net") return prevNetVal.value;
  return prevRateVal.value;
});
const dashMom = computed(() => {
  if (dashMetric.value === "rate")
    return dashPrev.value ? dashCur.value - dashPrev.value : null; // 结余率差值（百分点）
  return momRate(dashCur.value, dashPrev.value);
});
const dashMomText = computed(() => {
  if (dashMom.value === null) return "无对比";
  const s = dashMom.value >= 0 ? "+" : "";
  return dashMetric.value === "rate" ? `${s}${dashMom.value}pp` : `${s}${dashMom.value}%`;
});

// Gauge 达成比例 0~100（结余率直接取值；其余为 本期/上期）
const dashRatio = computed(() => {
  if (dashMetric.value === "rate") return Math.min(100, Math.max(0, repSaveRate.value));
  const prev = dashPrev.value;
  if (!prev || prev <= 0) return dashCur.value > 0 ? 100 : 0;
  return Math.min(100, Math.max(0, Math.round((dashCur.value / prev) * 100)));
});

// 数值滚动动画（实现见 @/utils/countUp.js）
const dashDisplay = ref(0);
watch(
  [dashCur, dashMetric],
  ([to]) => animateValue(dashDisplay.value, to, 650, (v) => (dashDisplay.value = v)),
  { immediate: true }
);
const dashDisplayText = computed(() => {
  const v = Math.round(dashDisplay.value);
  if (dashMetric.value === "rate") return v + "%";
  return "¥" + fmt(v);
});

// 本期 vs 上期 对比条
const dashCompare = computed(() => {
  const cur = dashCur.value;
  const prev = dashPrev.value;
  const max = Math.max(cur, prev, 1);
  return [
    { label: "本期", value: cur, pct: Math.round((cur / max) * 100) },
    { label: "上期", value: prev, pct: Math.round((prev / max) * 100) },
  ];
});

// Gauge 弧（上半圆）几何
const GAUGE_R = 80;
const GAUGE_CIRC = Math.PI * GAUGE_R; // 半圆弧长
const dashArcLen = computed(() => (dashRatio.value / 100) * GAUGE_CIRC);

// 环比展示辅助
function momClass(v) {
  if (v === null) return "muted";
  return v >= 0 ? "up" : "down";
}
function momIco(v) {
  if (v === null) return "—";
  return v >= 0 ? "▲" : "▼";
}
function momText(v) {
  if (v === null) return "无对比";
  return Math.abs(v) + "%";
}

// 账本筛选选项（全部 + 各账本）
const ledgerOptions = computed(() => [
  { id: null, label: "全部账本" },
  ...ledgers.value.map((l) => ({ id: l._id, label: l.name })),
]);
const currentLedgerName = computed(() => {
  const o = ledgerOptions.value.find((x) => x.id === repLedgerId.value);
  return o ? o.label : "全部账本";
});
function onRepLedgerChange(e) {
  const idx = Number(e.detail.value);
  repLedgerId.value = ledgerOptions.value[idx]?.id ?? null;
}

// 导出 / 分享月报：生成文本摘要并复制到剪贴板（可再分享）
function exportMonth() {
  const dimWord = repDim.value === "day" ? "日" : repDim.value === "year" ? "年" : "月";
  const lines = [
    `【余钱罐${dimWord}报 ${repKey.value}】`,
    `收入：¥${fmt(repIncome.value)}`,
    `支出：¥${fmt(repExpense.value)}`,
    `结余：¥${fmt(repNet.value)}（结余率 ${repSaveRate.value}%）`,
    `资产净值：¥${fmt(net.value)}（可用 ¥${fmt(cash.value)} / 投资 ¥${fmt(
      invest.value
    )} / 负债 ¥${fmt(liab.value)}）`,
    `支出分类 TOP：`,
  ];
  monthExpenseByCat.value.forEach((c) => {
    lines.push(
      `  - ${c.name}：¥${fmt(c.value)}${
        c.mom !== null ? `（环比 ${c.mom >= 0 ? "+" : ""}${c.mom}%）` : ""
      }`
    );
  });
  const text = lines.join("\n");
  uni.setClipboardData({
    data: text,
    success: () => uni.showToast({ title: "月报已复制", icon: "success" }),
  });
}

// 全局统计卡片：默认简洁总览，点击展开日/月/年明细
const ovExpanded = ref(false);

// 点击切换时的逐字滑出/滑入动画反馈（取自 uiverse.io KINGFRESS/giant-deer-25 的 hover 效果）
const calSwapping = ref(false);
const swapFrom = ref("");
const swapTo = ref("");
const swapDir = ref("in"); // 'in'：收起日历滑入；'out'：收起日历滑出
let calSwapTimer = null;
const onCalBtn = () => {
  // 先捕获点击前的文案用于离场、点击后的文案用于入场，避免 ovExpanded 翻转后两层文字错乱
  swapFrom.value = ovExpanded.value ? "收起日历" : "查看日历";
  swapTo.value = ovExpanded.value ? "查看日历" : "收起日历";
  // 由「查看日历」点出 → 收起日历滑入；由「收起日历」点出 → 收起日历滑出（方向相反）
  swapDir.value = ovExpanded.value ? "out" : "in";
  ovExpanded.value = !ovExpanded.value;
  calSwapping.value = true;
  clearTimeout(calSwapTimer);
  calSwapTimer = setTimeout(() => {
    calSwapping.value = false;
  }, 750);
};
const ovDim = ref("month"); // 'day' | 'month' | 'year'
const ovKey = ref(formatMonthKey(new Date()));
function ovDefaultKey(dim) {
  const now = new Date();
  if (dim === "day") return formatDateKey(now);
  if (dim === "month") return formatMonthKey(now);
  return String(now.getFullYear());
}
function setOvDim(dim) {
  ovDim.value = dim;
  ovKey.value = ovDefaultKey(dim);
}
// 下方数据区：随选中的 年/月/日 实时联动。
// 关键：在每个 computed 顶部直接读取 ovDim.value / ovKey.value（ref），
// 确保依赖被 Vue 精准追踪，切换日期/维度时即时重算并重新渲染。
function inSelectedPeriod(t) {
  const dim = ovDim.value;
  const key = ovKey.value;
  if (dim === "day") return t.date_key === key;
  if (dim === "month") return t.month_key === key;
  return (t.date_key || "").startsWith(key + "-");
}
const ovExpense = computed(() => {
  const dim = ovDim.value;
  const key = ovKey.value;
  let s = 0;
  for (const t of transactions.value) {
    if (t.type !== "expense") continue;
    if (dim === "day" && t.date_key !== key) continue;
    if (dim === "month" && t.month_key !== key) continue;
    if (dim === "year" && !(t.date_key || "").startsWith(key + "-")) continue;
    s += t.amount;
  }
  return s;
});
const ovIncome = computed(() => {
  const dim = ovDim.value;
  const key = ovKey.value;
  let s = 0;
  for (const t of transactions.value) {
    if (t.type === "expense") continue;
    if (dim === "day" && t.date_key !== key) continue;
    if (dim === "month" && t.month_key !== key) continue;
    if (dim === "year" && !(t.date_key || "").startsWith(key + "-")) continue;
    s += t.amount;
  }
  return s;
});
const ovNet = computed(() => ovIncome.value - ovExpense.value);
const ovTxCount = computed(() => {
  const dim = ovDim.value;
  const key = ovKey.value;
  let n = 0;
  for (const t of transactions.value) {
    if (dim === "day" && t.date_key !== key) continue;
    if (dim === "month" && t.month_key !== key) continue;
    if (dim === "year" && !(t.date_key || "").startsWith(key + "-")) continue;
    n++;
  }
  return n;
});
// 账本：当前周期内「有流水」的账本数（按 ledger_id 去重），随日期动态变化，而非固定总数
const ovLedgerCount = computed(() => {
  const dim = ovDim.value;
  const key = ovKey.value;
  const set = new Set();
  for (const t of transactions.value) {
    if (dim === "day" && t.date_key !== key) continue;
    if (dim === "month" && t.month_key !== key) continue;
    if (dim === "year" && !(t.date_key || "").startsWith(key + "-")) continue;
    if (t.ledger_id) set.add(t.ledger_id);
  }
  return set.size;
});

// 日历网格用：按日 / 按月 / 按年聚合收入与支出（分），用于格子下方的金额提示
const dayExpenseMap = computed(() => {
  const map = {};
  for (const t of transactions.value) {
    if (t.type === "expense" && t.date_key)
      map[t.date_key] = (map[t.date_key] || 0) + t.amount;
  }
  return map;
});
const dayIncomeMap = computed(() => {
  const map = {};
  for (const t of transactions.value) {
    if (t.type !== "expense" && t.date_key)
      map[t.date_key] = (map[t.date_key] || 0) + t.amount;
  }
  return map;
});
const monthExpenseMap = computed(() => {
  const map = {};
  for (const t of transactions.value) {
    if (t.type === "expense" && t.month_key)
      map[t.month_key] = (map[t.month_key] || 0) + t.amount;
  }
  return map;
});
const monthIncomeMap = computed(() => {
  const map = {};
  for (const t of transactions.value) {
    if (t.type !== "expense" && t.month_key)
      map[t.month_key] = (map[t.month_key] || 0) + t.amount;
  }
  return map;
});
const yearExpenseMap = computed(() => {
  const map = {};
  for (const t of transactions.value) {
    if (t.type === "expense" && t.date_key) {
      const y = t.date_key.slice(0, 4);
      map[y] = (map[y] || 0) + t.amount;
    }
  }
  return map;
});
const yearIncomeMap = computed(() => {
  const map = {};
  for (const t of transactions.value) {
    if (t.type !== "expense" && t.date_key) {
      const y = t.date_key.slice(0, 4);
      map[y] = (map[y] || 0) + t.amount;
    }
  }
  return map;
});

// 每个账本的展示视图：聚合交易，按当前选中的 日/月/年 维度实时联动
// （收入、支出、使用额、限额、笔数均随 ovDim/ovKey 变化）
const ledgerViews = computed(() =>
  ledgers.value.map((l, i) => {
    const isMaster = !!l.is_system;
    const txs = isMaster
      ? transactions.value
      : transactions.value.filter((t) => t.ledger_id === l._id);
    const dim = ovDim.value;
    const key = ovKey.value;
    const inPeriod = (t) => {
      if (dim === "day") return t.date_key === key;
      if (dim === "month") return t.month_key === key;
      return (t.date_key || "").startsWith(key + "-");
    };
    const periodTxs = txs.filter(inPeriod);
    const income = periodTxs
      .filter((t) => t.type !== "expense")
      .reduce((s, t) => s + t.amount, 0);
    const expense = periodTxs
      .filter((t) => t.type === "expense")
      .reduce((s, t) => s + t.amount, 0);
    const balance = income - expense;

    // 限额随维度换算：月=月预算，日=月预算/30，年=月预算×12
    const monthly = l.monthly_budget || 0;
    let limit = monthly;
    if (dim === "day") limit = monthly ? Math.round(monthly / 30) : 0;
    else if (dim === "year") limit = monthly * 12;

    const spent = expense;
    const pct = limit > 0 ? Math.min(Math.round((spent / limit) * 100), 100) : 0;
    const pal = PALETTE[i % PALETTE.length];
    return {
      _id: l._id,
      emoji: l.icon || "📒",
      name: l.name,
      type: isMaster ? "master" : "sub",
      is_system: isMaster,
      income,
      expense,
      balance,
      limit,
      spent,
      pct,
      dim,
      records: periodTxs.length,
      members: l.memberCount || 1,
      color: pal.color,
      colorBg: pal.colorBg,
      cover: l.cover || "",
      theme_color: l.theme_color || "",
    };
  })
);

// P2：预算执行率（随报表周期 + 账本筛选联动）
const budgetRows = computed(() => {
  const dim = repDim.value;
  const key = repKey.value;
  const inPeriod = (t) => {
    if (dim === "day") return t.date_key === key;
    if (dim === "month") return t.month_key === key;
    return (t.date_key || "").startsWith(key + "-");
  };
  return ledgers.value
    .filter((l) => !repLedgerId.value || l._id === repLedgerId.value)
    .map((l, i) => {
      const monthly = l.monthly_budget || 0;
      let limit = monthly;
      if (dim === "day") limit = monthly ? Math.round(monthly / 30) : 0;
      else if (dim === "year") limit = monthly * 12;
      if (limit <= 0) return null;
      const txs = l.is_system
        ? transactions.value
        : transactions.value.filter((t) => t.ledger_id === l._id);
      const spent = txs
        .filter((t) => t.type === "expense" && inPeriod(t))
        .reduce((s, t) => s + t.amount, 0);
      const pal = PALETTE[i % PALETTE.length];
      return {
        _id: l._id,
        name: l.name,
        emoji: l.icon || "📒",
        spent,
        limit,
        pct: Math.round((spent / limit) * 100),
        colorBg: pal.colorBg,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.pct - a.pct);
});

// 维度中文前缀：用于进度条"使用/限额"标签
const dimWord = (dim) => (dim === "day" ? "日" : dim === "year" ? "年" : "月");

// 预算周期命名：随上方所选日期维度联动（天→天预算 / 月→月度预算 / 年→年度预算）
const budgetWord = (dim) =>
  dim === "day" ? "天预算" : dim === "year" ? "年度预算" : "月度预算";

// 主题色：列表直接读取数据库持久化的 theme_color，不在进入时自动提取。
// 主账本恒返回 null（沿用原 CSS 绿）；其余账本返回 theme_color，无则回退到调色板 l.color。
function coverTheme(l) {
  if (l.type === "master") return null;
  return l.theme_color || null;
}

// —— 资产 Tab：接入真实资产账户（阶段 10） ——
const ASSET_SUBTYPE_ICON = {
  wechat: cdn("/app_static/images/icon_wechat.png"),
  alipay: cdn("/app_static/images/icon_alipay.png"),
  bank_card: cdn("/app_static/images/icon_bank_card.png"),
  bank: cdn("/app_static/images/icon_bank_card.png"),
  cash: cdn("/app_static/images/icon_cash.png"),
  huabei: cdn("/app_static/images/icon_huabei.png"),
  credit_card: cdn("/app_static/images/icon_credit_card.png"),
  jdbt: cdn("/app_static/images/icon_jdbt.png"),
  loan: cdn("/app_static/images/icon_loan.png"),
  provident_fund: cdn("/app_static/images/icon_provident_fund.png"),
  insurance: cdn("/app_static/images/icon_insurance.png"),
  fund: cdn("/app_static/images/icon_fund.png"),
  stock: cdn("/app_static/images/icon_stock.png"),
  bond: cdn("/app_static/images/icon_bond.png"),
  gold: cdn("/app_static/images/icon_gold.png"),
  other: cdn("/app_static/images/icon_other.png"),
};
const ASSET_SUBTYPE_BG = {
  wechat: "#e8f8ec",
  alipay: "#e8f1fb",
  bank_card: "#f3f0ff",
  bank: "#f3f0ff",
  cash: "#e1fae3",
  huabei: "#fdeef3",
  credit_card: "#eef1f4",
  jdbt: "#f3f0ff",
  loan: "#fbf3e0",
  provident_fund: "#eaf3ff",
  insurance: "#fdeef0",
  fund: "#fffbeb",
  stock: "#eef5ff",
  bond: "#f3f0ff",
  gold: "#fbf3e0",
  other: "#eef1f4",
};
const ASSET_SUBTYPE_LABEL = {
  wechat: "微信",
  alipay: "支付宝",
  bank_card: "银行卡",
  bank: "银行卡",
  cash: "现金",
  huabei: "花呗",
  credit_card: "信用卡",
  jdbt: "京东白条",
  loan: "借款",
  provident_fund: "公积金",
  insurance: "医保",
  fund: "基金",
  stock: "股票",
  bond: "债券",
  gold: "黄金",
  other: "其他",
};
const ACCOUNTS = computed(() =>
  (state.assets || []).map((a) => ({
    _id: a._id,
    icon:
      ASSET_SUBTYPE_ICON[a.account_subtype] || cdn("/app_static/images/icon_other.png"),
    colorBg: ASSET_SUBTYPE_BG[a.account_subtype] || "#e1fae3",
    iconFileID: a.icon || "",
    name: a.name,
    type: ASSET_SUBTYPE_LABEL[a.account_subtype] || a.account_subtype,
    balance: a.balance,
  }))
);
// 账户分布：按 subtype 汇总余额（用于资产分布条），按余额降序
const accountDist = computed(() => {
  const groups = {};
  (state.assets || []).forEach((a) => {
    const k = a.account_subtype || "other";
    groups[k] = (groups[k] || 0) + (a.balance || 0);
  });
  const total = Object.values(groups).reduce((s, v) => s + v, 0) || 1;
  return Object.keys(groups)
    .map((k, i) => ({
      key: k,
      name: ASSET_SUBTYPE_LABEL[k] || k,
      colorBg: ASSET_SUBTYPE_BG[k] || "#eef1f4",
      icon: ASSET_SUBTYPE_ICON[k] || cdn("/app_static/images/icon_other.png"),
      value: groups[k],
      pct: Math.round((groups[k] / total) * 100),
      accent: NEON_PALETTE[i % NEON_PALETTE.length],
    }))
    .sort((a, b) => b.value - a.value);
});
// 未来科技面板：白色 + g0~g5 绿阶配色 + 通用数字滚动工厂
const NEON_PALETTE = [
  "#25cc5d", // g5 品牌主色
  "#8ae99b", // g4
  "#acf5b7", // g3
  "#c6fbce", // g2-1
  "#25cc5d",
  "#8ae99b",
  "#acf5b7",
];
// 资产卡联动：assetFocus = 'net' | 账户 key
const assetFocus = ref("net");
const assetNet = createCountUp();
const assetCash = createCountUp();
const assetInvest = createCountUp();
const assetLiab = createCountUp();
const assetSub = createCountUp();
const assetMain = computed(() => {
  const f = assetFocus.value;
  if (f === "net") return { label: "资产净值", color: "#25cc5d", v: assetNet.display };
  const g = accountDist.value.find((x) => x.key === f);
  if (!g) return { label: "资产净值", color: "#25cc5d", v: assetNet.display };
  return { label: g.name, color: g.accent, v: assetSub.display };
});
function focusAsset(key) {
  assetFocus.value = assetFocus.value === key ? "net" : key;
}
// 资产账户自定义图标：批量解析云存储 fileID → 临时可访问 URL
const accIconUrls = ref({});
watch(
  () => ACCOUNTS.value.map((a) => a.iconFileID).join("|"),
  async () => {
    const ids = ACCOUNTS.value.map((a) => a.iconFileID).filter(Boolean);
    if (!ids.length) {
      accIconUrls.value = {};
      return;
    }
    const map = await getCloudTempUrls(ids);
    accIconUrls.value = map;
  },
  { immediate: true }
);

// ===== 贴纸 Tab：三个卡片（囤货/分类/用户上传），各取最常用两行 =====
// 排序规则：按使用次数（use_count）降序；无频率数据时按默认顺序（sort_order）展示前两行
// 贴纸卡片底图（CDN）
const stickerBgUrl = cdn("/app_static/images/icon_sticker_bg2.png");
const stickerBgStyle = { "--sticker-bg-img": `url('${stickerBgUrl}')` };
const STICKER_GRID_ROWS = 2;
const STICKER_GRID_COLS = 3;
const STICKER_GRID_LIMIT = STICKER_GRID_ROWS * STICKER_GRID_COLS; // 6
function sortStickerGrid(list) {
  return [...(list || [])]
    .filter((s) => !s.deleted_at)
    .sort(
      (a, b) =>
        (b.use_count || 0) - (a.use_count || 0) ||
        (a.sort_order || 0) - (b.sort_order || 0) ||
        String(a.name || "").localeCompare(String(b.name || ""), "zh")
    )
    .slice(0, STICKER_GRID_LIMIT);
}
// 囤货贴纸（type=stock）
const stockGrid = computed(() =>
  sortStickerGrid((state.stickers || []).filter((s) => s.type === "stock"))
);
// 分类贴纸（type=material）。无素材贴纸时，回退展示 categories 表中的分类（最多前 10 个）
const STICKER_CAT_FALLBACK_LIMIT = 10;
const materialGrid = computed(() => {
  const stickers = sortStickerGrid(
    (state.stickers || []).filter((s) => s.type === "material")
  );
  if (stickers.length) return stickers;
  const cats = Array.isArray(state.categories) ? state.categories : [];
  return cats
    .filter((c) => !c.deleted_at)
    .slice(0, STICKER_CAT_FALLBACK_LIMIT)
    .map((c) => ({
      _id: c._id,
      kind: "category",
      name: c.name,
      icon: c.icon || "",
      desc: c.desc || "",
      use_count: c.use_count || 0,
      sort_order: c.sort_order || 0,
    }));
});
// 用户上传贴纸（type=custom：单独拍摄 / AI 组合）
const customGrid = computed(() =>
  sortStickerGrid((state.stickers || []).filter((s) => s.type === "custom"))
);
const stockCount = computed(
  () => (state.stickers || []).filter((s) => s.type === "stock").length
);
const materialCount = computed(() => {
  const n = (state.stickers || []).filter((s) => s.type === "material").length;
  if (n) return n;
  return Array.isArray(state.categories) ? state.categories.length : 0;
});
const customCount = computed(
  () => (state.stickers || []).filter((s) => s.type === "custom").length
);
const lowStockCount = computed(
  () => (state.stickers || []).filter((s) => isStickerLow(s)).length
);
// 本月贴纸消耗（来自已加载的 transactions，tags 含 stock_consume）
const stickerConsumeMonth = computed(() => {
  const mk = formatMonthKey(new Date());
  const rows = (transactions.value || []).filter(
    (t) => t.tags && t.tags.includes("stock_consume") && t.month_key === mk
  );
  return { count: rows.length, amount: rows.reduce((s, t) => s + (t.amount || 0), 0) };
});

function stickerImg(s) {
  return (s && s.image_url) || "";
}
function isStickerLow(s) {
  if (!s || s.type !== "stock") return false;
  const threshold = s.low_stock_threshold != null ? s.low_stock_threshold : 1;
  return s.stock_qty > 0 && s.stock_qty <= threshold;
}
function isStickerOut(s) {
  return s.type === "stock" && s.stock_qty <= 0;
}
function stickerSub(s) {
  if (s.type === "stock") return `库存 ${s.stock_qty} · ¥${fmt(s.unit_price)}/件`;
  return `已用 ${s.use_count || 0} 次`;
}
function stickerCatName(s) {
  const c = categoryMap.value[String(s.category_id)];
  return c ? c.name : "";
}

// 消耗记账弹窗（逻辑已抽到 components/ledger/ConsumeSheet.vue）
const showConsume = ref(false);
const activeSticker = ref(null);
function onStickerTap(s) {
  if (!s) return;
  if (s.type === "stock") {
    if (isStickerOut(s)) {
      uni.showToast({ title: "库存为 0，请先补货", icon: "none" });
      return;
    }
    activeSticker.value = s;
    showConsume.value = true;
  } else {
    // 素材：点击预览大图
    uni.previewImage({ urls: [s.image_url], current: s.image_url });
  }
}
// 长按：编辑 / 删除
function onStickerLong(s) {
  if (!s) return;
  uni.showActionSheet({
    itemList: ["编辑", "删除"],
    success: (res) => {
      if (res.tapIndex === 0) {
        uni.navigateTo({ url: `/pages/sticker-lib/sticker-edit?id=${s._id}` });
      } else if (res.tapIndex === 1) {
        confirmDeleteSticker(s);
      }
    },
  });
}
function confirmDeleteSticker(s) {
  uni.showModal({
    title: "删除贴纸",
    content: `确定删除「${s.name}」吗？${
      s.type === "stock" && s.stock_qty > 0 ? "（不会删除已记的消耗记录）" : ""
    }`,
    confirmText: "删除",
    confirmColor: "#ff6b6b",
    success: async (r) => {
      if (!r.confirm) return;
      try {
        await deleteStickerAction(s._id);
        state.stickers = (state.stickers || []).filter((x) => x._id !== s._id);
        uni.showToast({ title: "已删除", icon: "success" });
      } catch (err) {
        uni.showToast({ title: (err && err.message) || "删除失败", icon: "none" });
      }
    },
  });
}
function goStickerCreate(type) {
  uni.navigateTo({
    url: `/pages/sticker-lib/sticker-edit${type ? `?type=${type}` : ""}`,
  });
}

// ===== P0：图表数据全部从 transactions 实时聚合（金额单位为分） =====
function monthKeyOf(offset) {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
// 最近 6 个月（含本月）收支趋势
const monthlyTrend = computed(() => {
  const tx = transactions.value || [];
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const key = monthKeyOf(i);
    const income = tx
      .filter((t) => t.type !== "expense" && t.month_key === key)
      .reduce((s, t) => s + t.amount, 0);
    const expense = tx
      .filter((t) => t.type === "expense" && t.month_key === key)
      .reduce((s, t) => s + t.amount, 0);
    months.push({ month: key.slice(5) + "月", income, expense });
  }
  return months;
});
// 演示用模拟数据（单位：分），仅当真实数据为空时用于直观展示动态效果
const MOCK_TREND = [
  { income: 1850000, expense: 1320000 },
  { income: 2100000, expense: 1460000 },
  { income: 1680000, expense: 1580000 },
  { income: 2450000, expense: 1210000 },
  { income: 2290000, expense: 1750000 },
  { income: 2760000, expense: 1630000 },
];
const trendIsMock = computed(() =>
  monthlyTrend.value.every((m) => !m.income && !m.expense)
);
// 趋势数据：真实为空时退化为模拟数据，保证图表始终有动态效果
const trendData = computed(() => {
  if (trendIsMock.value) {
    return MOCK_TREND.map((m, i) => ({
      month: monthKeyOf(5 - i).slice(5) + "月",
      income: m.income,
      expense: m.expense,
    }));
  }
  return monthlyTrend.value;
});
// 演示用模拟分类数据（单位：元），仅当真实分类数据为空时用于直观预览动态效果
const MOCK_CATS = [
  { id: "c1", name: "餐饮美食", value: 2380, prev: 1980 },
  { id: "c2", name: "交通出行", value: 1560, prev: 1720 },
  { id: "c3", name: "购物消费", value: 3120, prev: 2460 },
  { id: "c4", name: "居家生活", value: 980, prev: 1100 },
  { id: "c5", name: "休闲娱乐", value: 1340, prev: 860 },
  { id: "c6", name: "其他支出", value: 720, prev: 640 },
];
// 当前周期支出按分类聚合（取前 6 类），并附上一周期对比用于环比
const monthExpenseByCat = computed(() => {
  const tx = transactions.value || [];
  if (tx.length === 0) {
    return MOCK_CATS.map((c) => ({
      id: c.id,
      name: c.name,
      value: c.value,
      prev: c.prev,
      mom: c.prev > 0 ? Math.round(((c.value - c.prev) / c.prev) * 100) : null,
    })).sort((a, b) => b.value - a.value);
  }
  const cur = {};
  const prev = {};
  const inPrev = (t) => {
    const dim = repDim.value;
    const key = prevKey.value;
    if (dim === "day") return t.date_key === key;
    if (dim === "month") return t.month_key === key;
    return (t.date_key || "").startsWith(key + "-");
  };
  tx.forEach((t) => {
    if (t.type !== "expense" || !inRepLedger(t)) return;
    const id = t.category_id || "unknown";
    if (inRepPeriod(t)) cur[id] = (cur[id] || 0) + (t.amount || 0);
    else if (inPrev(t)) prev[id] = (prev[id] || 0) + (t.amount || 0);
  });
  const cats = state.categories || [];
  const nameOf = (id) =>
    (cats.find((c) => String(c._id) === String(id)) || {}).name || "其他";
  return Object.keys(cur)
    .map((id) => {
      const value = cur[id];
      const p = prev[id] || 0;
      const mom = p > 0 ? Math.round(((value - p) / p) * 100) : null;
      return { id, name: nameOf(id), value, prev: p, mom };
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);
});
// 分类数据为空时退化为模拟数据（与趋势图一致）
const catIsMock = computed(() => (transactions.value || []).length === 0);

// 取自 uni.scss 淡色档（-1/-2/-3 级）：粉/琥珀/紫/绿/天蓝/红/薄荷
const CAT_PALETTE = [
  "#ffc4dd", // $sj-p2-1 粉
  "#ffe08a", // $sj-y2-1 琥珀
  "#cbb6ff", // $sj-pu2-1 紫
  "#acf5b7", // $sj-g3 绿
  "#bae6fd", // $sj-b2 天蓝
  "#ffc2c2", // $sj-r4 红
  "#c6fbce", // $sj-g2-1 薄荷
];
const maxBar = computed(() =>
  Math.max(1, ...trendData.value.flatMap((m) => [m.income, m.expense]))
);
// 趋势叠加图表：折线 + 面积 + 散点，与柱状图共用同一坐标系（均按 maxBar 归一化）
const TREND_W = 300;
const TREND_H = 240;
const trendChart = computed(() => {
  const data = trendData.value;
  const n = data.length;
  if (!n) return { lineInc: "", lineExp: "", areaInc: "", areaExp: "", points: [] };
  const max = maxBar.value || 1;
  const X = (i) => 14 + (i / (n - 1)) * (TREND_W - 28);
  const Y = (v) => TREND_H - 22 - (v / max) * (TREND_H - 42);
  const incPts = data.map((d, i) => [X(i), Y(d.income)]);
  const expPts = data.map((d, i) => [X(i), Y(d.expense)]);
  const toPath = (pts) =>
    pts
      .map((p, i) =>
        i
          ? `L ${p[0].toFixed(1)} ${p[1].toFixed(1)}`
          : `M ${p[0].toFixed(1)} ${p[1].toFixed(1)}`
      )
      .join(" ");
  const toArea = (pts) =>
    `${toPath(pts)} L ${pts[n - 1][0].toFixed(1)} ${TREND_H} L ${pts[0][0].toFixed(
      1
    )} ${TREND_H} Z`;
  return {
    lineInc: toPath(incPts),
    lineExp: toPath(expPts),
    areaInc: toArea(incPts),
    areaExp: toArea(expPts),
    points: data.map((d, i) => ({
      x: +X(i).toFixed(1),
      yInc: +Y(d.income).toFixed(1),
      yExp: +Y(d.expense).toFixed(1),
      i,
    })),
  };
});
// 散点半径：当前聚焦的数据点放大突出
function trendDotR(i) {
  const on =
    hoverMonthIdx.value === i ||
    (hoverMonthIdx.value === -1 && i === trendChart.value.points.length - 1);
  return on ? 4.8 : 3;
}
const catMax = computed(() =>
  Math.max(1, ...monthExpenseByCat.value.map((c) => c.value))
);

// 柱状图交互高亮（点击/悬停切换）+ 聚焦月份数字滚动
const hoverMonthIdx = ref(-1);
const trendFocusIdx = ref(5); // 默认聚焦最近一个月
const trendFocus = computed(
  () =>
    trendData.value[trendFocusIdx.value] || trendData.value[trendData.value.length - 1]
);
const trendIncUp = createCountUp();
const trendExpUp = createCountUp();
const trendNetUp = createCountUp();
watch(
  () => trendFocus.value,
  (f) => {
    trendIncUp.setTo(f.income);
    trendExpUp.setTo(f.expense);
    trendNetUp.setTo(f.income - f.expense);
  },
  { immediate: true }
);
function onBarTap(idx) {
  hoverMonthIdx.value = hoverMonthIdx.value === idx ? -1 : idx;
  trendFocusIdx.value = idx;
}

// ===== 南丁格尔玫瑰图（动态 SVG 几何：半径映射数值的放射状花瓣） =====
const donut = computed(() => {
  const items = monthExpenseByCat.value;
  const total = items.reduce((s, c) => s + c.value, 0) || 1;
  const cx = 60;
  const cy = 60;
  const R = 53; // 最大花瓣可达半径（viewBox 半径）
  const ir = 9; // 内半径（中心留白放文字）
  const maxVal = Math.max(...items.map((c) => c.value), 1);
  const n = items.length || 1;
  const circ = 2 * Math.PI * R;
  let acc = 0; // 累计占比
  const segs = items.map((c, i) => {
    const frac = c.value / total;
    // 角度跨度：按占比（贴合数据分布，也兼容顶部停靠逻辑）
    const a0 = acc * 2 * Math.PI - Math.PI / 2;
    const a1 = (acc + frac) * 2 * Math.PI - Math.PI / 2;
    // 半径：按数值大小映射（玫瑰图核心：值越大花瓣越长）
    const orr = ir + (c.value / maxVal) * (R - ir);
    const large = a1 - a0 > Math.PI ? 1 : 0;
    const x0o = (cx + orr * Math.cos(a0)).toFixed(3);
    const y0o = (cy + orr * Math.sin(a0)).toFixed(3);
    const x1o = (cx + orr * Math.cos(a1)).toFixed(3);
    const y1o = (cy + orr * Math.sin(a1)).toFixed(3);
    const xi0 = (cx + ir * Math.cos(a0)).toFixed(3);
    const yi0 = (cy + ir * Math.sin(a0)).toFixed(3);
    const xi1 = (cx + ir * Math.cos(a1)).toFixed(3);
    const yi1 = (cy + ir * Math.sin(a1)).toFixed(3);
    // 玫瑰花瓣：从内弧到外弧的楔形（内径 ir -> 外径 orr）
    const path =
      `M ${xi0} ${yi0} ` +
      `L ${x0o} ${y0o} ` +
      `A ${orr} ${orr} 0 ${large} 1 ${x1o} ${y1o} ` +
      `L ${xi1} ${yi1} ` +
      `A ${ir} ${ir} 0 ${large} 0 ${xi0} ${yi0} Z`;
    const seg = {
      id: c.id,
      name: c.name,
      value: c.value,
      pct: Math.round(frac * 100),
      color: CAT_PALETTE[i % CAT_PALETTE.length],
      path,
      orr, // 该花瓣外径，用于标签定位
      ir,
      circ,
      // 扇区中心角（度，相对 12 点顺时针），用于标签/停靠定位
      midDeg: ((acc + frac / 2) * 360) % 360,
      // 扇区起止角（度，相对 12 点顺时针），canvas 绘制弧线用
      startDeg: acc * 360,
      endDeg: (acc + frac) * 360,
      // 面积过小（占比 < 8%）时标签移到环外，避免压字
      small: frac < 0.08,
      idx: i + 1,
      idxStr: String(i + 1).padStart(2, "0"),
    };
    acc += frac;
    return seg;
  });
  return { total, R, ir, circ, segs };
});
const hoverCatIdx = ref(-1);
const lockedCatIdx = ref(-1);
// 当前停在正上方（被突出）的扇形下标
const currentTop = ref(0);
// 是否处于用户锁定（点击卡片 / 点击环）状态，锁定后暂停自动轮播
function onSegTap(i) {
  lockedCatIdx.value = lockedCatIdx.value === i ? -1 : i;
  hoverCatIdx.value = lockedCatIdx.value;
  if (lockedCatIdx.value !== -1) focusSeg(i);
  else resumeAuto();
}
// 悬停联动（点击锁定优先）
function onSegEnter(i) {
  if (lockedCatIdx.value !== i) hoverCatIdx.value = i;
}
function onCatEnter(i) {
  if (lockedCatIdx.value !== i) hoverCatIdx.value = i;
}
function onCatLeave() {
  hoverCatIdx.value = lockedCatIdx.value;
}
function onDonutLeave() {
  pointer.show = false;
  if (lockedCatIdx.value === -1) hoverCatIdx.value = -1;
}
// ===== 饼图持续旋转：每片转到正上方时突出停留片刻，然后继续，依次循环 =====
const spinDeg = ref(0);
let animTimer = null; // 单次缓动旋转
// 兼容环境：小程序无 requestAnimationFrame / performance，用 setTimeout 兜底
const raf =
  typeof requestAnimationFrame === "function"
    ? requestAnimationFrame
    : (cb) => setTimeout(() => cb(Date.now()), 16);
const nowFn = () => (typeof performance !== "undefined" ? performance.now() : Date.now());
// 顶部花瓣"延伸/收回"系数：0=原始半径，1=完全延伸出去
const popExt = ref(0);
let extTimer = null;
function animateExt(to, dur, done) {
  if (extTimer) clearTimeout(extTimer);
  const from = popExt.value;
  const t0 = nowFn();
  function step() {
    const t = nowFn();
    let p = (t - t0) / dur;
    if (p > 1) p = 1;
    const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; // easeInOutQuad
    popExt.value = from + (to - from) * e;
    if (p < 1) {
      extTimer = setTimeout(step, 16);
    } else {
      popExt.value = to;
      if (done) done();
    }
  }
  step();
}
// 延伸半径增量（120 坐标系）：让顶部花瓣明显"伸出去"，且不超过 viewBox（≤60）
const EXT_AMT = 7;
// 计算每片中心相对 12 点方向的顺时针角度（度）
function segCenters() {
  const segs = donut.value.segs;
  const total = donut.value.total || 1;
  let acc = 0;
  return segs.map((s) => {
    const frac = s.value / total;
    const c = acc + frac / 2;
    acc += frac;
    return c * 360; // 度
  });
}
// 缓动旋转到目标角度（角度单调递增，保持连续自转）
function animateTo(to, dur, done) {
  if (animTimer) clearTimeout(animTimer);
  const from = spinDeg.value;
  const t0 = nowFn();
  function step() {
    const t = nowFn();
    let p = (t - t0) / dur;
    if (p > 1) p = 1;
    const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; // easeInOutQuad
    spinDeg.value = from + (to - from) * e;
    if (p < 1) animTimer = setTimeout(step, 16);
    else if (done) done();
  }
  step();
}
// 让第 idx 片中心转到正上方（12 点，内部 -90°）。需要 spinDeg 使
// (-90+spinDeg) + center ≡ -90 (mod 360) => spinDeg ≡ -center (mod 360)
function degForTop(idx) {
  const centers = segCenters();
  const target = ((-centers[idx] % 360) + 360) % 360;
  // 就近顺时针：本圈内目标角大于当前则取本圈（角度差=相邻片夹角，很短），否则下一圈
  const lap = Math.floor(spinDeg.value / 360) * 360;
  let to = lap + target;
  while (to < spinDeg.value + 0.5) to += 360;
  return to;
}
// 自动轮播：逐片停靠式展示，转盘始终顺时针旋转——
// 展示顺序 = midDeg 从大到小（顺时针过顶顺序），每片顺时针转"相邻差"即可到位，
// 收回后下一片立刻衔接，无需等一整圈。
let autoIdx = 0; // 展示顺序索引（对应 showOrder 数组）
let showing = false; // 是否正处于"旋转到位/延伸/停留/收回"展示流程中
let autoChain = null; // 展示流程定时器
let showOrder = []; // 按 midDeg 降序排列的片索引（顺时针到达顶部的顺序）
const SHOW_MS = { rot: 900, ext: 600, hold: 2000, ret: 600, gap: 150 };
function rebuildShowOrder() {
  const segs = donut.value.segs;
  const n = segs.length;
  showOrder = [];
  for (let i = 0; i < n; i++) showOrder.push(i);
  // midDeg 大的片屏幕角大，顺时针旋转时先过顶 → 降序
  showOrder.sort((a, b) => segs[b].midDeg - segs[a].midDeg);
}
function startAuto() {
  stopShowChain();
  autoIdx = 0;
  showing = false;
  popExt.value = 0;
  const segs = donut.value.segs;
  if (!segs.length) return;
  rebuildShowOrder();
  // 对齐首片（midDeg 最大者）到顶部，开局即展示
  const first = showOrder[0];
  spinDeg.value = degForTop(first);
  nextShow();
}
function stopShowChain() {
  if (autoChain) {
    clearTimeout(autoChain);
    autoChain = null;
  }
  showing = false;
}
// 恢复自动轮播：从头开始（转盘保持顺时针）
function resumeAuto() {
  if (lockedCatIdx.value === -1) startAuto();
}
// 展示下一片：就近转位到顶部（最短距离 ≤180°，顺/逆自动选），然后延伸→停留→收回
function nextShow() {
  if (showing) return;
  if (lockedCatIdx.value !== -1 || hoverCatIdx.value !== -1) return;
  const segs = donut.value.segs;
  const n = segs.length;
  if (!n) return;
  const idx = showOrder[autoIdx % n];
  showing = true;
  currentTop.value = idx;
  const arrive = () => {
    // 延伸出去
    animateExt(1, SHOW_MS.ext, () => {
      // 停留
      autoChain = setTimeout(() => {
        // 收回
        animateExt(0, SHOW_MS.ret, () => {
          showing = false;
          autoIdx++;
          // 小间隔后立即下一片（顺时针相邻差，转位很短）
          autoChain = setTimeout(nextShow, SHOW_MS.gap);
        });
      }, SHOW_MS.hold);
    });
  };
  const target = degForTop(idx); // 顺时针（角度增大）转到该片到顶
  if (Math.abs(target - spinDeg.value) < 0.5) arrive();
  // 已在顶部，直接展示
  else animateTo(target, SHOW_MS.rot, arrive); // 顺时针转位到顶部
}
// 悬停某片：打断展示流程，让该片延伸出去提亮；移开（且未锁定）收回并重新开始
watch(hoverCatIdx, (nv) => {
  if (nv !== -1) {
    stopShowChain();
    animateExt(1, 400);
  } else if (lockedCatIdx.value === -1) {
    animateExt(0, 400);
    resumeAuto();
  }
});
// 点击卡片/环：对应扇形顺时针转到正上方（degForTop 保证角度增大=顺时针），再延伸突出
function focusSeg(i) {
  const segs = donut.value.segs;
  if (!segs.length) return;
  currentTop.value = i;
  const target = degForTop(i);
  if (Math.abs(target - spinDeg.value) < 0.5) animateExt(1, 500);
  else
    animateTo(target, 900, () => {
      animateExt(1, 500);
    });
}
// 点击环：切换锁定到随机一片（保留命运轮盘趣味）
function onRingSpin() {
  const n = donut.value.segs.length;
  if (!n) return;
  const target = Math.floor(Math.random() * n);
  lockedCatIdx.value = target;
  hoverCatIdx.value = target;
  focusSeg(target);
}

// ===== 玫瑰图 canvas 绘制（微信小程序不支持内联 svg，改用 2d canvas）=====
// 适配小程序/H5：优先用 Canvas 2D 节点，回退到旧接口（仅 H5 兼容保留）
let roseCtx = null;
let roseCanvas = null;
let roseDpr = 1;
let roseSizeCss = 120; // 逻辑尺寸（与旧 viewBox 一致）
let roseLeft = 0; // canvas 相对视口左/上（命中测试用）
let roseTop = 0;
let roseReady = false;

function initRoseCanvas() {
  // #ifdef H5
  const el = document.getElementById("roseCanvas");
  if (el) {
    roseDpr = window.devicePixelRatio || 1;
    const rect = el.getBoundingClientRect();
    roseSizeCss = rect.width || 120;
    roseLeft = rect.left;
    roseTop = rect.top;
    el.width = roseSizeCss * roseDpr;
    el.height = roseSizeCss * roseDpr;
    roseCtx = el.getContext("2d");
    roseCanvas = el;
    roseReady = true;
    drawRose();
  }
  // #endif
  // #ifndef H5
  uni
    .createSelectorQuery()
    .in(instance ? instance.proxy : null)
    .select("#roseCanvas")
    .fields({ node: true, size: true, rect: true })
    .exec((res) => {
      if (!res || !res[0] || !res[0].node) return;
      const canvas = res[0].node;
      roseDpr = uni.getWindowInfo
        ? uni.getWindowInfo().pixelRatio
        : uni.getSystemInfoSync().pixelRatio || 1;
      roseSizeCss = res[0].width || 120;
      roseLeft = res[0].left || 0;
      roseTop = res[0].top || 0;
      canvas.width = roseSizeCss * roseDpr;
      canvas.height = roseSizeCss * roseDpr;
      roseCtx = canvas.getContext("2d");
      roseCanvas = canvas;
      roseReady = true;
      drawRose();
    });
  // #endif
}

// 角度换算：12 点方向为 0、顺时针为正 → canvas 角度（3 点方向为 0、顺时针为正）
function toCanvasAng(deg) {
  return ((deg - 90) * Math.PI) / 180;
}

// 颜色 → 半透明 rgba（用于发光/叠层）
function withAlpha(hex, a) {
  let h = String(hex || "#7dd3fc").replace("#", "");
  if (h.length === 3)
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  const n = parseInt(h, 16);
  if (Number.isNaN(n)) return "rgba(125,211,252," + a + ")";
  return (
    "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")"
  );
}
// 淡色 → 深一档（混入黑色，供白天标签文字/描边保证可读性）
function darken(hex, t) {
  let h = String(hex || "#7dd3fc").replace("#", "");
  if (h.length === 3)
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  const n = parseInt(h, 16);
  if (Number.isNaN(n)) return "rgb(27,58,41)";
  const f = Math.max(0, Math.min(1, t));
  return (
    "rgb(" +
    Math.round(((n >> 16) & 255) * (1 - f)) +
    "," +
    Math.round(((n >> 8) & 255) * (1 - f)) +
    "," +
    Math.round((n & 255) * (1 - f)) +
    ")"
  );
}
// 圆环上某角度（度，12 点为 0 顺时针）的点坐标
function ptOnRing(deg, r, cx, cy) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function drawRose() {
  if (!roseReady || !roseCtx) return;
  const ctx = roseCtx;
  const S = roseSizeCss;
  const k = S / 138; // 138 逻辑坐标系（中心 69，四周留白放标签）→ 实际像素
  ctx.save();
  ctx.scale(roseDpr, roseDpr);
  ctx.clearRect(0, 0, S, S);
  ctx.scale(k, k); // 之后用 138 单位坐标绘制
  const cx = 69,
    cy = 69;
  const segs = (donut.value && donut.value.segs) || [];

  // ===== 科技感底盘：刻度环 + 内圈细环（始终在花瓣之下）=====
  drawTechBase(ctx, cx, cy);

  if (!segs.length) {
    ctx.restore();
    return;
  }
  // 整体旋转
  ctx.translate(cx, cy);
  ctx.rotate((spinDeg.value * Math.PI) / 180);
  ctx.translate(-cx, -cy);

  const popped = computedPopped();
  const hov = hoverCatIdx.value;
  segs.forEach((s, i) => {
    const a0 = toCanvasAng(s.startDeg);
    const a1 = toCanvasAng(s.endDeg);
    const isPop = popped && popped.id === s.id;
    const isHov = hov === i;
    const dim = hov !== -1 && hov !== i && !isPop;
    const ir = s.ir || 9;
    const orr = s.orr || 50;
    // 当前活动（顶部/悬停/锁定）花瓣延伸出去，呈现"伸出去"动效
    const orrDraw = orr + (isPop || isHov ? popExt.value * EXT_AMT : 0);
    const act = isPop || isHov;

    // 发光外晕（活动片更亮）
    if (act) {
      ctx.save();
      ctx.shadowColor = withAlpha(s.color, 0.9);
      ctx.shadowBlur = 10 * (1 + popExt.value);
      ctx.beginPath();
      ctx.arc(cx, cy, ir, a0, a1, false);
      ctx.arc(cx, cy, orrDraw + 1.5, a1, a0, true);
      ctx.closePath();
      ctx.fillStyle = withAlpha(s.color, 0.35);
      ctx.fill();
      ctx.restore();
    }

    // 花瓣主体：径向渐变（中心高光 → 彩色）
    const g = ctx.createRadialGradient(cx, cy, ir, cx, cy, orrDraw);
    g.addColorStop(0, withAlpha(s.color, 0.95));
    g.addColorStop(0.55, withAlpha(s.color, 0.78));
    g.addColorStop(1, withAlpha(s.color, dim ? 0.3 : 0.55));
    ctx.beginPath();
    ctx.arc(cx, cy, ir, a0, a1, false);
    ctx.arc(cx, cy, orrDraw, a1, a0, true);
    ctx.closePath();
    ctx.fillStyle = g;
    ctx.globalAlpha = dim ? 0.45 : 1;
    ctx.fill();
    ctx.globalAlpha = 1;

    // 科技描边：内亮线 + 外细线
    ctx.lineWidth = act ? 1.8 : 0.9;
    ctx.strokeStyle = withAlpha(s.color, act ? 1 : 0.6);
    ctx.stroke();
    // 内弧亮线（花瓣高光）
    ctx.beginPath();
    ctx.arc(cx, cy, ir, a0, a1, false);
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = 0.7;
    ctx.stroke();

    // 顶角小光点（花瓣最外端）
    const tip = ptOnRing(s.midDeg, orrDraw - 1, cx, cy);
    ctx.beginPath();
    ctx.arc(tip.x, tip.y, act ? 1.6 : 0.8, 0, Math.PI * 2);
    ctx.fillStyle = withAlpha("#ffffff", act ? 1 : 0.55);
    ctx.fill();
  });
  ctx.restore();

  // 顶部指针（发光三角 + 光点），叠加在最上层
  drawTechPointer(ctx, cx, cy);

  // 突出扇形标签（不随旋转，固定在正确方位）
  if (popped) {
    drawRoseTip(popped);
  }
}

// 科技感底盘：刻度环 + 细环 + 中心微光
function drawTechBase(ctx, cx, cy) {
  // 内圈细环
  ctx.beginPath();
  ctx.arc(cx, cy, 9.5, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(15,61,38,0.22)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, 7.5, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(15,61,38,0.1)";
  ctx.lineWidth = 0.6;
  ctx.stroke();
  // 中心微光点
  const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 10);
  cg.addColorStop(0, "rgba(255,255,255,0.55)");
  cg.addColorStop(0.6, "rgba(255,255,255,0.08)");
  cg.addColorStop(1, "rgba(255,255,255,0)");
  ctx.beginPath();
  ctx.arc(cx, cy, 10, 0, Math.PI * 2);
  ctx.fillStyle = cg;
  ctx.fill();
}

// 顶部指针：发光三角 + 光点（指向当前顶部）
function drawTechPointer(ctx, cx, cy) {
  const tip = ptOnRing(0, 60, cx, cy);
  // 光点
  const pg = ctx.createRadialGradient(tip.x, tip.y, 0, tip.x, tip.y, 4);
  pg.addColorStop(0, "rgba(15,61,38,0.5)");
  pg.addColorStop(1, "rgba(15,61,38,0)");
  ctx.beginPath();
  ctx.arc(tip.x, tip.y, 4, 0, Math.PI * 2);
  ctx.fillStyle = pg;
  ctx.fill();
  // 小三角（向下指向盘面）
  ctx.beginPath();
  ctx.moveTo(tip.x - 3, tip.y - 6);
  ctx.lineTo(tip.x + 3, tip.y - 6);
  ctx.lineTo(tip.x, tip.y - 1.5);
  ctx.closePath();
  ctx.fillStyle = "rgba(15,61,38,0.55)";
  ctx.fill();
}

function drawRoseTip(s) {
  const ctx = roseCtx;
  const S = roseSizeCss;
  const k = S / 138;
  ctx.save();
  ctx.scale(roseDpr, roseDpr);
  ctx.scale(k, k);
  // 标签跟随旋转：以当前屏幕角度（midDeg + 整体旋转）落位，使突出花瓣的标签停在其顶部
  const mid = s.midDeg + spinDeg.value;
  const rad = (mid * Math.PI) / 180;
  const outer = (s.orr || 50) + popExt.value * EXT_AMT;
  // 整体透明度跟随延伸系数：收回时渐隐、下一片延伸时渐现
  ctx.globalAlpha = Math.max(0, Math.min(1, popExt.value));
  // 文字测量
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "bold 9px sans-serif";
  const pctW = ctx.measureText(s.pct + "%").width;
  const nameW = ctx.measureText(s.name).width;
  const valW = ctx.measureText("¥" + fmt(s.value)).width;
  const w = Math.max(pctW, nameW, valW) + 12;
  const h = 22;
  // 标签中心放在花瓣尖端外侧（+16 留白），并夹紧保证胶囊整体不出画布
  const halfW = w / 2 + 2;
  const halfH = h / 2 + 2;
  let r = Math.max(38, Math.min(58, outer + 16));
  for (let rr = r; rr >= 36; rr -= 2) {
    const tx = 69 + rr * Math.sin(rad);
    const ty = 69 - rr * Math.cos(rad);
    if (tx - halfW >= 0 && tx + halfW <= 138 && ty - halfH >= 0 && ty + halfH <= 138) {
      r = rr;
      break;
    }
  }
  const x = 69 + r * Math.sin(rad);
  const y = 69 - r * Math.cos(rad);
  ctx.save();
  ctx.translate(x, y);
  // 白色毛玻璃主体：更透（上亮下透）
  const bg = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
  bg.addColorStop(0, "rgba(255,255,255,0.38)");
  bg.addColorStop(0.55, "rgba(255,255,255,0.28)");
  bg.addColorStop(1, "rgba(255,255,255,0.12)");
  ctx.beginPath();
  ctx.roundRect
    ? ctx.roundRect(-w / 2, -h / 2, w, h, 10)
    : ctx.rect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = bg;
  ctx.fill();
  // 顶部内高光（毛玻璃反光）
  ctx.beginPath();
  ctx.roundRect
    ? ctx.roundRect(-w / 2 + 1, -h / 2 + 1, w - 2, 5, 9)
    : ctx.rect(-w / 2 + 1, -h / 2 + 1, w - 2, 5);
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.fill();
  // 淡色细边框（带轻微辉光）
  ctx.shadowColor = withAlpha(s.color, 0.8);
  ctx.shadowBlur = 5;
  ctx.lineWidth = 1;
  ctx.strokeStyle = withAlpha(s.color, 0.6);
  ctx.beginPath();
  ctx.roundRect
    ? ctx.roundRect(-w / 2, -h / 2, w, h, 10)
    : ctx.rect(-w / 2, -h / 2, w, h);
  ctx.stroke();
  ctx.shadowBlur = 0;
  // 文字（白天墨色，标题用该片深一档淡色）
  ctx.fillStyle = darken(s.color, 0.35);
  ctx.font = "bold 9px sans-serif";
  ctx.fillText(s.pct + "%", 0, -5.5);
  ctx.fillStyle = "rgba(15,28,20,0.92)";
  ctx.font = "bold 8px sans-serif";
  ctx.fillText(s.name, 0, 1.5);
  ctx.fillStyle = "rgba(15,28,20,0.6)";
  ctx.font = "bold 8px sans-serif";
  ctx.fillText("¥" + fmt(s.value), 0, 8.5);
  ctx.restore();
  ctx.globalAlpha = 1;
  ctx.restore();
}

// 取当前"突出"扇区：hover > lock > 自动停靠
function computedPopped() {
  const segs = (donut.value && donut.value.segs) || [];
  if (!segs.length) return null;
  const i = hoverCatIdx.value !== -1 ? hoverCatIdx.value : lockedCatIdx.value;
  if (i !== -1 && segs[i]) return segs[i];
  return segs[currentTop.value] || segs[0];
}

// 命中测试：把触摸坐标映射到扇区（考虑当前旋转角）
function onRoseTouch(e) {
  if (!roseReady || !roseCtx) return;
  const t =
    e.touches && e.touches[0] ? e.touches[0] : e.changedTouches && e.changedTouches[0];
  if (!t) return;
  // 统一用初始化时记录的 canvas 视口位置 + 当前触摸点（相对页面）
  // 转成 138 坐标系（与绘制一致）
  const tx = (t.clientX !== undefined ? t.clientX : t.x) - roseLeft;
  const ty = (t.clientY !== undefined ? t.clientY : t.y) - roseTop;
  const px = (tx / roseSizeCss) * 138;
  const py = (ty / roseSizeCss) * 138;
  const dx = px - 69,
    dy = py - 69;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 9) {
    // 点击中心：交给 onRingSpin（命运轮盘）
    if (e.type === "touchstart" || !e.touches) onRingSpin();
    return;
  }
  // 反算角度（抵消 spinDeg 旋转），得到原始扇区角
  let ang = (Math.atan2(dx, -dy) * 180) / Math.PI; // 12 点为 0，顺时针
  if (ang < 0) ang += 360;
  const localAng = (ang - spinDeg.value) % 360;
  const segs = donut.value.segs;
  for (let i = 0; i < segs.length; i++) {
    let s0 = segs[i].startDeg % 360,
      s1 = segs[i].endDeg % 360;
    if (s1 < s0) s1 += 360;
    let la = localAng;
    if (la < s0) la += 360;
    if (la >= s0 && la < s1 && dist <= (segs[i].orr || 50)) {
      hoverCatIdx.value = i;
      if (e.type === "touchend" || (e.changedTouches && !e.touches)) onSegTap(i);
      return;
    }
  }
}
function onRoseTouchEnd(e) {
  // 松手后若未锁定，恢复自动轮播的 hover 状态
  if (lockedCatIdx.value === -1) hoverCatIdx.value = -1;
}

// 持续渲染循环：每帧重绘（旋转/延伸/收回均由 animateTo/animateExt 状态机驱动）
let roseLoopRunning = false;
function startRoseLoop() {
  if (roseLoopRunning) return;
  roseLoopRunning = true;
  const tick = () => {
    if (!roseLoopRunning) return;
    drawRose();
    raf(tick);
  };
  raf(tick);
}
function stopRoseLoop() {
  roseLoopRunning = false;
}
// 数据/交互变化时立即重绘（循环也会持续重绘，这里确保首屏与切换即时刷新）
watch(
  () => [
    donut.value.total,
    hoverCatIdx.value,
    lockedCatIdx.value,
    currentTop.value,
    spinDeg.value,
  ],
  () => {
    if (roseReady) drawRose();
  }
);

// 环形图中心总额数字滚动
const donutUp = createCountUp();
watch(
  () => donut.value.total,
  (t) => donutUp.setTo(t),
  { immediate: true }
);

// 指针跟随光晕（鼠标/触摸）
const pointer = reactive({ show: false, x: 0, y: 0, color: "#25cc5d" });
function onDonutMove(e) {
  const t = e.touches ? e.touches[0] : e;
  const info = (e.currentTarget || {}).getBoundingClientRect
    ? e.currentTarget.getBoundingClientRect()
    : null;
  const w = info ? info.width : 240;
  const h = info ? info.height : 240;
  pointer.x = ((t.clientX - (info ? info.left : 0)) / w) * 240;
  pointer.y = ((t.clientY - (info ? info.top : 0)) / h) * 240;
  // 取指针附近扇区颜色作为光晕色
  const seg = donut.value.segs[hoverCatIdx.value] || donut.value.segs[0];
  pointer.color = seg ? seg.color : "#25cc5d";
  pointer.show = true;
}
function onCatCardMove(e) {
  // 仅维持卡片级光晕，避免频繁重置 donut 指针
  if (!e.touches && pointer.show === false) return;
}

// 旋转光环视差：随指针轻微偏移
const haloStyle = computed(() => {
  const dx = pointer.show ? (pointer.x - 120) * 0.04 : 0;
  const dy = pointer.show ? (pointer.y - 120) * 0.04 : 0;
  return { transform: `translate(${dx}rpx, ${dy}rpx)` };
});
// 饼图旋转：完全由 :transform="rotate(spinDeg)" 驱动（spinDeg 每帧平滑更新），
// 不再用 CSS animation 覆盖 transform（否则会清掉旋转且以错误原点缩放导致图消失）
const ringSpin = computed(() => ({}));
// 突出扇形标签定位：朝向该扇区中心，按花瓣半径落位，小扇形外移到环外
const tipStyle = computed(() => {
  const s = popped.value;
  if (!s) return {};
  const mid = s.midDeg; // 0 = 12 点
  const rad = (mid * Math.PI) / 180;
  const inner = s.ir || 9;
  const outer = s.orr || 50;
  // 普通花瓣：标签落在花瓣中部偏外；小花瓣：移到最大半径之外
  const r = s.small ? 72 : inner + (outer - inner) * 0.7;
  const x = 60 + r * Math.sin(rad);
  const y = 60 - r * Math.cos(rad);
  return { transform: `translate(${x}px, ${y}px)` };
});

const cash = computed(() => (state.assetTotals ? state.assetTotals.disposable : 0));
const invest = computed(() => (state.assetTotals ? state.assetTotals.investment : 0));
const total = computed(() => (state.assetTotals ? state.assetTotals.full : 0));
const net = computed(() => (state.assetTotals ? state.assetTotals.net : 0));
const liab = computed(() => (state.assetTotals ? state.assetTotals.liabilities : 0));
const investGain = computed(() => (state.assetTotals ? state.assetTotals.investGain : 0));
const assetDisplay = computed(() =>
  assetMode.value === "disposable"
    ? cash.value
    : assetMode.value === "withInvest"
    ? cash.value + invest.value
    : net.value
);
// 资产卡数字滚动联动：必须在 net/cash/invest/liab 定义之后注册（immediate 会立即求值）
watch(
  () => net.value,
  (v) => assetNet.setTo(v),
  { immediate: true }
);
watch(
  () => cash.value,
  (v) => assetCash.setTo(v),
  { immediate: true }
);
watch(
  () => invest.value,
  (v) => assetInvest.setTo(v),
  { immediate: true }
);
watch(
  () => liab.value,
  (v) => assetLiab.setTo(v),
  { immediate: true }
);
watch(
  () =>
    assetFocus.value === "net"
      ? 0
      : accountDist.value.find((g) => g.key === assetFocus.value)?.value || 0,
  (v) => assetSub.setTo(v),
  { immediate: true }
);

async function loadData() {
  const uid = state.uid;
  console.log("[ledger][loadData] called, uid =", JSON.stringify(uid));
  if (!uid) {
    console.warn("[ledger][loadData] uid 为空，跳过加载");
    return;
  }
  try {
    // 走云函数读取，禁止前端直连数据库
    const [ledgerData, txData] = await Promise.all([
      listLedgers(),
      listTransactions({}),
      userStore.loadCategories().catch(() => []),
    ]);
    console.log("[ledger][loadData] 账本接口响应长度 =", ledgerData.length);
    console.log("[ledger][loadData] 交易接口响应长度 =", txData.length);

    // JS 端过滤软删（deleted_at 为空/未设置的才是有效账本）
    let list = ledgerData.filter((l) => !l.deleted_at);
    console.log("[ledger][loadData] 过滤软删后有效账本数 =", list.length);
    const hasMaster = list.some((l) => l.is_system);
    console.log(
      "[ledger][loadData] 响应中是否含总账本(is_system) =",
      hasMaster,
      "各账本 is_system =",
      JSON.stringify(list.map((l) => ({ name: l.name, is_system: !!l.is_system })))
    );

    if (!hasMaster) {
      console.log(
        "[ledger][loadData] 未检测到总账本，尝试 ensureMasterLedger() 兜底创建"
      );
      try {
        const master = await ensureMasterLedger();
        console.log(
          "[ledger][loadData] ensureMasterLedger 返回 =",
          JSON.stringify(master)
        );
        list.unshift(master);
      } catch (err) {
        // 总账本统一由 ensureMasterLedger 云函数创建，前端不再直写数据库
        console.error("[ledger][loadData] ensure master ledger failed", err);
      }
    } else {
      console.log("[ledger][loadData] 总账本已存在，无需创建");
    }
    // 总账本始终置顶，其余按 sort_order 升序
    list.sort((a, b) => {
      if (a.is_system && !b.is_system) return -1;
      if (!a.is_system && b.is_system) return 1;
      return (a.sort_order || 0) - (b.sort_order || 0);
    });
    console.log(
      "[ledger][loadData] 最终渲染列表长度 =",
      list.length,
      "顺序 =",
      JSON.stringify(list.map((l) => ({ name: l.name, is_system: !!l.is_system })))
    );
    ledgers.value = list;
    transactions.value = txData;
    // 预解析云存储封面（用户上传，存 cloud:// fileID）为临时访问 URL。
    // 同时解析 3:4 版本 cover34 与 4:3 主封面 cover，按 fileID 存入 coverUrlMap 供 coverDisplay 取用
    const cloudCovers = list
      .flatMap((l) => [l.cover, l.cover34])
      .filter((x) => x && String(x).startsWith("cloud://"));
    if (cloudCovers.length) {
      const map = await getCloudTempUrls(cloudCovers);
      for (const f of cloudCovers) {
        if (map[f]) coverUrlMap[f] = map[f];
      }
    }
    if (list.length === 0) {
      console.warn(
        "[ledger][loadData] ⚠️ 最终列表仍为空：请确认已登录（非游客）且 ensureMasterLedger 或前端直写成功，详见上方日志"
      );
    }
    await userStore.loadAssetAccounts().catch(() => {});
  } catch (err) {
    console.error("[ledger][loadData] load failed", err);
  }
}

// 顶部安全区：避开微信小程序右上角原生胶囊按钮（与 index/TopBar 一致）
function resolveTopPadding() {
  try {
    const menuButton = uni.getMenuButtonBoundingClientRect();
    if (menuButton?.bottom > 0) {
      const gap = uni.upx2px(16);
      return `${menuButton.bottom + gap}px`;
    }
  } catch (_) {}
  const { statusBarHeight = 0 } = uni.getSystemInfoSync();
  return `${statusBarHeight + uni.upx2px(88)}px`;
}
const pagePaddingTop = ref(resolveTopPadding());

// 会话恢复是异步云调用，页面挂载时 uid 可能尚未就绪；
// 因此除首次挂载外，还在「会话就绪」与「每次进入 tab」时重新加载，
// 避免列表因竞态而永远为空、总账本永远不被创建。
function onSessionReady() {
  if (state.uid) loadData();
}

onMounted(() => {
  pagePaddingTop.value = resolveTopPadding();
  if (state.uid) loadData();
  uni.$on("sparejar-session-ready", onSessionReady);
  // 初始化玫瑰图 canvas，并启动持续渲染（旋转/呼吸/交互都靠它）
  nextTick(() => {
    initRoseCanvas();
    startRoseLoop();
  });
});

// 突出显示的扇形（停在正上方 / 被锁定 / 被悬停优先）
const popped = computed(() => {
  const segs = donut.value.segs;
  if (!segs.length) return null;
  let idx = currentTop.value;
  if (hoverCatIdx.value !== -1) idx = hoverCatIdx.value;
  else if (lockedCatIdx.value !== -1) idx = lockedCatIdx.value;
  return segs[idx] || null;
});

// 饼图自动轮播（旋转 -> 顶部停留 -> 下一片）
nextTick(() => {
  if (donut.value.segs.length) startAuto();
});
watch(
  () => donut.value.segs.length,
  (n) => {
    if (n) startAuto();
  }
);

onShow(() => {
  // 双保险：即便绕过 TabBar 拦截直接进入账本页，未登录也重定向到登录页
  if (!checkLoggedIn()) {
    uni.showToast({ title: "请先登录后查看账本", icon: "none" });
    uni.navigateTo({
      url: "/pages/login/login?redirect=" + encodeURIComponent("/pages/ledger/ledger"),
    });
    return;
  }
  if (state.uid) {
    loadData();
    loadStickers().catch(() => {});
  }
  // 从贴纸库等页面返回时，滑块复位到当前内容 Tab
  sliderIndex.value = Math.max(
    0,
    PAGE_TABS.findIndex((t) => t.key === pageTab.value)
  );
});

onUnmounted(() => {
  uni.$off("sparejar-session-ready", onSessionReady);
  stopRoseLoop();
  stopShowChain();
});

const openLedgerSheet = (l) => {
  uni.navigateTo({ url: `/pages/ledger-detail/ledger-detail?id=${l._id}` });
};
const goAssetMgr = () => uni.navigateTo({ url: "/pages/asset-mgr/asset-mgr" });
const goAddAsset = openAddAssetSheet;

// ===== 添加资产账户（本页直接弹窗，逻辑与 asset-mgr 一致） =====
// 账户类型选项（含子类型 + 默认计入规则）
const ASSET_CLASS_OPTIONS = [
  { value: "daily", label: "日常账户" },
  { value: "liability", label: "负债账户" },
  { value: "investment", label: "投资账户" },
  { value: "special", label: "专用账户" },
];
const SUBTYPES = {
  daily: [
    { v: "wechat", label: "微信" },
    { v: "alipay", label: "支付宝" },
    { v: "bank_card", label: "银行卡" },
    { v: "cash", label: "现金" },
    { v: "other", label: "其他" },
  ],
  liability: [
    { v: "huabei", label: "花呗" },
    { v: "credit_card", label: "信用卡" },
    { v: "jdbt", label: "京东白条" },
    { v: "loan", label: "借款" },
    { v: "other", label: "其他" },
  ],
  investment: [
    { v: "fund", label: "基金" },
    { v: "stock", label: "股票" },
    { v: "bond", label: "债券" },
    { v: "gold", label: "黄金" },
    { v: "other", label: "其他" },
  ],
  special: [
    { v: "provident_fund", label: "公积金" },
    { v: "insurance", label: "医保" },
    { v: "other", label: "其他" },
  ],
};
const ASSET_CLASS_DEFAULTS = {
  daily: { d: true, l: true, t: true },
  special: { d: false, l: false, t: false },
  investment: { d: false, l: false, t: false },
  liability: { d: false, l: false, t: false },
};
const showAssetSheet = ref(false);
const assetForm = reactive({
  name: "",
  account_class: "daily",
  account_subtype: "wechat",
  subtype_name: "",
  balance: "",
  include_in_disposable: true,
  include_in_daily_limit: true,
  daily_limit: "",
  note: "",
  include_in_total_asset: true,
  iconFileID: "",
});
const assetSubtypes = computed(() => SUBTYPES[assetForm.account_class] || []);
function classDefaults(c) {
  return ASSET_CLASS_DEFAULTS[c] || { d: true, l: true, t: true };
}
function resetAssetForm() {
  assetForm.name = "";
  assetForm.account_class = "daily";
  assetForm.account_subtype = "wechat";
  assetForm.subtype_name = "";
  assetForm.balance = "";
  assetForm.include_in_disposable = true;
  assetForm.include_in_daily_limit = true;
  assetForm.daily_limit = "";
  assetForm.note = "";
  assetForm.include_in_total_asset = true;
  assetForm.iconFileID = "";
}
function openAddAssetSheet() {
  resetAssetForm();
  showAssetSheet.value = true;
}
// 选择并上传自定义账户图标（落库云存储 fileID）
const uploadingAssetIcon = ref(false);
const assetIconUrl = ref("");
async function pickAssetIcon() {
  if (uploadingAssetIcon.value) return;
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
  uploadingAssetIcon.value = true;
  uni.showLoading({ title: "上传中...", mask: true });
  try {
    const up = await uploadAssetIcon(imgPath);
    assetForm.iconFileID = up.fileID;
    assetIconUrl.value = await getCloudTempUrl(up.fileID);
    uni.hideLoading();
  } catch (e) {
    uni.hideLoading();
    uni.showToast({ title: "图标上传失败", icon: "none" });
  } finally {
    uploadingAssetIcon.value = false;
  }
}
function clearAssetIcon() {
  assetForm.iconFileID = "";
  assetIconUrl.value = "";
}
function onAssetClassChange() {
  const subs = SUBTYPES[assetForm.account_class] || [];
  assetForm.account_subtype = subs.length ? subs[0].v : "";
  assetForm.subtype_name = "";
  const def = classDefaults(assetForm.account_class);
  assetForm.include_in_disposable = def.d;
  assetForm.include_in_daily_limit = def.l;
  assetForm.include_in_total_asset = def.t;
}
const savingAsset = ref(false);
async function saveAssetAccount() {
  const name = (assetForm.name || "").trim();
  if (!name) return uni.showToast({ title: "请输入账户名称", icon: "none" });
  if (!assetForm.account_subtype)
    return uni.showToast({ title: "请选择子类", icon: "none" });
  savingAsset.value = true;
  try {
    const payload = {
      name,
      account_class: assetForm.account_class,
      account_subtype: assetForm.account_subtype,
      subtype_name: assetForm.subtype_name || undefined,
      initial_balance: safeYuanToFen(assetForm.balance || "0").value,
      include_in_disposable: !!assetForm.include_in_disposable,
      daily_limit_fen: assetForm.daily_limit
        ? safeYuanToFen(assetForm.daily_limit).value
        : undefined,
      note: assetForm.note || undefined,
      include_in_total_asset: !!assetForm.include_in_total_asset,
      icon: assetForm.iconFileID || undefined,
    };
    await createAssetAccountAction(payload);
    uni.showToast({ title: "创建成功", icon: "success" });
    showAssetSheet.value = false;
  } catch (e) {
    console.error("创建资产账户失败", e);
    uni.showToast({ title: e?.message || "创建失败", icon: "none" });
  } finally {
    savingAsset.value = false;
  }
}

// ===== 截图建账（FR-2.2 / FR-2.3，与 asset-mgr 一致） =====
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
    const classDefaults = {
      daily: { d: true, l: true, t: true },
      special: { d: true, l: false, t: true },
      investment: { d: false, l: false, t: true },
      liability: { d: false, l: false, t: false },
    }[ic] || { d: true, l: true, t: true };

    // FR-2.3：若已存在同名账户，直接并入（入金到已有账户），不新建
    const existing = (userStore.state.assets || []).find(
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
              showAssetSheet.value = false;
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
  Object.assign(assetForm, {
    name: r.account_name || "",
    account_class: ic,
    account_subtype: sub,
    subtype_name: "",
    balance: r.balance_fen ? fenToYuanString(r.balance_fen) : "",
    include_in_disposable: classDefaults.d,
    include_in_daily_limit: classDefaults.l,
    include_in_total_asset: classDefaults.t,
    daily_limit: "",
    note: "",
    iconFileID: "",
  });
  showAssetSheet.value = true;
  uni.showToast({ title: "已识别，请确认", icon: "none" });
}

// ===== 成员管理（用户级全局成员 + 账本关联） =====
// 从账本列表页进入，管理成员与「主账本」的关联。
const showMemberMgr = ref(false);
const memberMgrLedgerId = ref("");
const memberMgrLedgerName = ref("");

function getMasterLedger() {
  const id = userStore.state.defaultLedgerId;
  if (id) {
    const l = ledgers.value.find((x) => x._id === id);
    if (l) return l;
  }
  return ledgers.value[0] || null;
}

async function loadMemberMgrMembers() {
  const l = getMasterLedger();
  if (!l) return;
  memberMgrLedgerId.value = l._id;
  memberMgrLedgerName.value = l.name || "账本";
}

async function openMemberMgr() {
  await loadMemberMgrMembers();
  showMemberMgr.value = true;
}
const goAssetDetail = (a) =>
  uni.navigateTo({ url: `/pages/asset-detail/asset-detail?id=${a._id}` });
const goStickerLib = (type) =>
  uni.navigateTo({ url: `/pages/sticker-lib/sticker-lib${type ? `?type=${type}` : ""}` });

/** 顶部 Tab 切换：全部内容在本页内切换（贴纸不再跳独立页）。 */
function switchTab(key) {
  // 先把滑块滑到目标项，再切换内容
  const idx = PAGE_TABS.findIndex((t) => t.key === key);
  if (idx >= 0) sliderIndex.value = idx;
  pageTab.value = key;
}

// 编辑账本：目标账本交给 EditLedgerDialog 组件加载（含封面云存储解析等），主页面仅传引用
function openEdit(l) {
  editTarget.value = l;
  showEdit.value = true;
}

// 卡片点击：多选态为勾选，否则进账本；若菜单已展开则先收起菜单；长按后抑制紧随的点击以免误开
let justLongPressed = false;
function onCardClick(l) {
  if (justLongPressed) {
    justLongPressed = false;
    return;
  }
  if (openMenuId.value === l._id) {
    openMenuId.value = null;
    return;
  }
  if (multiSelect.value) toggleSelect(l);
  else openLedgerSheet(l);
}

// 切换就地操作菜单（绑定账本 _id；再次点击同一卡片的 ⋯ 收起）
function toggleMenu(l) {
  if (multiSelect.value) return;
  const willOpen = openMenuId.value !== l._id;
  openMenuId.value = willOpen ? l._id : null;
  if (willOpen) actionTab.value = "edit"; // 打开时滑块复位到「编辑」
}
// tabs 当前高亮项（控制 glider 滑块位置；默认"编辑"为安全高亮）
const actionTab = ref("edit");
function onMenuDelete(l) {
  actionTab.value = "delete";
  // 先让滑块滑到"删除"，再弹出删除确认，使 tabs 高亮可见
  setTimeout(() => {
    openMenuId.value = null;
    openDelete(l);
  }, 180);
}
function onMenuEdit(l) {
  actionTab.value = "edit";
  setTimeout(() => {
    openMenuId.value = null;
    openEdit(l);
  }, 180);
}
// 操作形态下点击卡片空白处（非按钮区域）收起，恢复常规形态
function cancelAction() {
  openMenuId.value = null;
}
function onCardLongPress(l) {
  justLongPressed = true;
  setTimeout(() => {
    justLongPressed = false;
  }, 400);
  if (multiSelect.value) return;
  openMenuId.value = l._id;
}


// 多选模式开关：进入时隐藏底部 tabbar，退出时恢复
function toggleMultiSelect() {
  if (multiSelect.value) {
    exitMultiSelect();
  } else {
    multiSelect.value = true;
    uni.$emit("hide-tabbar");
  }
}
function exitMultiSelect() {
  multiSelect.value = false;
  selectedIds.value = [];
  uni.$emit("show-tabbar");
}

// 勾选 / 取消勾选（总账本不可选）
function toggleSelect(l) {
  if (l.is_system) return;
  const id = l._id;
  selectedIds.value = selectedIds.value.includes(id)
    ? selectedIds.value.filter((x) => x !== id)
    : [...selectedIds.value, id];
}

// 单选删除：弹出二次确认（列出账本名，选择处理方式）
function openDelete(l) {
  if (l.is_system) {
    uni.showToast({ title: "总账本不可删除", icon: "none" });
    return;
  }
  delTargets.value = [l];
  showDelConfirm.value = true;
}

// 批量删除：收集已选非系统账本，弹出二次确认
function openBatchDelete() {
  const targets = ledgerViews.value.filter(
    (l) => selectedIds.value.includes(l._id) && !l.is_system
  );
  if (!targets.length) return;
  delTargets.value = targets;
  showDelConfirm.value = true;
}

// 执行删除（单选 / 多选共用）：转移或彻底删除，均带确认
async function confirmDelete(mode) {
  const targets = delTargets.value;
  if (!targets.length) return;
  try {
    await Promise.all(targets.map((t) => deleteLedger(t._id, mode)));
    uni.showToast({ title: `已删除 ${targets.length} 个账本`, icon: "success" });
    showDelConfirm.value = false;
    delTargets.value = [];
    selectedIds.value = [];
    if (multiSelect.value) exitMultiSelect();
    await loadData();
  } catch (err) {
    const msg = err && err.message ? err.message : "删除失败";
    uni.showToast({ title: msg, icon: "none" });
  }
}

// 组件卸载时若仍处于多选态，恢复 tabbar 显示
onUnmounted(() => {
  if (multiSelect.value) uni.$emit("show-tabbar");
});

// ===== 共享上下文：通过 provide 暴露给各 tab 子组件（单一数据源，避免数据不同步）=====
const ledgerCtx = {
  calSwapping,
  swapFrom,
  ovExpanded,
  swapTo,
  swapDir,
  onCalBtn,
  totalBalance,
  fmt,
  monthExpense,
  monthNet,
  ledgers,
  transactions,
  multiSelect,
  toggleMultiSelect,
  openNewLedger,
  ledgerViews,
  onCardClick,
  onCardLongPress,
  selectedIds,
  toggleSelect,
  coverErrors,
  defaultCoverUrl,
  coverDisplay,
  onCoverError,
  budgetWord,
  coverTheme,
  toggleMenu,
  cancelAction,
  openMenuId,
  actionTab,
  onMenuDelete,
  onMenuEdit,
  ovDim,
  setOvDim,
  ovKey,
  dayExpenseMap,
  dayIncomeMap,
  monthExpenseMap,
  monthIncomeMap,
  yearExpenseMap,
  yearIncomeMap,
  ovExpense,
  ovIncome,
  ovNet,
  ovLedgerCount,
  ovTxCount,
  assetModes,
  assetMode,
  assetDisplay,
  cash,
  invest,
  liab,
  investGain,
  ACCOUNTS,
  accIconUrls,
  goAssetMgr,
  goAssetDetail,
  repKeyLabel,
  openRepPop,
  ledgerOptions,
  onRepLedgerChange,
  repLedgerId,
  currentLedgerName,
  exportMonth,
  dashColor,
  dashArcLen,
  GAUGE_CIRC,
  DASH_DEFS,
  dashMetric,
  dashDisplayText,
  dashMom,
  momClass,
  momIco,
  dashMomText,
  setDashMetric,
  metricValOf,
  dashCompare,
  assetFocus,
  assetMain,
  assetCash,
  assetInvest,
  assetLiab,
  accountDist,
  focusAsset,
  trendIsMock,
  trendIncUp,
  trendExpUp,
  trendNetUp,
  trendFocus,
  trendChart,
  trendDotR,
  trendData,
  onBarTap,
  hoverMonthIdx,
  maxBar,
  catIsMock,
  donut,
  onRingSpin,
  onDonutMove,
  onDonutLeave,
  haloStyle,
  pointer,
  hoverCatIdx,
  donutUp,
  onSegTap,
  onSegEnter,
  onCatLeave,
  onRoseTouch,
  onRoseTouchEnd,
  catMax,
  repPop,
  closeRepPop,
  repDim,
  setRepDim,
  repKey,
  repDayExpenseMap,
  repDayIncomeMap,
  repMonthExpenseMap,
  repMonthIncomeMap,
  repYearExpenseMap,
  stockCount,
  stickerConsumeMonth,
  lowStockCount,
  goStickerLib,
  stockGrid,
  stickerImg,
  isStickerOut,
  stickerBgStyle,
  onStickerTap,
  onStickerLong,
  goStickerCreate,
  cdn,
  materialCount,
  materialGrid,
  customCount,
  customGrid,
  isStickerLow,
  repYearIncomeMap,
  onCatCardMove,
};
provide("ledger", ledgerCtx);
</script>

<style scoped lang="scss">
@import "../../styles/ledger-tabs.scss";
</style>
