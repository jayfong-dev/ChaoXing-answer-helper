// test/manifest_check.mjs —— 静态校验：manifest 引用的文件必须都存在
// 依据：曾因 icons/32.png 未生成导致 Chrome 直接拒绝加载扩展
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const raw = fs.readFileSync(path.join(root, "manifest.json"), "utf8");
const m = JSON.parse(raw);

const refs = new Set();

function walk(v) {
  if (typeof v === "string") {
    // 只看像文件路径的字符串（含 / 且以已知后缀结尾）
    if (/\.(png|js|css|html|json)$/i.test(v)) refs.add(v);
  } else if (Array.isArray(v)) {
    v.forEach(walk);
  } else if (v && typeof v === "object") {
    Object.values(v).forEach(walk);
  }
}
walk(m);

// 内容脚本里的 matches 不是文件，已被后缀规则过滤
const missing = [...refs].filter((p) => !fs.existsSync(path.join(root, p)));
const problems = [];

if (m.manifest_version !== 3) problems.push(`manifest_version 不是 3（${m.manifest_version}）`);
if (!/^\d+\.\d+\.\d+$/.test(m.version || "")) problems.push(`version 不符合 x.y.z（${m.version}）`);
if ((m.name || "").length > 45) problems.push(`name 超过 45 字符（${m.name.length}）`);
if (missing.length) problems.push(`引用的文件不存在：${missing.join(", ")}`);

// 每个图标尺寸都要能打开
const icons = { ...(m.icons || {}), ...((m.action && m.action.default_icon) || {}) };
for (const [size, file] of Object.entries(icons)) {
  if (!fs.existsSync(path.join(root, file))) continue; // 已在 missing 里报过
  const buf = fs.readFileSync(path.join(root, file));
  const isPng = buf[0] === 0x89 && buf[1] === 0x50;
  if (!isPng) problems.push(`${size}px 图标不是有效 PNG：${file}`);
}

console.log(`引用文件 ${refs.size} 个，图标 ${Object.keys(icons).length} 档`);
console.log(problems.length ? "FAIL:\n  " + problems.join("\n  ") : "PASS: manifest 与文件一致");
process.exit(problems.length ? 1 : 0);
