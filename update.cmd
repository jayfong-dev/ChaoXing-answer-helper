@echo off
chcp 65001 >nul
setlocal
rem 一键更新扩展：把新文件覆盖到你已安装的目录
rem 用法：双击本文件，或 update.cmd "C:\你的扩展目录"

set "TARGET=%~1"
if "%TARGET%"=="" (
  echo 请输入你当初「加载解压缩的扩展」时选的那个文件夹路径：
  set /p TARGET=^> 
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0update.ps1" -Target "%TARGET%"
echo.
pause
