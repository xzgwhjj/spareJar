import fs from "fs";
const p = "d:/qupindou/spareJar/pages/ledger/ledger.vue";
const s = fs.readFileSync(p, "utf8");

// 1) 提取 ledgerCtx 对象字面量
const start = s.indexOf("const ledgerCtx = {");
const end = s.indexOf("};", start);
if (start < 0 || end < 0) { console.log("ledgerCtx not found"); process.exit(0); }
const block = s.slice(start, end + 2);
// 取大括号内内容
const objBody = block.slice(block.indexOf("{") + 1, block.lastIndexOf("}"));
// 收集 shorthand 键名（形如 "  name," 或 "  name\n"）
const keys = [];
for (const line of objBody.split("\n")) {
  const t = line.trim();
  if (!t || t.endsWith(",") === false && !/^[A-Za-z_$][\w$]*$/.test(t)) continue;
  const m = t.replace(/,\s*$/, "").trim();
  if (/^[A-Za-z_$][\w$]*$/.test(m)) keys.push(m);
}

// 2) 对每个 key，检查是否在文件中被声明（const/let/var/function/import 或作为参数）
const missing = [];
for (const k of keys) {
  // 声明模式
  const decl = new RegExp(
    `(?:const|let|var|function)\\s+${k}\\b` +
    `|\\b${k}\\s*[:=]` +
    `|import\\b[^;]*\\b${k}\\b` +
    `|\\b${k}\\s*\\(` +
    `|\\b${k}\\b\\s*,`
  );
  // 更宽松：只看有没有单独出现的声明行
  const reDecl = new RegExp(`\\b(?:const|let|var|function)\\s+${k}\\b`);
  const reImport = new RegExp(`import\\s+[^;]*\\b${k}\\b`);
  if (!reDecl.test(s) && !reImport.test(s)) {
    missing.push(k);
  }
}
console.log("ledgerCtx key count:", keys.length);
console.log("MISSING (no const/let/var/function/import found):");
console.log(missing.join(", ") || "(none)");
