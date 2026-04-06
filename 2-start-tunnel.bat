@echo off
chcp 65001 >nul
title OpenClaw Tunnel

echo.
echo  ==========================================
echo   OpenClaw 隧道启动器
echo  ==========================================
echo.
echo  注意：请先确认 1-start-server.bat 窗口中显示：
echo        "Server is running on port 3211"
echo        再运行本脚本
echo.
pause

:: ── 检查 cloudflared ──────────────────────────────────────
where cloudflared >nul 2>&1
if errorlevel 1 (
    echo.
    echo  [错误] 未找到 cloudflared
    echo.
    echo  安装方法：
    echo    winget install --id Cloudflare.cloudflared
    echo.
    echo  或手动下载并放入 C:\Windows\System32\：
    echo    https://github.com/cloudflare/cloudflared/releases/latest
    echo    下载 cloudflared-windows-amd64.exe，重命名为 cloudflared.exe
    echo.
    pause
    exit /b 1
)
echo  [OK] cloudflared 已安装

:: ── 检查服务器是否在线 ────────────────────────────────────
echo  检测服务器（http://localhost:3211）...
curl -s --max-time 5 http://localhost:3211/api/ping >nul 2>&1
if errorlevel 1 (
    echo.
    echo  [错误] 服务器未响应
    echo.
    echo  请先双击 1-start-server.bat 并等待看到：
    echo    "Server is running on port 3211"
    echo.
    pause
    exit /b 1
)
echo  [OK] 服务器正在运行

:: ── 选择隧道模式 ──────────────────────────────────────────
echo.
echo  选择隧道模式：
echo.
echo  [1] 固定域名   openclaw-api.kunpeng-ai.com
echo      需要已完成 cloudflared tunnel login 和 tunnel create
echo.
echo  [2] 临时隧道   随机 trycloudflare.com 地址（无需配置）
echo      每次重启地址会变，需要在 Dashboard 重新输入
echo.
set /p MODE="输入 1 或 2，按回车: "

if "%MODE%"=="1" goto :fixed
if "%MODE%"=="2" goto :quick
echo  [错误] 请输入 1 或 2
pause
exit /b 1

:fixed
if not exist ".cloudflared\config.yml" (
    echo.
    echo  [错误] 找不到 .cloudflared\config.yml
    echo  请参考 README.md 完成固定隧道配置
    echo  或选择模式 2 使用临时隧道
    echo.
    pause
    exit /b 1
)
findstr "TUNNEL-ID" .cloudflared\config.yml >nul 2>&1
if not errorlevel 1 (
    echo.
    echo  [错误] config.yml 中还有未替换的 TUNNEL-ID
    echo  请用记事本打开并填写真实的隧道 ID
    echo  查看隧道 ID：cloudflared tunnel list
    echo.
    start notepad .cloudflared\config.yml
    pause
    exit /b 1
)
echo.
echo  [启动] 固定隧道 openclaw-api.kunpeng-ai.com
echo  按 Ctrl+C 停止隧道
echo.
cloudflared tunnel --config .cloudflared\config.yml run openclaw-api
goto :end

:quick
echo.
echo  [启动] 临时隧道
echo.
echo  启动后找到 "https://xxxx.trycloudflare.com" 这一行
echo  复制该地址，粘贴到 Dashboard 顶部的连接框，点击 CONNECT
echo.
echo  按 Ctrl+C 停止隧道
echo.
cloudflared tunnel --url http://localhost:3211

:end
echo.
echo  [隧道已停止]
pause
