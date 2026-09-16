import fs from "fs";

const SRC = "d:/qupindou/spareJar/pages/ledger/ledger.vue";
const COMP_DIR = "d:/qupindou/spareJar/components/ledger/tabs";
const SCSS = "../../../styles/ledger-tabs.scss";

const raw = fs.readFileSync(SRC, "utf8");
const lines = raw.split("\n");

// 每个 tab：s=起始 <view v-show> 行(1-indexed)，e=对应结束 </view> 行(1-indexed)
// inner = lines.slice(s, e-1) 即 (s+1)..(e-1) 行
const tabs = [
  {
    file: "LedgerTab.vue",
    key: "ledger",
    s: 73, e: 377,
    root: '<view class="ledger-tab">',
    names: [
      "calSwapping", "swapFrom", "ovExpanded", "swapTo", "swapDir", "onCalBtn",
      "totalBalance", "fmt", "monthExpense", "monthNet", "ledgers", "transactions",
      "multiSelect", "toggleMultiSelect", "openNewLedger", "ledgerViews", "onCardClick",
      "onCardLongPress", "selectedIds", "toggleSelect", "coverErrors", "defaultCoverUrl",
      "coverDisplay", "onCoverError", "budgetWord", "coverTheme", "toggleMenu", "cancelAction",
      "openMenuId", "actionTab", "onMenuDelete", "onMenuEdit", "ovDim", "setOvDim", "ovKey",
      "dayExpenseMap", "dayIncomeMap", "monthExpenseMap", "monthIncomeMap", "yearExpenseMap",
      "yearIncomeMap", "ovExpense", "ovIncome", "ovNet", "ovLedgerCount", "ovTxCount",
    ],
  },
  {
    file: "AssetTab.vue",
    key: "asset",
    s: 380, e: 576,
    root: "<view>",
    names: [
      "assetModes", "assetMode", "assetDisplay", "fmt", "cash", "invest", "liab", "investGain",
      "ACCOUNTS", "accIconUrls", "goAssetMgr", "goAssetDetail",
    ],
  },
  {
    file: "ChartTab.vue",
    key: "chart",
    s: 579, e: 1124,
    root: "<view>",
    names: [
      "repKeyLabel", "openRepPop", "ledgerOptions", "onRepLedgerChange", "repLedgerId",
      "currentLedgerName", "exportMonth", "dashColor", "dashArcLen", "GAUGE_CIRC", "DASH_DEFS",
      "dashMetric", "dashDisplayText", "dashMom", "momClass", "momIco", "dashMomText",
      "setDashMetric", "metricValOf", "dashCompare", "assetFocus", "assetMain", "assetCash",
      "assetInvest", "assetLiab", "accountDist", "focusAsset", "trendIsMock", "trendIncUp",
      "trendExpUp", "trendNetUp", "trendFocus", "trendChart", "trendDotR", "trendData",
      "onBarTap", "hoverMonthIdx", "maxBar", "catIsMock", "donut", "onRingSpin", "onDonutMove",
      "onDonutLeave", "haloStyle", "pointer", "hoverCatIdx", "donutUp", "onSegTap", "onSegEnter",
      "onCatLeave", "onRoseTouch", "onRoseTouchEnd", "catMax", "repPop", "closeRepPop", "repDim",
      "setRepDim", "repKey", "repDayExpenseMap", "repDayIncomeMap", "repMonthExpenseMap",
      "repMonthIncomeMap", "repYearExpenseMap", "yearIncomeMap",
    ],
  },
  {
    file: "StickerTab.vue",
    key: "sticker",
    s: 1127, e: 1285,
    root: "<view>",
    names: [
      "stockCount", "stickerConsumeMonth", "lowStockCount", "goStickerLib", "stockGrid",
      "stickerImg", "isStickerOut", "stickerBgStyle", "onStickerTap", "onStickerLong",
      "goStickerCreate", "cdn", "materialCount", "materialGrid", "customCount", "customGrid",
      "isStickerLow",
    ],
  },
];

fs.mkdirSync(COMP_DIR, { recursive: true });

for (const t of tabs) {
  const inner = lines.slice(t.s, t.e - 1).join("\n");
  const namesBody = t.names.join(",\n  ");
  const vue = `<script setup>
import { inject } from "vue";
const ctx = inject("ledger");
const {
  ${namesBody},
} = ctx;
<\/script>

<template>
${t.root}
${inner}
</view>
</template>

<style scoped lang="scss">
@import "${SCSS}";
</style>
`;
  fs.writeFileSync(`${COMP_DIR}/${t.file}`, vue, "utf8");
  console.log("wrote", t.file, "inner lines", t.e - 1 - t.s);
}

// ===== 改写主页面 ledger.vue =====
let content = raw;

// 1) vue 导入增加 provide
content = content.replace(
  /  nextTick,\n\} from "vue";/,
  '  nextTick,\n  provide,\n} from "vue";'
);

