---
name: openclaw-portal
description: 连接 OpenClaw Visual Portal，将本机 Agent 注册到统一管理面板，支持多机互联、消息互通和知识共享。
---

# OpenClaw Portal 技能

本技能在后台运行一个桥接进程，将当前 OpenClaw 实例注册到 OpenClaw Visual Portal，实现：
- 在 Dashboard 中可视化显示本机 Agent 节点
- 与其他机器的 Agent 互发消息
- 在多个 Agent 之间共享知识和经验

## 桥接进程状态

当用户询问 Portal 连接状态时，运行：
```
node ~/.openclaw/workspace/skills/openclaw-portal/scripts/bridge.js --status
```

## 启动 / 停止桥接

启动：
```
node ~/.openclaw/workspace/skills/openclaw-portal/scripts/bridge.js --start
```

停止：
```
node ~/.openclaw/workspace/skills/openclaw-portal/scripts/bridge.js --stop
```

## 向其他 Agent 发送消息

用户要给某个 Agent 发消息时，运行桥接的消息命令：
```
node ~/.openclaw/workspace/skills/openclaw-portal/scripts/bridge.js --send "<agent-id>" "<message>"
```

## Portal 地址

默认连接 `https://openclaw-api.kunpeng-ai.com`。
用户可通过 `~/.openclaw/workspace/skills/openclaw-portal/assets/config.json` 修改。

## 安装说明

首次使用时告知用户运行安装脚本：
- Windows：双击 `scripts/install.bat`
- Mac/Linux：运行 `bash scripts/install.sh`
