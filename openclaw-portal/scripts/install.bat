@echo off
chcp 65001 >nul
title OpenClaw Portal 安装

echo.
echo  ==========================================
echo   OpenClaw Portal 技能安装
echo  ==========================================
echo.

:: 检查 Node.js
where node >nul 2>&1
if errorlevel 1 (
    echo  [错误] 未找到 Node.js，请先安装：
    echo         https://nodejs.org/zh-cn/download
    pause
    exit /b 1
)
for /f %%v in ('node -v') do set NODE_VER=%%v
echo  [OK] Node.js %NODE_VER%

:: 确定路径
set SKILL_SRC=%~dp0..
set SKILL_DST=%USERPROFILE%\.openclaw\workspace\skills\openclaw-portal

:: 创建目标目录
if not exist "%USERPROFILE%\.openclaw\workspace\skills" (
    mkdir "%USERPROFILE%\.openclaw\workspace\skills"
)
mkdir "%SKILL_DST%\scripts" 2>nul
mkdir "%SKILL_DST%\assets"  2>nul

:: 复制文件
echo  [安装] 复制技能文件...
copy /Y "%SKILL_SRC%\SKILL.md"           "%SKILL_DST%\SKILL.md" >nul
copy /Y "%SKILL_SRC%\scripts\bridge.js"  "%SKILL_DST%\scripts\bridge.js" >nul
copy /Y "%SKILL_SRC%\assets\config.json" "%SKILL_DST%\assets\config.json" >nul
echo  [OK] 文件已复制到 %SKILL_DST%

:: 设置 Agent 名称
echo.
set /p AGENT_NAME="  请输入你的 Agent 名称（留空使用主机名 %COMPUTERNAME%）: "
if not "%AGENT_NAME%"=="" (
    node -e "const f='%SKILL_DST%\\assets\\config.json'.replace(/\\/g,'\\\\');const c=JSON.parse(require('fs').readFileSync(f,'utf8'));c.agentName='%AGENT_NAME%';require('fs').writeFileSync(f,JSON.stringify(c,null,2));"
    echo  [OK] Agent 名称设置为: %AGENT_NAME%
)

:: 设置开机自启动
echo.
set /p AUTO="  是否设置开机自动启动？(Y/N): "
if /i "%AUTO%"=="Y" (
    set STARTUP_KEY=HKCU\Software\Microsoft\Windows\CurrentVersion\Run
    reg add "%STARTUP_KEY%" /v "OpenClawPortalBridge" /t REG_SZ /d "node \"%SKILL_DST%\scripts\bridge.js\"" /f >nul
    echo  [OK] 已添加到开机启动项
)

:: 立即启动
echo.
echo  [启动] 启动 Portal 桥接...
start /B node "%SKILL_DST%\scripts\bridge.js"
timeout /t 2 /nobreak >nul
node "%SKILL_DST%\scripts\bridge.js" --status

echo.
echo  ==========================================
echo   安装完成！
echo   打开 Dashboard 查看你的 Agent：
echo   https://openclaw-visual-interface.pages.dev
echo  ==========================================
echo.
pause
