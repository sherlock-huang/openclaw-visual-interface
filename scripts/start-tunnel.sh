#!/bin/bash
# OpenClaw Cloudflare Tunnel 启动脚本 (macOS/Linux)
# 首次使用前运行: cloudflared login

QUICK=${1:-""}

if [ "$QUICK" = "--quick" ]; then
  echo "[OpenClaw] 启动临时公网隧道..."
  echo "[OpenClaw] 复制输出的 https://xxx.trycloudflare.com 填入 Dashboard 的 CONNECT 框"
  cloudflared tunnel --url http://localhost:3211
else
  echo "[OpenClaw] 启动固定隧道 openclaw-api.kunpeng-ai.com..."
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  cloudflared tunnel --config "$SCRIPT_DIR/../.cloudflared/config.yml" run openclaw-api
fi
