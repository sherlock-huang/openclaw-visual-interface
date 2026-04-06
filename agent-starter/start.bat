@echo off
chcp 65001 >nul
title OpenClaw Agent

echo.
echo  ==========================================
echo   OpenClaw Agent 启动器
echo  ==========================================
echo.

:: 检查 Node.js
where node >nul 2>&1
if errorlevel 1 (
    echo  [错误] 未检测到 Node.js
    echo.
    echo  请先安装 Node.js（免费）：
    echo  https://nodejs.org/zh-cn/download
    echo.
    echo  安装完成后重新双击本脚本
    echo.
    pause
    exit /b 1
)

for /f %%a in ('node -v') do set NODE_VER=%%a
echo  [OK] Node.js %NODE_VER% 已检测到（不会修改你的环境）

:: 检查版本 >= 14
node -e "process.exit(parseInt(process.version.slice(1)) >= 14 ? 0 : 1)" >nul 2>&1
if errorlevel 1 (
    echo  [警告] Node.js 版本过低（需要 14+，当前 %NODE_VER%）
    echo  请更新：https://nodejs.org/zh-cn/download
    pause
    exit /b 1
)

:: 检查 my-agent.js
if not exist my-agent.js (
    echo  [错误] 找不到 my-agent.js
    echo  请确保本脚本和 my-agent.js、openclaw.js 在同一文件夹
    pause
    exit /b 1
)

:: 检查 openclaw.js
if not exist openclaw.js (
    echo  [错误] 找不到 openclaw.js
    echo  请重新下载完整的 agent-starter 文件夹
    pause
    exit /b 1
)

echo  [OK] 文件检查通过
echo.
echo  ==========================================
echo   提示：连接前请确保：
echo   1. 服务器已启动（运行 1-start-server.bat）
echo   2. 隧道已启动（运行 2-start-tunnel.bat）
echo  ==========================================
echo.
echo  正在启动 Agent，按 Ctrl+C 可停止...
echo.

node my-agent.js

echo.
echo  Agent 已停止
pause