// 2) 引入 4 个 tab 组件
content = content.replace(
  'import ConsumeSheet from "@/components/ledger/ConsumeSheet.vue";',
  `import ConsumeSheet from "@/components/ledger/ConsumeSheet.vue";
import LedgerTab from "@/components/ledger/tabs/LedgerTab.vue";
import AssetTab from "@/components/ledger/tabs/AssetTab.vue";
import ChartTab from "@/components/ledger/tabs/ChartTab.vue";
import StickerTab from "@/components/ledger/tabs/StickerTab.vue";`
);

// 3) 用组件标签替换 4 个 tab 区块
content = content.replace(
  /      <view v-show="pageTab === 'ledger'" class="ledger-tab">[\s\S]*?\n      <\/view>\n\n      <!-- TAB: 资产 -->/,
  "      <LedgerTab v-show=\"pageTab === 'ledger'\" />\n\n      <!-- TAB: 资产 -->"
);
content = content.replace(
  /      <view v-show="pageTab === 'asset'">[\s\S]*?\n      <\/view>\n\n      <!-- TAB: 报表 -->/,
  "      <AssetTab v-show=\"pageTab === 'asset'\" />\n\n      <!-- TAB: 报表 -->"
);
content = content.replace(
  /      <view v-show="pageTab === 'chart'">[\s\S]*?\n      <\/view>\n\n      <!-- TAB: 贴纸 -->/,
  "      <ChartTab v-show=\"pageTab === 'chart'\" />\n\n      <!-- TAB: 贴纸 -->"
);
content = content.replace(
  /      <view v-show="pageTab === 'sticker'">[\s\S]*?\n      <\/view>\n\n      <!-- 底部留白/,
  "      <StickerTab v-show=\"pageTab === 'sticker'\" />\n\n      <!-- 底部留白"
);

// 4) 样式块替换为 @import 共享 scss
content = content.replace(
  /<style scoped lang="scss">[\s\S]*?<\/style>/,
  '<style scoped lang="scss">\n@import "../../styles/ledger-tabs.scss";\n</style>'
);

// 5) 在 </script> 前注入 provide 共享上下文（单一数据源）
const LEDGER_CTX_NAMES = [
  "calSwapping", "swapFrom", "ovExpanded", "swapTo", "swapDir", "onCalBtn",
  "totalBalance", "fmt", "monthExpense", "monthNet", "ledgers", "transactions",
  "multiSelect", "toggleMultiSelect", "openNewLedger", "ledgerViews", "onCardClick",
  "onCardLongPress", "selectedIds", "toggleSelect", "coverErrors", "defaultCoverUrl",
  "coverDisplay", "onCoverError", "budgetWord", "coverTheme", "toggleMenu", "cancelAction",
  "openMenuId", "actionTab", "onMenuDelete", "onMenuEdit", "ovDim", "setOvDim", "ovKey",
  "dayExpenseMap", "dayIncomeMap", "monthExpenseMap", "monthIncomeMap", "yearExpenseMap",
  "yearIncomeMap", "ovExpense", "ovIncome", "ovNet", "ovLedgerCount", "ovTxCount",
  "assetModes", "assetMode", "assetDisplay", "cash", "invest", "liab", "investGain", "ACCOUNTS",
  "accIconUrls", "goAssetMgr", "goAssetDetail", "repKeyLabel", "openRepPop", "ledgerOptions",
  "onRepLedgerChange", "repLedgerId", "currentLedgerName", "exportMonth", "dashColor",
  "dashArcLen", "GAUGE_CIRC", "DASH_DEFS", "dashMetric", "dashDisplayText", "dashMom", "momClass",
  "momIco", "dashMomText", "setDashMetric", "metricValOf", "dashCompare", "assetFocus", "assetMain",
  "assetCash", "assetInvest", "assetLiab", "accountDist", "focusAsset", "trendIsMock", "trendIncUp",
  "trendExpUp", "trendNetUp", "trendFocus", "trendChart", "trendDotR", "trendData", "onBarTap",
  "hoverMonthIdx", "maxBar", "catIsMock", "donut", "onRingSpin", "onDonutMove", "onDonutLeave",
  "haloStyle", "pointer", "hoverCatIdx", "donutUp", "onSegTap", "onSegEnter", "onCatLeave",
  "onRoseTouch", "onRoseTouchEnd", "catMax", "repPop", "closeRepPop", "repDim", "setRepDim", "repKey",
  "repDayExpenseMap", "repDayIncomeMap", "repMonthExpenseMap", "repMonthIncomeMap",
  "repYearExpenseMap", "yearIncomeMap", "stockCount", "stickerConsumeMonth", "lowStockCount",
  "goStickerLib", "stockGrid", "stickerImg", "isStickerOut", "stickerBgStyle", "onStickerTap",
  "onStickerLong", "goStickerCreate", "cdn", "materialCount", "materialGrid", "customCount",
  "customGrid", "isStickerLow",
].join(",\n  ");

const injectBlock = `
// ===== 共享上下文：通过 provide 暴露给各 tab 子组件（单一数据源，避免数据不同步）=====
const ledgerCtx = {
  ${LEDGER_CTX_NAMES},
};
provide("ledger", ledgerCtx);
`;

content = content.replace(/<\/script>/, injectBlock + "</script>");

fs.writeFileSync(SRC, content, "utf8");
console.log("ledger.vue rewritten, length", content.length);
