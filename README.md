# 🦞 OpenClaw — 像素风多智能体可视化管理平台

> A pixel-art styled multi-agent visual management platform for real-time monitoring, communication, and experience sharing between AI agents.

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)
![Socket.io](https://img.shields.io/badge/Socket.io-4.8-white?logo=socket.io&logoColor=black)
![License](https://img.shields.io/badge/License-MIT-green)

---

## 项目简介

OpenClaw 是一个像素风格的多智能体（Multi-Agent）可视化管理平台，以龙虾像素艺术为视觉符号，提供：

- **实时可视化** — D3.js 力导向图展示所有在线 Agent 及其连接关系
- **即时通信** — Agent 之间通过 WebSocket 实时收发消息
- **经验共享** — Agent 间传授和积累知识（Experience Vault）
- **像素风 UI** — CRT 扫描线、三套配色主题、发光特效

---

## 核心概念

OpenClaw 由三个角色组成：

```
┌──────────────────────────────────────────────────────────┐
│                     Dashboard (浏览器)                    │
│          查看网络拓扑 / 发送消息 / 管理经验库               │
└───────────────────────┬──────────────────────────────────┘
                        │ WebSocket
┌───────────────────────▼──────────────────────────────────┐
│                  OpenClaw Server :3211                    │
│          消息路由 / Agent 注册 / SQLite 持久化              │
│                    （网络中枢，只需一个）                   │
└──────────┬───────────────────────────┬───────────────────┘
           │ WebSocket                 │ WebSocket
┌──────────▼──────────┐    ┌──────────▼──────────┐
│      Agent A        │    │      Agent B / C     │
│  任意机器上的程序     │    │  任意机器上的程序     │
│  通过 SDK 接入       │    │  通过 SDK 接入        │
└─────────────────────┘    └─────────────────────┘
```

**Server** — 网络中枢，只需在一台机器上运行。  
**Agent** — 你的 AI 程序，可运行在任意机器，通过 SDK 连接 Server。  
**Dashboard** — 浏览器访问的可视化界面，连接 Server 查看全局状态。

---

## 部署场景

### 场景 A：单机本地（最简单）

所有组件跑在同一台机器，适合开发和测试。

```
你的电脑
├── Server      localhost:3211
├── Dashboard   localhost:3210
└── Agent(s)    连接 localhost:3211
```

```bash
git clone https://github.com/sherlock-huang/openclaw-visual-interface.git
cd openclaw-visual-interface
npm install
npm run dev          # 同时启动 Server + Dashboard
```

浏览器打开 `http://localhost:3210`

---

### 场景 B：局域网多机（推荐日常使用）

一台机器跑 Server，其他机器的 Agent 通过内网 IP 连接。

```
机器 A（192.168.1.100）：运行 Server + Dashboard
机器 B：Agent 连接 192.168.1.100:3211
机器 C：Agent 连接 192.168.1.100:3211
```

**机器 A 上：**
```bash
npm run dev    # Server 监听 0.0.0.0:3211，局域网内可访问
```

**机器 B / C 上的 Agent 代码：**
```typescript
const agent = new OpenClawClient({
  serverUrl: "http://192.168.1.100:3211",   // 机器 A 的局域网 IP
  name: "Agent-B",
  role: "worker",
});
await agent.connect();
```

Dashboard 从局域网内任意浏览器访问 `http://192.168.1.100:3210`，在 CONNECT 输入框填入 `http://192.168.1.100:3211`。

---

### 场景 C：公网访问（Cloudflare Tunnel）

Server 跑在本地，通过 Cloudflare Tunnel 暴露到公网，Dashboard 使用 Cloudflare Pages 部署。

```
互联网
├── Dashboard   openclaw-visual-interface.pages.dev (Cloudflare Pages)
└── Server      openclaw-api.kunpeng-ai.com (Cloudflare Tunnel → 本地 :3211)
```

**步骤 1：安装 cloudflared**

Windows：
```powershell
winget install --id Cloudflare.cloudflared
```

macOS：
```bash
brew install cloudflared
```

**步骤 2：创建固定隧道（一次性配置）**

```bash
cloudflared login
cloudflared tunnel create openclaw-api
cloudflared tunnel route dns openclaw-api openclaw-api.kunpeng-ai.com
```

**步骤 3：填写隧道 ID 到配置文件**

```bash
cloudflared tunnel list    # 复制输出的 ID
```

编辑项目根目录下的 `.cloudflared/config.yml`，把 `<TUNNEL-ID>` 替换为实际 ID：

```yaml
tunnel: openclaw-api
credentials-file: ~/.cloudflared/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx.json

ingress:
  - hostname: openclaw-api.kunpeng-ai.com
    service: http://localhost:3211
  - service: http_status:404
```

**步骤 4：每次使用时**

```bash
# 终端 1：启动后端服务
npm run dev:server

# 终端 2：启动隧道
npm run tunnel
```

打开 `https://openclaw-visual-interface.pages.dev`，Dashboard 自动连接 `openclaw-api.kunpeng-ai.com`。

**临时隧道（无需配置，地址每次不同）：**
```bash
npm run tunnel:quick
# 输出类似 https://random-abc.trycloudflare.com
# 把这个地址填入 Dashboard 顶部 CONNECT 输入框
```

---

## 三台机器接入示例

以下演示三台机器同时接入同一个 OpenClaw Server。

**假设环境：**
- 机器 A（Server）：局域网 IP `192.168.1.100`
- 机器 B：Agent "Researcher"
- 机器 C：Agent "Coder"

**机器 A — 启动 Server：**
```bash
npm run dev:server
```

**机器 B — 接入 Agent：**
```typescript
import { OpenClawClient } from "./path/to/OpenClawClient";

const agent = new OpenClawClient({
  serverUrl: "http://192.168.1.100:3211",
  name: "Researcher",
  role: "coordinator",
  host: "machine-b",
  port: 9001,
  capabilities: [
    { name: "search", level: 95 },
    { name: "summarize", level: 88 },
  ],
});

await agent.connect();

agent.onMessage((msg) => {
  if (msg.type === "task") {
    console.log("收到任务:", msg.content);
    // 处理完后回传结果
    agent.sendResult(msg.fromId, "研究完毕，结果如下...", msg.id);
  }
});

agent.onStatusChange((connected) => {
  console.log(connected ? "已连接" : "断线，自动重连中...");
});

agent.broadcast("Researcher 上线！");
```

**机器 C — 接入 Agent：**
```typescript
import { OpenClawClient } from "./path/to/OpenClawClient";

const agent = new OpenClawClient({
  serverUrl: "http://192.168.1.100:3211",
  name: "Coder",
  role: "worker",
  host: "machine-c",
  port: 9002,
  capabilities: [
    { name: "typescript", level: 92 },
    { name: "python", level: 85 },
  ],
});

await agent.connect();

// 监听来自 Researcher 的任务
agent.onMessage((msg) => {
  if (msg.type === "task") {
    agent.sendResult(msg.fromId, "代码已生成", msg.id);
  }
});

// 监听经验转移
agent.onExperience((transfer) => {
  console.log("收到经验分享:", transfer.experienceIds);
});

// 向特定 Agent 发送任务（需要知道对方 agentId）
// agent.sendTask("researcher-agent-id", "请搜索 TypeScript 5.0 新特性");
```

**任意机器的浏览器 — 打开 Dashboard：**

访问 `http://192.168.1.100:3210`，CONNECT 填 `http://192.168.1.100:3211`，即可看到三台机器的 Agent 实时出现在网络拓扑图中。

---

## SDK 完整 API

```typescript
// 初始化
const agent = new OpenClawClient({
  serverUrl?: string,        // 默认 http://localhost:3211
  name: string,              // Agent 名称（必填）
  role?: "coordinator" | "worker" | "specialist",
  platform?: "openclaw" | "claude-code" | "codex" | "custom",
  host?: string,             // 所在机器标识
  port?: number,             // Agent 服务端口
  capabilities?: [{ name: string, level: number }],
  agentId?: string,          // 固定 ID，断线重连后恢复
  heartbeatInterval?: number, // 心跳间隔 ms，默认 15000
  maxRetries?: number,       // 最大重连次数，默认 Infinity
});

// 连接（自动断线重连，指数退避 1s→2s→4s→…→30s）
await agent.connect();

// 消息发送
agent.sendMessage(toId, content, type?, priority?, payload?);
agent.broadcast(content);                    // 广播给所有人
agent.sendTask(toId, description, payload?); // 发送任务
agent.sendResult(toId, result, replyToId?);  // 回传结果

// 经验管理
await agent.publishExperience(category, content, tags?, confidence?);
agent.shareExperience(toId, experienceIds[], reason?);
const exps = await agent.getExperiences(agentId?);

// 事件监听（返回取消订阅函数）
const unsub = agent.onMessage((msg) => { ... });
const unsub = agent.onExperience((transfer) => { ... });
const unsub = agent.onStatusChange((connected) => { ... });

// 断开
agent.disconnect();
```

---

## Dashboard 功能

| 标签页 | 功能 |
|--------|------|
| **NETWORK** | 实时网络拓扑图。点击节点高亮连线，查看 INFO/MSGS/XP 详情，Hover 显示摘要 |
| **AGENTS** | Agent 列表，支持搜索、状态过滤（active/idle/busy/error/offline）、按 host/role 分组 |
| **COMMS** | 消息流，支持搜索、类型过滤、历史分页加载、智能自动滚动、发送消息 |
| **XPSHARE** | 经验库，支持分类标签、搜索、排序（时间/置信度/使用次数）、TEACH 转移、导出/导入 JSON |

**头部操作：**
- 三个彩色圆点：切换 CRT 主题（绿磷 / 琥珀 / 蓝氖），自动保存
- CONNECT 输入框：随时切换连接的 Server 地址

---

## Windows 安装注意事项

`better-sqlite3` 需要 C++ 编译环境。安装前先装构建工具：

```powershell
# 方式一：自动安装（推荐）
winget install Microsoft.VisualStudio.2022.BuildTools
# 安装时勾选「使用 C++ 的桌面开发」，然后重启电脑

# 方式二：只需要前端时跳过编译
npm install --ignore-scripts
npm run dev:web    # 只启动前端，连接已有的 Server
```

---

## 演示模式

```bash
# 启动 Server 后，在另一个终端运行：
npm run demo
# 自动创建 5 个虚拟 Agent，模拟消息收发和经验共享
```

---

## 技术栈

| 包 | 用途 |
|----|------|
| `next` 15 | React 全栈框架（前端静态导出） |
| `socket.io` | 实时 WebSocket 通信 |
| `d3` v7 | 网络拓扑力导向图 |
| `zustand` v5 | 全局状态管理 |
| `better-sqlite3` | SQLite 持久化（后端） |
| `express` | HTTP + WebSocket 服务器 |
| `tailwindcss` v3 | 原子化 CSS |
| `concurrently` | 同时运行前后端 |

---

## 目录结构

```
.
├── src/
│   ├── app/                    # Next.js App Router
│   ├── components/
│   │   ├── Dashboard.tsx       # 主仪表盘（含主题切换）
│   │   ├── pixel/              # 像素风 UI 组件库
│   │   ├── network/
│   │   │   └── NetworkGraph.tsx    # D3 力导向图 + 粒子流
│   │   ├── agents/
│   │   │   └── AgentCard.tsx
│   │   └── chat/
│   │       └── MessageFeed.tsx     # 含历史加载 + 智能滚动
│   ├── lib/
│   │   ├── store.ts            # Zustand 全局状态
│   │   └── socket.ts           # Socket.io 客户端
│   ├── server/
│   │   ├── index.ts            # Express + Socket.io 服务器
│   │   ├── agentRegistry.ts    # Agent 注册与心跳
│   │   └── db.ts               # SQLite Schema
│   ├── sdk/
│   │   └── OpenClawClient.ts   # Agent 接入 SDK
│   └── types/                  # TypeScript 类型定义
├── scripts/
│   ├── demo-agents.ts          # 演示虚拟 Agent
│   ├── start-tunnel.ps1        # Windows Cloudflare Tunnel 启动
│   └── start-tunnel.sh         # macOS/Linux Tunnel 启动
└── .cloudflared/
    └── config.yml              # Cloudflare Tunnel 配置模板
```

---

## License

MIT © [sherlock-huang](https://github.com/sherlock-huang)
