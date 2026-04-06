@echo off
chcp 65001 >nul
title OpenClaw Tunnel 启动器

echo.
echo  ==========================================
echo   OpenClaw 隧道启动检测中...
echo  ==========================================
echo.

:: ── 1. 检查 cloudflared ───────────────────────────────────
where cloudflared >nul 2>&1
if errorlevel 1 (
    echo  [错误] 未检测到 cloudflared
    echo.
    echo  安装方法（选其一）：
    echo.
    echo  方法一：winget 安装（推荐）
    echo    winget install --id Cloudflare.cloudflared
    echo.
    echo  方法二：手动下载
    echo    1. 下载 cloudflared-windows-amd64.exe
    echo       https://github.com/cloudflare/cloudflared/releases/latest
    echo    2. 重命名为 cloudflared.exe
    echo    3. 放入 C:\Windows\System32\ 目录
    echo.
    pause
    exit /b 1
)
echo  [OK] cloudflared 已安装

:: ── 2. 检查 Server 是否运行 ───────────────────────────────
netstat -ano | findstr ":3211 " | findstr "LISTENING" >nul 2>&1
if errorlevel 1 (
    echo  [警告] OpenClaw Server 未运行（端口 3211 未监听）
    echo.
    echo  请先双击 start.bat 启动 Server，等 Server 窗口出现
    echo  "Server is running on port 3211" 字样后，再运行本脚本
    echo.
    pause
    exit /b 1
)
echo  [OK] Server 正在运行（端口 3211）

:: ── 3. 选择隧道模式 ───────────────────────────────────────
echo.
echo  选择隧道模式：
echo.
echo  [1] 固定域名  openclaw-api.kunpeng-ai.com（需要提前配置）
echo  [2] 临时隧道  随机 trycloudflare.com 地址（无需配置）
echo.
set /p MODE="请输入 1 或 2，按回车确认: "

if "%MODE%"=="1" goto :fixed_tunnel
if "%MODE%"=="2" goto :quick_tunnel

echo  [错误] 请输入 1 或 2
pause
exit /b 1

:fixed_tunnel
if not exist ".cloudflared\config.yml" (
    echo.
    echo  [错误] 未找到 .cloudflared\config.yml 配置文件
    echo.
    echo  请先完成固定隧道配置（参考 README.md 场景 C），
    echo  或选择模式 2 使用临时隧道。
    echo.
    pause
    exit /b 1
)

findstr "<TUNNEL-ID>" .cloudflared\config.yml >nul 2>&1
if not errorlevel 1 (
    echo.
    echo  [错误] 配置文件中还有未填写的 TUNNEL-ID
    echo.
    echo  请用记事本打开 .cloudflared\config.yml
    echo  把 TUNNEL-ID 替换为实际的隧道 ID
    echo.
    echo  查看隧道 ID：cloudflared tunnel list
    echo.
    start notepad .cloudflared\config.yml
    pause
    exit /b 1
)

echo.
echo  [启动] 固定隧道 openclaw-api.kunpeng-ai.com...
echo  [提示] 隧道运行中，关闭本窗口即停止
echo.
cloudflared tunnel --config .cloudflared\config.yml run openclaw-api
goto :end

:quick_tunnel
echo.
echo  [启动] 临时隧道（地址将在下方显示）...
echo.
echo  启动后复制 https://xxxx.trycloudflare.com 地址
echo  粘贴到 Dashboard 顶部 CONNECT 输入框，点击 CONNECT
echo.
cloudflared tunnel --url http://localhost:3211

:end
pause
