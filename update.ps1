# 一键更新已安装的扩展（用法见下方注释）
# 用法：
#   powershell -ExecutionPolicy Bypass -File update.ps1 -Target "C:\你的扩展目录"
# 说明：
#   1. Target 必须是你当初「加载解压缩的扩展」选的那个文件夹
#   2. 脚本只覆盖扩展文件，不会删掉你的设置（设置在浏览器里，不在文件夹）
#   3. 跑完后去 edge://extensions 点一次刷新 ↻

param(
  [Parameter(Mandatory = $true)]
  [string]$Target
)

$ErrorActionPreference = "Stop"
$src = Split-Path -Parent $MyInvocation.MyCommand.Path

if (-not (Test-Path (Join-Path $Target "manifest.json"))) {
  Write-Host "目标目录里没有 manifest.json，确认这是扩展根目录：$Target" -ForegroundColor Red
  exit 1
}

Write-Host "源：$src"
Write-Host "目标：$Target"

$items = @(
  "manifest.json", "background.js", "content.js", "content.css",
  "popup.html", "popup.js", "options.html", "options.js",
  "README.md", "package.json"
)

foreach ($i in $items) {
  $f = Join-Path $src $i
  if (Test-Path $f) {
    Copy-Item $f (Join-Path $Target $i) -Force
    Write-Host "  ✓ $i"
  }
}

if (Test-Path (Join-Path $src "icons")) {
  Copy-Item (Join-Path $src "icons") (Join-Path $Target "icons") -Recurse -Force
  Write-Host "  ✓ icons/"
}

$ver = (Get-Content (Join-Path $Target "manifest.json") -Raw | ConvertFrom-Json).version
Write-Host ""
Write-Host "已更新到版本 $ver" -ForegroundColor Green
Write-Host "下一步：打开 edge://extensions（或 chrome://extensions），在扩展卡片上点刷新 ↻；然后 F5 刷新作业页。" -ForegroundColor Yellow
