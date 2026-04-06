#!/bin/bash
# OpenClaw Portal 技能安装脚本 (Mac / Linux)

SKILL_NAME="openclaw-portal"
SKILL_SRC="$(cd "$(dirname "$0")/.." && pwd)"
SKILL_DST="$HOME/.openclaw/workspace/skills/$SKILL_NAME"

echo ""
echo " =========================================="
echo "  OpenClaw Portal 安装"
echo " =========================================="
echo ""

# 检查 Node.js
if ! command -v node &>/dev/null; then
  echo " [错误] 未找到 Node.js，请先安装："
  echo "   https://nodejs.org/zh-cn/download"
  exit 1
fi
echo " [OK] Node.js $(node -v)"

# 创建目标目录
mkdir -p "$SKILL_DST/scripts" "$SKILL_DST/assets"

# 复制文件
echo " [安装] 复制技能文件到 $SKILL_DST"
cp "$SKILL_SRC/SKILL.md"              "$SKILL_DST/SKILL.md"
cp "$SKILL_SRC/scripts/bridge.js"     "$SKILL_DST/scripts/bridge.js"
cp "$SKILL_SRC/assets/config.json"    "$SKILL_DST/assets/config.json"

# 设置 Agent 名称
echo ""
printf " 请输入你的 Agent 名称（留空使用主机名 $(hostname)）: "
read AGENT_NAME
# 去除可能的 \r（Windows 换行残留）
AGENT_NAME="${AGENT_NAME//$'\r'/}"
# 留空则用主机名
if [ -z "$AGENT_NAME" ]; then
  AGENT_NAME="$(hostname)"
fi

# 直接写入 config.json（避免 node -e 转义问题）
cat > "$SKILL_DST/assets/config.json" << JSONEOF
{
  "portalUrl": "https://openclaw-api.kunpeng-ai.com",
  "agentName": "$AGENT_NAME",
  "agentRole": "worker",
  "capabilities": [],
  "autoStart": true
}
JSONEOF
echo " [OK] Agent 名称设置为: $AGENT_NAME"

# 设置自动启动
echo ""
printf " 是否设置开机自动启动？(y/N): "
read AUTO
AUTO="${AUTO//$'\r'/}"
if [[ "$AUTO" =~ ^[Yy]$ ]]; then
  SHELL_RC="$HOME/.bashrc"
  [ -f "$HOME/.zshrc" ] && SHELL_RC="$HOME/.zshrc"
  if ! grep -q "openclaw-portal" "$SHELL_RC" 2>/dev/null; then
    cat >> "$SHELL_RC" << EOF

# OpenClaw Portal Bridge
if command -v node &>/dev/null && [ -f "$SKILL_DST/scripts/bridge.js" ]; then
  node "$SKILL_DST/scripts/bridge.js" &>/dev/null &
fi
EOF
    echo " [OK] 已添加到 $SHELL_RC"
  else
    echo " [OK] 自动启动已存在，跳过"
  fi
fi

# 杀掉旧进程，立即启动
pkill -f "node.*openclaw-portal.*bridge.js" 2>/dev/null || true
sleep 0.5

echo ""
echo " [启动] 启动 Portal 桥接..."
nohup node "$SKILL_DST/scripts/bridge.js" >> "$HOME/.openclaw/portal-bridge.log" 2>&1 &
sleep 2
node "$SKILL_DST/scripts/bridge.js" --status

echo ""
echo " =========================================="
echo "  安装完成！"
echo "  打开 Dashboard 查看你的 Agent："
echo "  https://openclaw-visual-interface.pages.dev"
echo " =========================================="
echo ""
