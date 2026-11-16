// scripts/build-release.mjs —— 发布前构建：校验 → 打 zip
// 用法：node scripts/build-release.mjs
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(root);

const run = (cmd) => {
  process.stdout.write(`\n$ ${cmd}\n`);
  execSync(cmd, { stdio: "inherit" });
};

// 1) 静态校验
run("node test/manifest_check.mjs");
run("node test/version_check.mjs");

// 2) 读取版本
const manifest = JSON.parse(fs.readFileSync("manifest.json", "utf8"));
const ver = manifest.version;
const name = `assistant-answer-helper-${ver}.zip`;

// 3) 打包（排除源码外的东西）
const skipDirs = new Set(["node_modules", ".git", "test", "docs", "scripts", "__pycache__", "dist"]);
const skipFiles = new Set(["package-lock.json", ".gitignore"]);

const zipPath = path.join(root, "dist", name);
fs.mkdirSync(path.dirname(zipPath), { recursive: true });
fs.rmSync(zipPath, { force: true });

// 用 PowerShell 压缩，避免额外依赖
const staging = path.join(root, "dist", "staging");
fs.rmSync(staging, { recursive: true, force: true });
fs.mkdirSync(staging, { recursive: true });

function copyDir(src, dst) {
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (skipDirs.has(entry.name)) continue;
      fs.mkdirSync(path.join(dst, entry.name), { recursive: true });
      copyDir(path.join(src, entry.name), path.join(dst, entry.name));
    } else {
      if (skipFiles.has(entry.name) || entry.name.endsWith(".pyc")) continue;
      fs.copyFileSync(path.join(src, entry.name), path.join(dst, entry.name));
    }
  }
}
copyDir(root, staging);

// 4) 生成 build-info（写进 staging，不进源码）
const buildInfo = {
  version: ver,
  name: manifest.name,
  builtAt: new Date().toISOString(),
  node: process.version,
};
fs.writeFileSync(path.join(staging, "build-info.json"), JSON.stringify(buildInfo, null, 2));

// 跨平台压缩：Windows 用 Compress-Archive，Linux/macOS 用 zip
if (process.platform === "win32") {
  execSync(
    `powershell -NoProfile -Command "Compress-Archive -Path '${staging}\\*' -DestinationPath '${zipPath}' -Force"`,
    { stdio: "inherit" }
  );
} else {
  execSync(`cd "${staging}" && zip -r -q "${zipPath}" .`, { stdio: "inherit" });
}
fs.rmSync(staging, { recursive: true, force: true });

const size = (fs.statSync(zipPath).size / 1024).toFixed(1);
console.log(`\n✔ 构建完成：dist/${name}（${size} KB）`);
console.log(`  版本 ${ver} · ${manifest.name}`);
