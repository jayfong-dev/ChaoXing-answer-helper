# 发布到 GitHub 的完整流程

> 目标：仓库能看、Release 能下、别人拿到 zip 就能装。
> 全过程 10 分钟，不需要装 `gh`（用网页也行）。

---

## 0. 发布前自检（已就绪，可跳过）

```bash
node test/manifest_check.mjs   # manifest 引用的文件都在
node test/version_check.mjs    # 版本号四处一致
node scripts/build-release.mjs # 打包到 dist/（已排除 test/docs/node_modules）
```

`.gitignore` 已覆盖 `node_modules/`、`test/shots/`、`__pycache__/`、`dist/`、`*.zip`。
仓库真实体积约 **3 MB**（不含 node_modules 的 35 MB）。

---

## 1. 建仓库

**网页版**

1. 打开 https://github.com/new
2. Repository name：`assistant-answer-helper`（与 `package.json` 的 name 一致）
3. Description：
   ```
   学习通/超星作业的判卷式答题助手（Chrome/Edge 扩展）：DeepSeek 视觉读图、先判对错、每题显示 token 与花费
   ```
4. Public（要给别人用就公开；介意就 Private，但 Release 资产也需登录才能下）
5. **不要**勾 Add a README / .gitignore / license（本地已有，勾了会冲突）

**命令行版（装了 gh 才可用）**

```bash
gh repo create assistant-answer-helper --public --source=. --remote=origin --push
```

---

## 2. 首次推送

```bash
cd "C:\Users\17939\Documents\deepseek-harness\default-workspace\ext\chaoxing-ai"

git init -b main
git add -A
git status --short          # ★ 检查一遍：不该出现 node_modules/、test/shots/
git commit -m "feat: 初始版本 v1.2.0（判卷式答题 + 图片题 + 用量统计）"

git remote add origin https://github.com/jayfong-dev/ChaoXing-answer-helper.git
git push -u origin main
```

> 如果 `git status` 里出现大堆 `node_modules/`，说明 `.gitignore` 没生效，先 `git rm -r --cached node_modules` 再提交。

---

## 3. 仓库设置（30 秒，但影响观感）

在仓库首页点 **About** 右侧的齿轮：

| 字段 | 建议值 |
|---|---|
| Description | 见上面第 1 步 |
| Website | 留空或你的说明页 |
| Topics | `deepseek` `chrome-extension` `edge-extension` `manifest-v3` `education` `automation` `vision` |

Topics 很重要——它是别人搜到你仓库的主要途径。

---

## 4. 发第一个 Release

**方式 A：命令行（推荐，一条命令出三样东西）**

```bash
git tag -a v1.2.0 -m "v1.2.0: 判卷式答题 + 图片题 + 用量统计"
git push origin v1.2.0
```

推 tag 后，`.github/workflows/release.yml` 会自动：
1. 跑 `manifest_check` + `version_check`
2. 打包成 `assistant-answer-helper-1.2.0.zip`
3. 建 Release、附上 zip、自动生成 release notes

去 **Actions** 页看那条 `release` 工作流是否绿；绿了就在 **Releases** 页看到成品。

**方式 B：手动**

1. 先本地 `node scripts/build-release.mjs`
2. GitHub → Releases → **Draft a new release**
3. Tag：`v1.2.0`（选 “Create new tag on publish”）
4. Title：`v1.2.0`
5. 描述：见下方模板
6. 附件：把 `dist/assistant-answer-helper-1.2.0.zip` 拖进去
7. Publish

### Release 描述模板

```markdown
### 安装
1. 下载 `assistant-answer-helper-1.2.0.zip` 并解压
2. `edge://extensions` → 打开「开发者模式」→「加载解压缩的扩展」→ 选解压出的文件夹
3. 点扩展图标 → 设置 → 填 API Key 与模型（默认 `deepseek-flash`）

### 本版内容
- 判卷式答题：已有答案先判对错，错的才改（可切换跳过 / 覆盖）
- 图片题：题干里的流程图 / 网络图 / 表格随题发给视觉模型
- 用量统计：每题显示 token 与估算花费，底部汇总本次，弹窗看今日，可查余额
- 三套主题：石墨（默认）/ 纸白 / 墨蓝

### 说明
本工具仅辅助作答，答案由你配置的模型生成，**提交前请自行核对**。
与任何课程平台无关联，详见 README「声明」。
```

---

## 5. 发布后：别人怎么装

README 顶部建议补一段（现在已有安装章节，确认路径一致）：

> **下载**：Releases 页 → 最新版 → `assistant-answer-helper-x.y.z.zip`
> **安装**：解压 → `edge://extensions` → 开发者模式 → 加载解压缩的扩展

⚠️ 两个必须说清的坑：

1. **GitHub 下载的是 zip，浏览器不能直接装 zip**，必须先解压再「加载解压缩的扩展」
2. **上架商店是另一条路**：需要开发者账号（Chrome 一次性 $5），且审核对"自动答题"类扩展可能拒；先发 GitHub 更稳

---

## 6. 版本号怎么维护（重要）

只有一处真源：`manifest.json` 的 `version`。发版流程固定为：

```bash
# 1. 改 manifest.json 的 version
# 2. CHANGELOG.md 顶部加一节 [x.y.z]
# 3. README 标题同步
node test/version_check.mjs     # 漏一处会直接报错
node scripts/build-release.mjs
git add -A && git commit -m "chore: release v x.y.z"
git tag -a vx.y.z -m "vx.y.z"
git push && git push --tags
```

---

## 7. 发布前的清单

- [ ] `git status` 里没有 `node_modules/`、`test/shots/`、`*.zip`
- [ ] 没有任何真实 API Key（`grep -rn "sk-"` 全空）
- [ ] `manifest_check` + `version_check` 都 PASS
- [ ] README 的「声明」一节在
- [ ] `LICENSE` / `NOTICE.md` 在
- [ ] Release 附件是 `dist/` 里的 zip，不是源码压缩包
- [ ] Topics 填了（决定能不能被搜到）
