@echo off
chcp 65001 >nul
title OpenClaw Server

echo.
echo  ==========================================
echo   OpenClaw Server 启动中...
echo  ==========================================
echo.

:: ── 检查 Node.js ──────────────────────────────────────────
where node >nul 2>&1
if errorlevel 1 (
    echo  [错误] 未检测到 Node.js，请先安装：
    echo         https://nodejs.org/zh-cn/download
    echo.
    pause
    exit /b 1
)
for /f %%a in ('node -v') do set NODE_VER=%%a
echo  [OK] Node.js %NODE_VER%

:: ── 检查端口 3211 ─────────────────────────────────────────
netstat -ano | findstr ":3211" | findstr "LISTENING" >nul 2>&1
if not errorlevel 1 (
    echo.
    echo  [错误] 端口 3211 已被占用
    echo  请先关闭已运行的 OpenClaw Server 窗口，或重启电脑
    echo.
    pause
    exit /b 1
)
echo  [OK] 端口 3211 可用

:: ── 安装依赖 ──────────────────────────────────────────────
if not exist node_modules\tsx (
    if not exist node_modules (
        echo  [依赖] 未检测到 node_modules，开始安装...
    ) else (
        echo  [依赖] 检测到依赖不完整，重新安装...
    )
    echo.
    echo  尝试标准安装...
    call npm install --prefer-offline
    if errorlevel 1 (
        echo.
        echo  标准安装失败，改用兼容模式（跳过原生模块编译）...
        call npm install --ignore-scripts --prefer-offline
        if errorlevel 1 (
            echo.
            echo  [错误] 依赖安装失败，请以管理员身份运行此脚本
            pause
            exit /b 1
        )
        echo  [警告] 以兼容模式安装，数据不会持久化（内存模式）
    )
    echo.
    echo  [OK] 依赖安装完成
    echo.
)

:: ── 查找 tsx 路径 ─────────────────────────────────────────
set TSX_CMD=
where tsx >nul 2>&1
if not errorlevel 1 (
    set TSX_CMD=tsx
    goto :run
)
if exist node_modules\.bin\tsx.cmd (
    set TSX_CMD=node_modules\.bin\tsx
    goto :run
)
if exist node_modules\.bin\ts-node.cmd (
    set TSX_CMD=node_modules\.bin\ts-node
    goto :run
)

echo  [错误] 找不到 tsx 或 ts-node
echo  请运行：npm install
pause
exit /b 1

:run
echo  ==========================================
echo   启动服务器 ... 按 Ctrl+C 停止
echo   日志输出如下：
echo  ==========================================
echo.

:: 直接在当前窗口运行，所有错误日志可见
%TSX_CMD% src/server/index.ts

echo.
echo  [!] 服务器已停止
pause
