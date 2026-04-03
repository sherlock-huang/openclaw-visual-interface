# OpenClaw — 可视化多智能体管理平台

## 项目概述

OpenClaw 是一个像素风格的多龙虾（Agent）可视化管理平台，支持：

- 多台机器或同一机器上不同 sub-agent 的实时可视化
- Agent 之间的即时通信
- Agent 之间传授/共享经验（知识库）
- 与其他平台（Claude Code、Codex）的互联（低优先级）

---

## 技术架构

```
┌─────────────────────────────────────────────────────┐
│                   Browser Dashboard                  │
│   Next.js 15 + Tailwind (像素风)                     │
│   D3.js 网络拓扑图 + Socket.io Client                │
└─────────────────┬───────────────────────────────────┘
                  │ WebSocket (Socket.io)
┌─────────────────▼───────────────────────────────────┐
│               OpenClaw Server :3211                  │
│   Express.js + Socket.io Server                      │
│   Agent Registry (内存 + SQLite)                     │
│   Message Router                                     │
│   Experience Vault (SQLite)                          │
└────────────────────┬────────────────────────────────┘
         ┌───────────┴──────────────┐
         │                          │
┌────────▼─────────┐    ┌──────────▼──────────┐
│  OpenClaw Agent  │    │  Claude Code Agent  │
│  (本机 / 远程)    │    │  (via SDK adapter)  │
│  SDK Client      │    │  (低优先级)          │
└──────────────────┘    └─────────────────────┘
```

### 目录结构

```
openclaw-ui/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx
│   │   ├── page.tsx            # → Dashboard
│   │   └── globals.css
│   ├── components/
│   │   ├── Dashboard.tsx       # 主仪表盘
│   │   ├── pixel/              # 像素风 UI 组件
│   │   │   ├── PixelCard.tsx
│   │   │   ├── PixelButton.tsx
│   │   │   ├── PixelBadge.tsx
│   │   │   └── LobsterSprite.tsx  # 像素龙虾 SVG
│   │   ├── network/
│   │   │   └── NetworkGraph.tsx   # D3 力导向图
│   │   ├── agents/
│   │   │   └── AgentCard.tsx
│   │   └── chat/
│   │       └── MessageFeed.tsx
│   ├── lib/
│   │   ├── store.ts            # Zustand 状态
│   │   └── socket.ts           # Socket.io 客户端封装
│   ├── server/
│   │   ├── index.ts            # Express + Socket.io 服务
│   │   ├── agentRegistry.ts    # Agent 注册/心跳管理
│   │   └── db.ts               # SQLite 数据库
│   ├── sdk/
│   │   └── OpenClawClient.ts   # Agent 接入 SDK
│   └── types/
│       ├── agent.ts
│       ├── message.ts
│       └── index.ts
├── scripts/
│   └── demo-agents.ts          # 演示用虚拟 Agent
└── PLAN.md                     # 本文件
```

---

## 迭代计划

### ✅ Phase 0 — 工程脚手架（当前）

- [x] 项目初始化（Next.js 15 + TypeScript）
- [x] 像素风设计系统（Press Start 2P 字体 / 调色板 / 组件）
- [x] WebSocket 服务器（Express + Socket.io）
- [x] SQLite 数据持久化
- [x] Agent 注册/心跳/离线检测
- [x] D3 力导向网络拓扑图
- [x] 消息通信 Feed
- [x] Agent SDK 客户端
- [x] 像素龙虾 SVG Sprite

---

### 🔜 Phase 1 — 核心功能完善

**目标：** 真实 Agent 可接入，完整通信流程可用

- [ ] **Agent 注册表扩展**
  - Agent 分组（按机器/角色）
  - Agent 标签系统
  - 连接历史记录

- [ ] **消息系统增强**
  - 消息确认/重试机制
  - 消息历史搜索
  - 消息类型图标（任务/结果/经验/广播）
  - 消息气泡动画（发送时像素风弹出）

- [ ] **网络图增强**
  - 消息流动动画（沿连线飞行的粒子）
  - 机器分组（同一 host 的 agent 聚合显示）
  - 节点大小反映活跃度
  - 双击节点展开详情

- [ ] **Experience Vault 完善**
  - 按类别浏览经验
  - Agent 间一键传授
  - 经验相似度匹配（基于标签）
  - 经验使用次数统计

---

### 🔜 Phase 2 — 跨机器部署

**目标：** 支持不同机器上的 Agent 互联

- [ ] **TLS/WSS 支持**（远程机器安全连接）
- [ ] **Agent 认证**（token-based）
- [ ] **NAT 穿透**（STUN/TURN 或 relay）
- [ ] **延迟/带宽显示**（节点连线颜色反映延迟）
- [ ] **多服务器联邦**（多个 OpenClaw Server 互联）

---

### 🔜 Phase 3 — 智能协作

**目标：** Agent 能自主分工、协作完成任务

- [ ] **任务队列可视化**（看板式任务分配）
- [ ] **能力匹配路由**（自动把任务发给最合适的 Agent）
- [ ] **经验蒸馏**（多 Agent 经验合并→生成摘要经验）
- [ ] **工作流编排**（拖拽连线式工作流 DAG）

---

### 🔜 Phase 4 — 跨平台对接（低优先级）

**目标：** 与其他 AI 工具平台互联

- [ ] **Claude Code 适配器**
  - 监听 Claude Code 工具调用事件
  - 转发到 OpenClaw 网络

- [ ] **Codex/OpenAI 适配器**
  - OpenAI Assistant API → OpenClaw 消息协议桥接

- [ ] **通用 HTTP Webhook 接入**
  - 任意工具通过 REST 接入 OpenClaw 网络

---

## 快速开始

### 启动服务

```bash
cd openclaw-ui
npm install
npm run dev          # 同时启动 Next.js(:3210) + Server(:3211)
```

### 接入 Agent（示例）

```typescript
import { OpenClawClient } from "./src/sdk/OpenClawClient";

const lobster = new OpenClawClient({
  name: "Coder-01",
  role: "worker",
  capabilities: [
    { name: "typescript", level: 95 },
    { name: "react", level: 88 },
  ],
});

await lobster.connect();

// 监听消息
lobster.onMessage((msg) => {
  if (msg.type === "task") {
    console.log("Got task:", msg.content);
    lobster.sendResult(msg.fromId, "Task completed!", msg.id);
  }
});

// 发布经验
await lobster.publishExperience(
  "typescript",
  "使用 satisfies 操作符可以在保留类型推断的同时验证对象结构",
  ["typescript", "type-system"],
  92
);

// 广播
lobster.broadcast("Coder-01 online and ready!");
```

### 运行演示

```bash
npm run demo    # 启动5个虚拟龙虾演示互联
```

---

## 消息协议

```
Agent → Server → Agent(s)

消息类型:
  chat        普通对话
  task        任务分配（带 payload 结构化数据）
  result      任务结果
  experience  经验传授通知
  broadcast   广播所有在线 Agent
  ping/pong   心跳
  join/leave  加入/离开网络
  sync        状态同步
  error       错误通知
```

---

## 像素风设计规范

- 字体：Press Start 2P（所有标题/标签）/ Courier New（内容文本）
- 主色：`#00ff41`（绿，Active）/ `#ffff00`（黄，Idle）/ `#ff8c00`（橙，Busy）
- 错误色：`#ff2244` / 离线色：`#444466`
- 背景：`#0a0a0f` / 表面：`#12121a` / 边框：`#2a2a3f`
- 效果：CRT 扫描线叠加 / 发光滤镜 / 像素边框无圆角
- 龙虾 Sprite：16×16 像素 SVG，状态色驱动
