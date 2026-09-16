import fs from "fs";
const c = fs.readFileSync("pages/ledger/ledger.vue", "utf8");
const tests = [
  ["ledger", /      <view v-show="pageTab === 'ledger'" class="ledger-tab">[\s\S]*?\n      <\/view>\n\n      <!-- TAB: 资产 -->/],
  ["asset", /      <view v-show="pageTab === 'asset'">[\s\S]*?\n      <\/view>\n\n      <!-- TAB: 报表 -->/],
  ["chart", /      <view v-show="pageTab === 'chart'">[\s\S]*?\n      <\/view>\n\n      <!-- TAB: 贴纸 -->/],
  ["sticker", /      <view v-show="pageTab === 'sticker'">[\s\S]*?\n      <\/view>\n\n      <!-- 底部留白/],
];
for (const [name, re] of tests) {
  console.log(name, "match:", re.test(c));
}
// 打印 ledger 区块开头几行，确认实际空白
const idx = c.indexOf("pageTab === 'ledger'");
console.log("LEDGER OPENING CONTEXT:");
console.log(JSON.stringify(c.slice(idx - 12, idx + 60)));
const idx2 = c.indexOf("<!-- TAB: 资产 -->");
console.log("BEFORE TAB:资产 (last 80 chars):");
console.log(JSON.stringify(c.slice(idx2 - 80, idx2 + 20)));
