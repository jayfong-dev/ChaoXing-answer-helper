// test/version_check.mjs —— 版本号一致性检查
// 规则：manifest.json 是唯一真源；CHANGELOG 顶部条目、README 标题必须与之一致；
//       源码里不允许出现写死的版本号（应由 chrome.runtime.getManifest() 注入）
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const problems = [];
const notes = [];

const manifest = JSON.parse(read("manifest.json"));
const version = manifest.version;
notes.push(`manifest.json → ${version}`);

// 1) CHANGELOG 第一个版本条目
{
  const log = read("CHANGELOG.md");
  const m = log.match(/^##\s*\[([0-9]+\.[0-9]+\.[0-9]+)\]/m);
  if (!m) problems.push("CHANGELOG 里找不到形如 `## [x.y.z]` 的条目");
  else {
    notes.push(`CHANGELOG 顶部 → ${m[1]}`);
    if (m[1] !== version) problems.push(`CHANGELOG 顶部是 ${m[1]}，manifest 是 ${version}`);
  }
}

// 2) README 标题里的版本
{
  const md = read("README.md");
  const m = md.match(/^#\s.*?v([0-9]+\.[0-9]+\.[0-9]+)/m);
  if (!m) notes.push("README 标题未写版本号（可接受）");
  else {
    notes.push(`README 标题 → ${m[1]}`);
    if (m[1] !== version) problems.push(`README 标题是 v${m[1]}，manifest 是 ${version}`);
  }
}

// 3) 源码/页面里不允许写死旧版本号
{
  const files = ["popup.html", "popup.js", "options.html", "options.js", "content.js", "background.js"];
  for (const f of files) {
    if (!fs.existsSync(path.join(root, f))) continue;
    const src = read(f);
    // 先剔除 IP（127.0.0.1 之类会被误判成版本号）
    const cleaned = src.replace(/\b\d{1,3}(?:\.\d{1,3}){3}\b/g, "<IP>");
    const hits = [...cleaned.matchAll(/\b\d+\.\d+\.\d+\b/g)].map((m) => m[0]);
    const wrong = hits.filter((v) => v !== version);
    if (wrong.length) problems.push(`${f} 里出现写死的版本号：${[...new Set(wrong)].join(", ")}（应为空或 ${version}）`);
  }
}

// 4) package.json（若存在）也应对齐
if (fs.existsSync(path.join(root, "package.json"))) {
  const pkg = JSON.parse(read("package.json"));
  if (pkg.version && pkg.version !== version) {
    problems.push(`package.json 是 ${pkg.version}，manifest 是 ${version}`);
  } else if (pkg.version) notes.push(`package.json → ${pkg.version}`);
}

console.log(notes.join("\n"));
console.log(problems.length ? "FAIL:\n  " + problems.join("\n  ") : "PASS: 版本号一致");
process.exit(problems.length ? 1 : 0);
