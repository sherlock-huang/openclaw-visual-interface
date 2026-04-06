#!/bin/bash
# OpenClaw Agent — 随 Claude Code 自动启动
# 在后台把本机注册为 OpenClaw 网络节点

AGENT_DIR="$CLAUDE_PROJECT_DIR/agent-starter"
AGENT_SCRIPT="$AGENT_DIR/my-agent.js"
OPENCLAW_JS="$AGENT_DIR/openclaw.js"
LOG_FILE="$AGENT_DIR/agent.log"

# 检查必要文件
if [ ! -f "$AGENT_SCRIPT" ] || [ ! -f "$OPENCLAW_JS" ]; then
  echo "[OpenClaw Hook] agent-starter 文件不存在，跳过" >&2
  exit 0
fi

# 检查 node
if ! command -v node &>/dev/null; then
  echo "[OpenClaw Hook] 未找到 Node.js，跳过" >&2
  exit 0
fi

# 杀掉同项目旧进程（避免重复注册）
pkill -f "node.*my-agent.js" 2>/dev/null || true
sleep 0.5

# 后台启动，日志写入 agent.log
nohup node "$AGENT_SCRIPT" >> "$LOG_FILE" 2>&1 &
echo "[OpenClaw Hook] Agent 已在后台启动 (PID $!)"
echo "[OpenClaw Hook] 日志：$LOG_FILE"
