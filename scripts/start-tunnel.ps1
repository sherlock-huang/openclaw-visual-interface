# OpenClaw Cloudflare Tunnel 启动脚本 (Windows PowerShell)
# 首次使用前运行: cloudflared login

param(
    [switch]$Quick  # 使用临时隧道（无需配置）
)

if ($Quick) {
    Write-Host "[OpenClaw] 启动临时公网隧道..." -ForegroundColor Cyan
    Write-Host "[OpenClaw] 复制输出的 https://xxx.trycloudflare.com 填入 Dashboard 的 CONNECT 框" -ForegroundColor Yellow
    cloudflared tunnel --url http://localhost:3211
} else {
    Write-Host "[OpenClaw] 启动固定隧道 openclaw-api.kunpeng-ai.com..." -ForegroundColor Cyan
    $configPath = Join-Path $PSScriptRoot "..\\.cloudflared\\config.yml"
    cloudflared tunnel --config $configPath run openclaw-api
}
