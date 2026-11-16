// scripts/rename-owner.mjs —— 改了 GitHub 用户名后，一次性同步仓库里的所有地址
// 用法：node scripts/rename-owner.mjs <新用户名> [仓库名]
//       node scripts/rename-owner.mjs --dry jayfong-dev        （只看改动，不写文件）
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(root);

const args = process.argv.slice(2);
const dry = args.includes("--dry");
const rest = args.filter((a) => a !== "--dry");
const owner = rest[0];

if (!owner || /^https?:/.test(owner)) {
  console.error("用法：node scripts/rename-owner.mjs [--dry] <新用户名> [仓库名]");
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync("manifest.json", "utf8"));
const currentHome = manifest.homepage_url || "";
const m = currentHome.match(/github\.com\/([^/]+)\/([^/?#]+)/);
const oldOwner = m ? m[1] : null;
const repo = rest[1] || (m ? m[2] : "assistant-answer-helper");

console.log(`旧 owner: ${oldOwner ?? "(未设置)"}`);
console.log(`新 owner: ${owner}`);
console.log(`仓库名  : ${repo}\n`);

const files = ["manifest.json", "package.json", "README.md", "docs/PUBLISH.md", "CHANGELOG.md"];
let changed = 0;

for (const f of files) {
  if (!fs.existsSync(f)) continue;
  const before = fs.readFileSync(f, "utf8");
  let after = before;

  if (oldOwner) {
    after = after.split(`github.com/${oldOwner}/`).join(`github.com/${owner}/`);
    after = after.split(`github.com%2F${oldOwner}%2F`).join(`github.com%2F${owner}%2F`);
  }
  // 仓库名也一起对齐
  if (m) {
    const oldRepo = m[2];
    if (oldRepo !== repo) {
      after = after.split(`/${oldRepo}.git`).join(`/${repo}.git`);
      after = after.split(`}/${oldRepo}`).join(`}/${repo}`);
      after = after.replaceAll(oldRepo, repo);
    }
  }

  if (after !== before) {
    const hits = before.split("\n").filter((line, i) => line !== after.split("\n")[i]).length;
    console.log(`  ${f}: ${hits} 行会有改动`);
    if (!dry) fs.writeFileSync(f, after, "utf8");
    changed++;
  }
}

if (!changed) {
  console.log("没有需要改的地方（可能已经是新地址）");
} else if (dry) {
  console.log(`\n[dry] 共 ${changed} 个文件会被修改，去掉 --dry 真正写入`);
} else {
  console.log(`\n已更新 ${changed} 个文件`);
  console.log("别忘了同步 git remote：");
  console.log(`  git remote set-url origin https://github.com/${owner}/${repo}.git`);
}
