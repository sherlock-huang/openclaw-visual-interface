@echo off
chcp 65001 >nul
title OpenClaw 启动器

echo.
echo  ╔══════════════════════════════════════╗
echo  ║     OpenClaw 启动检测中...           ║
echo  ╚══════════════════════════════════════╝
echo.

:: ── 1. 检查 Node.js ──────────────────────────────────────
where node >nul 2>&1
if errorlevel 1 (
    echo  [错误] 未检测到 Node.js
    echo.
    echo  请先安装 Node.js 18 或更高版本：
    echo  https://nodejs.org/zh-cn/download
    echo.
    pause
    exit /b 1
)

node -e "process.exit(parseInt(process.version.slice(1)) >= 18 ? 0 : 1)" >nul 2>&1
if errorlevel 1 (
    echo  [错误] Node.js 版本过低，需要 18+
    echo  请更新：https://nodejs.org/zh-cn/download
    echo.
    pause
    exit /b 1
)

for /f %%a in ('node -v') do set NODE_VER=%%a
echo  [OK] Node.js %NODE_VER%

:: ── 2. 检查端口占用 ───────────────────────────────────────
netstat -ano | findstr ":3211 " | findstr "LISTENING" >nul 2>&1
if not errorlevel 1 (
    echo  [警告] 端口 3211 已被占用
    echo.
    echo  请先关闭占用该端口的程序，或重启电脑后重试
    echo.
    pause
    exit /b 1
)
echo  [OK] 端口 3211 可用

netstat -ano | findstr ":3210 " | findstr "LISTENING" >nul 2>&1
if not errorlevel 1 (
    echo  [警告] 端口 3210 已被占用，将跳过本地前端
    echo  请直接访问 Cloudflare Pages 界面
    echo.
)

:: ── 3. 安装依赖 ───────────────────────────────────────────
if not exist node_modules (
    echo  [依赖] 首次安装，请稍候...
    goto :install
)
if not exist node_modules\next (
    echo  [依赖] 检测到依赖不完整，重新安装...
    goto :install
)
echo  [OK] 依赖已就绪
goto :start

:install
echo  [依赖] 尝试安装（可能需要 2-5 分钟）...
call npm install --prefer-offline 2>install_err.tmp
if not errorlevel 1 (
    del install_err.tmp >nul 2>&1
    echo  [OK] 依赖安装成功
    goto :start
)

echo  [依赖] 标准安装失败，尝试跳过原生模块编译...
call npm install --ignore-scripts --prefer-offline 2>nul
if errorlevel 1 (
    echo.
    echo  [错误] 依赖安装失败
    echo.
    echo  解决方案：
    echo  1. 以管理员身份重新运行本脚本
    echo  2. 或安装构建工具后重试：
    echo     winget install Microsoft.VisualStudio.2022.BuildTools
    echo.
    del install_err.tmp >nul 2>&1
    pause
    exit /b 1
)
del install_err.tmp >nul 2>&1
echo  [警告] 以兼容模式安装完成

:start
echo.
echo  ══════════════════════════════════════════
echo   启动 OpenClaw Server（端口 3211）...
echo  ══════════════════════════════════════════
echo.

:: 尝试全局 tsx
where tsx >nul 2>&1
if not errorlevel 1 (
    start "OpenClaw-Server" cmd /k "title OpenClaw Server && tsx src/server/index.ts"
    goto :open_browser
)

:: 尝试本地 tsx
if exist node_modules\.bin\tsx.cmd (
    start "OpenClaw-Server" cmd /k "title OpenClaw Server && node_modules\.bin\tsx src/server/index.ts"
    goto :open_browser
)

:: 尝试 ts-node
if exist node_modules\.bin\ts-node.cmd (
    start "OpenClaw-Server" cmd /k "title OpenClaw Server && node_modules\.bin\ts-node src/server/index.ts"
    goto :open_browser
)

echo  [错误] 找不到 TypeScript 运行时
echo  请运行：npm install
pause
exit /b 1

:open_browser
echo  [等待] 服务器启动中（3秒）...
timeout /t 3 /nobreak >nul

if exist node_modules\next (
    echo  [启动] 本地前端界面（端口 3210）...
    start "OpenClaw-Web" cmd /k "title OpenClaw Web && node_modules\.bin\next dev -p 3210"
    timeout /t 4 /nobreak >nul
    start http://localhost:3210
) else (
    echo  [提示] 请访问 Cloudflare Pages 界面：
    echo        https://openclaw-visual-interface.pages.dev
    start https://openclaw-visual-interface.pages.dev
)

echo.
echo  ══════════════════════════════════════════
echo   OpenClaw 已启动！
echo   Server:    http://localhost:3211
echo   Dashboard: http://localhost:3210
echo.
echo   关闭 "OpenClaw Server" 窗口可停止服务
echo  ══════════════════════════════════════════
echo.
pause
