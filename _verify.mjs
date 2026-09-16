import fs from "fs";
const SRC = "d:/qupindou/spareJar/pages/ledger/ledger.vue";
const c = fs.readFileSync(SRC, "utf8");
const script = c.slice(c.indexOf("<script setup>"), c.indexOf("</script>"));

const declared = new Set();
// 顶层/任意 const/let/var 声明
for (const m of script.matchAll(/(?:const|let|var)\s+(\w+)\s*=/g)) declared.add(m[1]);
// 解构声明 const { a, b } =
for (const m of script.matchAll(/const\s*\{([^}]+)\}/g)) {
  for (const part of m[1].split(",")) {
    const name = part.trim().split(":")[0].replace(/\.\.\./, "").trim();
    if (name) declared.add(name);
  }
}
for (const m of script.matchAll(/function\s+(\w+)/g)) declared.add(m[1]);
// 导入：import { a, b } 与 import x
for (const m of script.matchAll(/import\s*\{([^}]+)\}/g)) {
  for (const part of m[1].split(",")) {
    const name = part.trim().split(/\s+as\s+/)[0].trim();
    if (name) declared.add(name);
  }
}
for (const m of script.matchAll(/import\s+(\w+)/g)) declared.add(m[1]);

const UNION = [
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
];

const missing = UNION.filter((n) => !declared.has(n));
console.log("declared count:", declared.size);
console.log("union count:", UNION.length);
console.log("MISSING (would throw ReferenceError):", missing);
