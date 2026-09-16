import fs from "fs";
const SRC = "d:/qupindou/spareJar/pages/ledger/ledger.vue";
let c = fs.readFileSync(SRC, "utf8");

const reps = [
  [
    /      <view v-show="pageTab === 'ledger'" class="ledger-tab">[\s\S]*?\r\n      <\/view>\r\n\r\n      <!-- TAB: 资产 -->/,
    '      <LedgerTab v-show="pageTab === \'ledger\'" />\r\n\r\n      <!-- TAB: 资产 -->',
  ],
  [
    /      <view v-show="pageTab === 'asset'">[\s\S]*?\r\n      <\/view>\r\n\r\n      <!-- TAB: 报表 -->/,
    '      <AssetTab v-show="pageTab === \'asset\'" />\r\n\r\n      <!-- TAB: 报表 -->',
  ],
  [
    /      <view v-show="pageTab === 'chart'">[\s\S]*?\r\n      <\/view>\r\n\r\n      <!-- TAB: 贴纸 -->/,
    '      <ChartTab v-show="pageTab === \'chart\'" />\r\n\r\n      <!-- TAB: 贴纸 -->',
  ],
  [
    /      <view v-show="pageTab === 'sticker'">[\s\S]*?\r\n      <\/view>\r\n\r\n      <!-- 底部留白/,
    '      <StickerTab v-show="pageTab === \'sticker\'" />\r\n\r\n      <!-- 底部留白',
  ],
];

for (const [re, rep] of reps) {
  const before = c.length;
  c = c.replace(re, rep);
  console.log("replaced:", re.source.slice(0, 40), "changed chars:", before - c.length);
}

fs.writeFileSync(SRC, c, "utf8");
console.log("done, new length", c.length);
