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

for /f "tokens=1 delims=v." %%a in ('node -v') do set NODE_MAJOR=%%a
for /f "tokens=2 delims=v." %%a in ('node -v') do set NODE_MAJOR=%%a
node -e "process.exit(parseInt(process.version.slice(1)) >= 18 ? 0 : 1)" >nul 2>&1
if errorlevel 1 (
    echo  [错误] Node.js 版本过低（当前：%NODE_VER%，需要 18+）
    echo.
    echo  请更新 Node.js：https://nodejs.org/zh-cn/download
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
    echo  请关闭占用该端口的程序后重试
    echo  或在另一个终端运行：for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3211') do taskkill /PID %%a /F
    echo.
    pause
    exit /b 1
)
echo  [OK] 端口 3211 可用

netstat -ano | findstr ":3210 " | findstr "LISTENING" >nul 2>&1
if not errorlevel 1 (
    echo  [警告] 端口 3210 已被占用，前端将无法启动
    echo  后端服务将正常运行，可通过 CONNECT 框手动指定地址访问
    echo.
)

:: ── 3. 安装依赖 ───────────────────────────────────────────
if not exist node_modules (
    echo  [依赖] 首次安装，请稍候...
    goto :install
)

if not exist node_modules\.package-lock.json (
    if not exist node_modules\next (
        echo  [依赖] 检测到依赖不完整，重新安装...
        goto :install
    )
)

echo  [OK] 依赖已就绪
goto :start

:install
:: 先尝试官方源
echo  [依赖] 尝试安装（可能需要 2-5 分钟）...
call npm install --prefer-offline 2>install_err.tmp
if not errorlevel 1 (
    del install_err.tmp >nul 2>&1
    echo  [OK] 依赖安装成功
    goto :start
)

:: 失败则尝试 --ignore-scripts（跳过 better-sqlite3 编译）
echo  [依赖] 标准安装失败（可能缺少 C++ 构建工具）
echo  [依赖] 尝试跳过原生模块编译...
call npm install --ignore-scripts --prefer-offline 2>nul
if errorlevel 1 (
    echo.
    echo  [错误] 依赖安装失败
    echo.
    echo  解决方案：
    echo  1. 以管理员身份重新运行本脚本
    echo  2. 或安装 C++ 构建工具后重试：
    echo     winget install Microsoft.VisualStudio.2022.BuildTools
    echo.
    del install_err.tmp >nul 2>&1
    pause
    exit /b 1
)
del install_err.tmp >nul 2>&1
echo  [警告] 以兼容模式安装完成（数据库功能可能受限）
echo  [提示] 如需完整功能，请安装 Visual Studio C++ 构建工具后重新安装依赖

:start
echo.
echo  ══════════════════════════════════════════
echo   启动 OpenClaw Server（端口 3211）...
echo  ══════════════════════════════════════════
echo.

:: 尝试用 tsx 启动后端
where tsx >nul 2>&1
if not errorlevel 1 (
    start "OpenClaw-Server" cmd /k "title OpenClaw Server && tsx src/server/index.ts"
    goto :open_browser
)

:: 尝试用本地 tsx
if exist node_modules\.bin\tsx.cmd (
    start "OpenClaw-Server" cmd /k "title OpenClaw Server && node_modules\.bin\tsx src/server/index.ts"
    goto :open_browser
)

:: 尝试用 ts-node
if exist node_modules\.bin\ts-node.cmd (
    start "OpenClaw-Server" cmd /k "title OpenClaw Server && node_modules\.bin\ts-node src/server/index.ts"
    goto :open_browser
)

echo  [错误] 找不到 TypeScript 运行时（tsx / ts-node）
echo  请运行：npm install
pause
exit /b 1

:open_browser
:: 等待服务器启动
echo  [等待] 服务器启动中（3秒）...
timeout /t 3 /nobreak >nul

:: 检查前端是否可以启动
if exist node_modules\next (
    echo  [启动] 前端界面（端口 3210）...
    start "OpenClaw-Web" cmd /k "title OpenClaw Web && node_modules\.bin\next dev -p 3210"
    timeout /t 4 /nobreak >nul
    echo  [完成] 正在打开浏览器...
    start http://localhost:3210
) else (
    echo  [提示] 前端模块未找到，请在 Cloudflare Pages 访问界面
    echo         https://openclaw-visual-interface.pages.dev
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
