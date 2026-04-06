#!/bin/bash
# OpenClaw Portal 技能安装脚本 (Mac / Linux)
# 无侵入接入 OpenClaw Visual Portal

set -e

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

# 检查 OpenClaw 工作区
if [ ! -d "$HOME/.openclaw/workspace" ]; then
  echo " [信息] 创建 OpenClaw 工作区目录..."
  mkdir -p "$HOME/.openclaw/workspace/skills"
fi

# 复制技能文件
echo " [安装] 复制技能文件到 $SKILL_DST"
mkdir -p "$SKILL_DST/scripts" "$SKILL_DST/assets"
cp "$SKILL_SRC/SKILL.md"              "$SKILL_DST/SKILL.md"
cp "$SKILL_SRC/scripts/bridge.js"     "$SKILL_DST/scripts/bridge.js"
cp "$SKILL_SRC/assets/config.json"    "$SKILL_DST/assets/config.json"

# 设置 Agent 名称
echo ""
read -p " 请输入你的 Agent 名称（留空使用主机名）: " AGENT_NAME
if [ -n "$AGENT_NAME" ]; then
  node -e "
    const f='$SKILL_DST/assets/config.json';
    const c=JSON.parse(require('fs').readFileSync(f,'utf8'));
    c.agentName='$AGENT_NAME';
    require('fs').writeFileSync(f,JSON.stringify(c,null,2));
  "
  echo " [OK] Agent 名称设置为: $AGENT_NAME"
fi

# 设置自动启动（加入 shell 启动文件）
echo ""
AUTOSTART_CMD="# OpenClaw Portal Bridge
if command -v node &>/dev/null && [ -f \"$SKILL_DST/scripts/bridge.js\" ]; then
  node \"$SKILL_DST/scripts/bridge.js\" &>/dev/null &
fi"

SHELL_RC="$HOME/.bashrc"
[ -f "$HOME/.zshrc" ] && SHELL_RC="$HOME/.zshrc"

if ! grep -q "openclaw-portal" "$SHELL_RC" 2>/dev/null; then
  read -p " 是否设置开机自动启动？(y/N): " AUTO
  if [[ "$AUTO" =~ ^[Yy]$ ]]; then
    echo "" >> "$SHELL_RC"
    echo "$AUTOSTART_CMD" >> "$SHELL_RC"
    echo " [OK] 已添加到 $SHELL_RC"
  fi
fi

# 立即启动桥接
echo ""
echo " [启动] 立即启动 Portal 桥接..."
node "$SKILL_DST/scripts/bridge.js" &
sleep 2
node "$SKILL_DST/scripts/bridge.js" --status

echo ""
echo " =========================================="
echo "  安装完成！"
echo "  打开 Dashboard 查看你的 Agent："
echo "  https://openclaw-visual-interface.pages.dev"
echo " =========================================="
echo ""
