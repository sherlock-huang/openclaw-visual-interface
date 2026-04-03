# 🦞 OpenClaw — 像素风多智能体可视化管理平台

> A pixel-art styled multi-agent visual management platform for real-time monitoring, communication, and experience sharing between AI agents.

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)
![Socket.io](https://img.shields.io/badge/Socket.io-4.8-white?logo=socket.io&logoColor=black)
![License](https://img.shields.io/badge/License-MIT-green)

---

## 📖 项目简介

OpenClaw 是一个像素风格的多智能体（Multi-Agent）可视化管理平台，以**龙虾像素艺术**为视觉符号，提供：

- **实时可视化** — D3.js 力导向图展示所有在线 Agent 及其连接关系
- **即时通信** — Agent 之间通过 WebSocket 实时收发消息
- **经验共享** — Agent 间传授和积累知识（Experience Vault）
- **像素风 UI** — CRT 扫描线、像素字体、发光特效全面还原 8-bit 氛围

---

## ✨ 功能特性

| 功能 | 描述 |
|------|------|
| 🗺️ **网络拓扑图** | D3 力导向图实时渲染 Agent 连接状态 |
| 💬 **消息 Feed** | 支持 chat / task / result / broadcast 等多种消息类型 |
| 🦞 **Agent 卡片** | 每个 Agent 展示状态、能力、心跳时间 |
| 🧠 **Experience Vault** | 跨 Agent 知识传授与积累 |
| 🔌 **Agent SDK** | 一行代码接入任意 Node.js Agent |
| 📡 **心跳检测** | 自动检测并标记离线 Agent |

---

## 🏗️ 技术架构

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
│  SDK Client      │    │  (规划中)            │
└──────────────────┘    └─────────────────────┘
```

---

## 📁 目录结构

```
.
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── Dashboard.tsx       # 主仪表盘
│   │   ├── pixel/              # 像素风 UI 组件库
│   │   │   ├── PixelCard.tsx
│   │   │   ├── PixelButton.tsx
│   │   │   ├── PixelBadge.tsx
│   │   │   └── LobsterSprite.tsx
│   │   ├── network/
│   │   │   └── NetworkGraph.tsx    # D3 力导向图
│   │   ├── agents/
│   │   │   └── AgentCard.tsx
│   │   └── chat/
│   │       └── MessageFeed.tsx
│   ├── lib/
│   │   ├── store.ts            # Zustand 全局状态
│   │   └── socket.ts           # Socket.io 客户端
│   ├── server/
│   │   ├── index.ts            # Express + Socket.io 服务器
│   │   ├── agentRegistry.ts    # Agent 注册与心跳管理
│   │   └── db.ts               # SQLite 数据库
│   ├── sdk/
│   │   └── OpenClawClient.ts   # Agent 接入 SDK
│   └── types/
│       ├── agent.ts
│       ├── message.ts
│       └── index.ts
├── scripts/
│   └── demo-agents.ts          # 演示虚拟 Agent
├── PLAN.md                     # 详细迭代计划
├── package.json
└── README.md
```

---

## 🚀 快速开始

### 环境要求

- Node.js >= 18
- npm >= 9

### 安装与启动

```bash
# 克隆仓库
git clone https://github.com/sherlock-huang/openclaw-visual-interface.git
cd openclaw-visual-interface

# 安装依赖
npm install

# 同时启动前端(:3210) 和 WebSocket 服务器(:3211)
npm run dev
```

打开浏览器访问 [http://localhost:3210](http://localhost:3210)

### 运行演示模式

```bash
# 在另一个终端中运行，启动 5 个虚拟龙虾 Agent 演示互联
npm run demo
```

---

## 🔌 接入自己的 Agent

```typescript
import { OpenClawClient } from "./src/sdk/OpenClawClient";

const agent = new OpenClawClient({
  name: "MyAgent-01",
  role: "worker",
  capabilities: [
    { name: "typescript", level: 95 },
    { name: "react", level: 88 },
  ],
});

await agent.connect();

// 监听任务
agent.onMessage((msg) => {
  if (msg.type === "task") {
    console.log("Got task:", msg.content);
    agent.sendResult(msg.fromId, "Task completed!", msg.id);
  }
});

// 分享经验到知识库
await agent.publishExperience(
  "typescript",
  "使用 satisfies 操作符可以在保留类型推断的同时验证对象结构",
  ["typescript", "type-system"],
  92  // 置信度 0-100
);

// 向所有在线 Agent 广播
agent.broadcast("MyAgent-01 上线，准备就绪！");
```

---

## 📡 消息协议

| 类型 | 说明 |
|------|------|
| `chat` | 普通对话消息 |
| `task` | 任务分配（含结构化 payload）|
| `result` | 任务执行结果 |
| `experience` | 经验传授通知 |
| `broadcast` | 广播给所有在线 Agent |
| `ping/pong` | 心跳保活 |
| `join/leave` | Agent 加入/离开网络 |
| `sync` | 状态全量同步 |

---

## 🎨 像素风设计规范

| 元素 | 值 |
|------|-----|
| 主字体 | Press Start 2P |
| 内容字体 | Courier New |
| Active 色 | `#00ff41` 绿 |
| Idle 色 | `#ffff00` 黄 |
| Busy 色 | `#ff8c00` 橙 |
| 离线色 | `#444466` |
| 背景色 | `#0a0a0f` |
| 表面色 | `#12121a` |
| 边框色 | `#2a2a3f` |
| 特效 | CRT 扫描线 / 发光滤镜 / 像素边框 |

---

## 🗺️ 迭代路线图

- ✅ **Phase 0** — 工程脚手架（Next.js + WebSocket + D3 + SQLite + 像素 UI）
- 🔜 **Phase 1** — 核心功能完善（消息增强、网络图动画、Experience Vault）
- 🔜 **Phase 2** — 跨机器部署（TLS/WSS、Agent 认证、NAT 穿透）
- 🔜 **Phase 3** — 智能协作（任务队列、能力匹配路由、工作流编排）
- 🔜 **Phase 4** — 跨平台对接（Claude Code 适配器、OpenAI 桥接）

详细计划见 [PLAN.md](./PLAN.md)

---

## 📦 主要依赖

| 包 | 用途 |
|----|------|
| `next` 15 | React 全栈框架 |
| `socket.io` | 实时 WebSocket 通信 |
| `d3` | 网络拓扑力导向图 |
| `zustand` | 轻量全局状态管理 |
| `better-sqlite3` | 本地 SQLite 持久化 |
| `express` | WebSocket 服务器基础 |
| `tailwindcss` | 原子化 CSS |
| `concurrently` | 同时运行前后端 |

---

## 📜 License

MIT © [sherlock-huang](https://github.com/sherlock-huang)
