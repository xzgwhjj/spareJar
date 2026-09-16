import fs from "fs";
const COMP_DIR = "d:/qupindou/spareJar/components/ledger/tabs";
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
].join(",\n  ");

const files = ["LedgerTab.vue", "AssetTab.vue", "ChartTab.vue", "StickerTab.vue"];
for (const f of files) {
  const p = `${COMP_DIR}/${f}`;
  let c = fs.readFileSync(p, "utf8");
  c = c.replace(/const \{\n[\s\S]*?\} = ctx;/, `const {\n  ${UNION},\n} = ctx;`);
  fs.writeFileSync(p, c, "utf8");
  console.log("updated", f);
}
