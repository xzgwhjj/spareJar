import fs from "fs";
const SRC = "d:/qupindou/spareJar/pages/ledger/ledger.vue";
const COMP_DIR = "d:/qupindou/spareJar/components/ledger/tabs";
const files = ["LedgerTab.vue", "AssetTab.vue", "ChartTab.vue", "StickerTab.vue"];

// ---- 1) 补两个遗漏名到 ledgerCtx 与组件解构 ----
let parent = fs.readFileSync(SRC, "utf8");
if (!parent.includes("repYearIncomeMap,")) {
  parent = parent.replace(
    "  isStickerLow,\n};",
    "  isStickerLow,\n  repYearIncomeMap,\n  onCatCardMove,\n};"
  );
  fs.writeFileSync(SRC, parent);
  console.log("parent ledgerCtx updated");
}
for (const f of files) {
  const p = `${COMP_DIR}/${f}`;
  let c = fs.readFileSync(p, "utf8");
  if (!c.includes("repYearIncomeMap,")) {
    c = c.replace(
      "  isStickerLow,\n} = ctx;",
      "  isStickerLow,\n  repYearIncomeMap,\n  onCatCardMove,\n} = ctx;"
    );
    fs.writeFileSync(p, c);
    console.log(f, "destructure updated");
  }
}

// ---- 2) 复跑校验 ----
const script = parent.slice(parent.indexOf("<script setup>"), parent.indexOf("</script>"));
const declared = new Set();
for (const m of script.matchAll(/(?:const|let|var)\s+(\w+)\s*=/g)) declared.add(m[1]);
for (const m of script.matchAll(/const\s*\{([^}]+)\}/g))
  for (const part of m[1].split(",")) {
    const n = part.trim().split(":")[0].replace(/\.\.\./, "").trim();
    if (n) declared.add(n);
  }
for (const m of script.matchAll(/function\s+(\w+)/g)) declared.add(m[1]);
for (const m of script.matchAll(/import\s*\{([^}]+)\}/g))
  for (const part of m[1].split(",")) {
    const n = part.trim().split(/\s+as\s+/)[0].trim();
    if (n) declared.add(n);
  }
for (const m of script.matchAll(/import\s+(\w+)/g)) declared.add(m[1]);

const UNION = [
  "calSwapping","swapFrom","ovExpanded","swapTo","swapDir","onCalBtn","totalBalance","fmt",
  "monthExpense","monthNet","ledgers","transactions","multiSelect","toggleMultiSelect","openNewLedger",
  "ledgerViews","onCardClick","onCardLongPress","selectedIds","toggleSelect","coverErrors","defaultCoverUrl",
  "coverDisplay","onCoverError","budgetWord","coverTheme","toggleMenu","cancelAction","openMenuId",
  "actionTab","onMenuDelete","onMenuEdit","ovDim","setOvDim","ovKey","dayExpenseMap","dayIncomeMap",
  "monthExpenseMap","monthIncomeMap","yearExpenseMap","yearIncomeMap","ovExpense","ovIncome","ovNet",
  "ovLedgerCount","ovTxCount","assetModes","assetMode","assetDisplay","cash","invest","liab","investGain",
  "ACCOUNTS","accIconUrls","goAssetMgr","goAssetDetail","repKeyLabel","openRepPop","ledgerOptions",
  "onRepLedgerChange","repLedgerId","currentLedgerName","exportMonth","dashColor","dashArcLen","GAUGE_CIRC",
  "DASH_DEFS","dashMetric","dashDisplayText","dashMom","momClass","momIco","dashMomText","setDashMetric",
  "metricValOf","dashCompare","assetFocus","assetMain","assetCash","assetInvest","assetLiab","accountDist",
  "focusAsset","trendIsMock","trendIncUp","trendExpUp","trendNetUp","trendFocus","trendChart","trendDotR",
  "trendData","onBarTap","hoverMonthIdx","maxBar","catIsMock","donut","onRingSpin","onDonutMove","onDonutLeave",
  "haloStyle","pointer","hoverCatIdx","donutUp","onSegTap","onSegEnter","onCatLeave","onRoseTouch",
  "onRoseTouchEnd","catMax","repPop","closeRepPop","repDim","setRepDim","repKey","repDayExpenseMap",
  "repDayIncomeMap","repMonthExpenseMap","repMonthIncomeMap","repYearExpenseMap","yearIncomeMap",
  "stockCount","stickerConsumeMonth","lowStockCount","goStickerLib","stockGrid","stickerImg","isStickerOut",
  "stickerBgStyle","onStickerTap","onStickerLong","goStickerCreate","cdn","materialCount","materialGrid",
  "customCount","customGrid","isStickerLow","repYearIncomeMap","onCatCardMove",
];
const unionSet = new Set(UNION);
console.log("\n[ledgerCtx 拼写校验] missing:", UNION.filter((n) => !declared.has(n)));

const KEYWORDS = new Set(["if","else","for","of","in","true","false","null","undefined","typeof","new","return","function","await","async","void","NaN","Infinity","do","while","switch","case","break","continue","var","let","const","this","instanceof"]);
const LOCALS = new Set(["l","a","m","s","g","c","p","n","i","idx","ch","seg","def","d","k","t","e","hover","acquire","pop","x","yInc","yExp","income","expense","month","color","bg","name","value","pct","accent","mom","kind","icon","combo_type","_id","item","index","it","opt","val","key","row","col","cat","sub","node","cur","prev","first","last","len","arr","map","set","get","res","data","err","ok","flag","open","close","show","hide","active","disabled","selected","checked","list","el","evt","event","target","current","next","muted","dim","type","qty","label","text","src","cls","style","cls2","pos","tip","win","lose","draw","c1","c2","c3","curIdx","hoverIdx","segIdx","catIdx","amt","rate","mc","tp","chk","v","y","max","round"]);
const EXPR_RE = /(?:\{\{([\s\S]*?)\}\})|(?:@[\w.-]+="([^"]*)")|(?::[\w.-]+="([^"]*)")|(?:v-(?:if|else-if|show|for|model)="([^"]*)")/g;

for (const f of files) {
  const content = fs.readFileSync(`${COMP_DIR}/${f}`, "utf8");
  const tpl = content.slice(content.indexOf("<template>") + 10, content.indexOf("</template>"));
  const locals = new Set(LOCALS);
  for (const m of tpl.matchAll(/v-for="([^"]*)"/g)) {
    const inOf = m[1].split(/\s+(?:in|of)\s+/);
    const left = inOf[0].replace(/[()]/g, "");
    for (const part of left.split(",")) {
      const nm = part.trim().split(":")[0].trim();
      if (nm) locals.add(nm);
    }
  }
  const suspicious = new Set();
  let m;
  EXPR_RE.lastIndex = 0;
  while ((m = EXPR_RE.exec(tpl))) {
    const expr = m[1] || m[2] || m[3] || m[4] || "";
    for (const id of expr.matchAll(/\b[A-Za-z_$][\w$]*\b/g)) {
      const w = id[0];
      if (unionSet.has(w) || KEYWORDS.has(w) || locals.has(w)) continue;
      suspicious.add(w);
    }
  }
  console.log(`\n[${f}] 疑似遗漏:`, [...suspicious].sort().join(", ") || "(none)");
}
