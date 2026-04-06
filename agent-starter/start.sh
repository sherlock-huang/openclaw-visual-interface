#!/bin/bash

echo ""
echo " =========================================="
echo "  OpenClaw Agent 启动器"
echo " =========================================="
echo ""

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo " [错误] 未检测到 Node.js"
    echo ""
    echo " 安装方法："
    echo "   Mac:   brew install node"
    echo "   或访问 https://nodejs.org/zh-cn/download"
    echo ""
    exit 1
fi

NODE_VER=$(node -v)
echo " [OK] Node.js $NODE_VER 已检测到（不会修改你的环境）"

# 版本检查
node -e "process.exit(parseInt(process.version.slice(1)) >= 14 ? 0 : 1)" 2>/dev/null
if [ $? -ne 0 ]; then
    echo " [警告] Node.js 版本过低（需要 14+，当前 $NODE_VER）"
    echo " 请更新：https://nodejs.org/zh-cn/download"
    exit 1
fi

# 检查文件
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

if [ ! -f "my-agent.js" ]; then
    echo " [错误] 找不到 my-agent.js"
    exit 1
fi

if [ ! -f "openclaw.js" ]; then
    echo " [错误] 找不到 openclaw.js"
    exit 1
fi

echo " [OK] 文件检查通过"
echo ""
echo " =========================================="
echo "  提示：连接前请确保服务器和隧道已启动"
echo " =========================================="
echo ""
echo " 正在启动 Agent，按 Ctrl+C 可停止..."
echo ""

node my-agent.js
