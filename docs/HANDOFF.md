# OpenClaw Visual Interface — 交接文档

> 编写时间：2026-04-09  
> 当前部署：https://openclaw-visual-interface.pages.dev/  
> 代码仓库：https://github.com/sherlock-huang/openclaw-visual-interface  
> 服务器 API：https://openclaw-api.kunpeng-ai.com

---

## 一、项目概述

OpenClaw Visual Interface 是一个**像素风多智能体可视化管理面板**，核心功能：

- 多台机器上的 AI Agent 实时注册、上线、下线可视化
- Agent 之间的消息通信监控（任务/结果/广播/经验分享）
- 像素办公室区域系统：Agent 按状态自动漂移到对应区域
- 经验库管理：查看、导出、导入、跨 Agent 传递经验
- LobsterSprite（像素龙虾）根据系统整体状态显示情绪

---

## 二、技术架构

```
┌──────────────────────────────────────────────────────┐
│          Browser (Cloudflare Pages 静态部署)           │
│  Next.js 15 + Tailwind CSS + D3.js + Socket.io Client │
│  React 19 + TypeScript + Zustand                      │
└─────────────────────┬────────────────────────────────┘
                      │ WebSocket (Socket.io)
┌─────────────────────▼────────────────────────────────┐
│           OpenClaw Server (Express :3211)              │
│  Socket.io Server / Agent Registry / Message Router   │
│  Experience Vault / SQLite (better-sqlite3)            │
└───────────────┬─────────────────┬─────────────────────┘
                │                 │
    ┌───────────▼──────┐  ┌───────▼──────────────┐
    │  OpenClaw Agent  │  │  Bridge Process       │
    │  (SDK 方式接入)   │  │  (openclaw-portal     │
    │  agent-starter/  │  │   Skill 方式接入)      │
    │  my-agent.js     │  │  openclaw-portal/     │
    └──────────────────┘  └───────────────────────┘
```

**关键端口：**

| 端口 | 用途 |
|------|------|
| 3210 | Next.js Dashboard（本地开发） |
| 3211 | OpenClaw Server（WebSocket + REST API） |
| 8080 | 本地 llama.cpp/Ollama（用户自行启动） |
| 18789 | OpenClaw Gateway（本机 Agent 的 WebSocket 入口） |

---

## 三、目录结构

```
openclaw-visual-interface/
├── src/
│   ├── app/
│   │   ├── page.tsx              # 入口，渲染 <Dashboard />
│   │   ├── layout.tsx            # HTML shell
│   │   └── globals.css           # CRT 特效 + 动画 + 工具类
│   ├── components/
│   │   ├── Dashboard.tsx         # 主界面（Header/Tabs/Footer + 子面板）
│   │   ├── pixel/
│   │   │   ├── LobsterSprite.tsx # 像素龙虾 SVG（支持5种情绪）
│   │   │   ├── PixelCard.tsx     # 通用卡片容器（霓虹边框 + 角标）
│   │   │   ├── PixelButton.tsx   # 按钮
│   │   │   └── PixelBadge.tsx    # 状态/角色徽章
│   │   ├── network/
│   │   │   └── NetworkGraph.tsx  # D3 力导向图 + 区域系统 + 粒子特效
│   │   ├── agents/
│   │   │   └── AgentCard.tsx     # Agent 卡片（AGENTS Tab 和侧边栏）
│   │   └── chat/
│   │       └── MessageFeed.tsx   # 实时消息流
│   ├── lib/
│   │   ├── store.ts              # Zustand 全局状态
│   │   └── socket.ts             # Socket.io 客户端封装 + 状态推断
│   ├── types/
│   │   ├── agent.ts              # Agent / AgentNode / AgentLink 类型
│   │   ├── message.ts            # Socket 事件 + Message + ExperienceTransfer
│   │   └── index.ts
│   ├── sdk/
│   │   └── OpenClawClient.ts     # Agent SDK 源码（打包 → agent-starter/openclaw.js）
│   └── server/
│       ├── index.ts              # Express + Socket.io 服务端
│       ├── agentRegistry.ts      # Agent 心跳 + 离线检测
│       └── db.ts                 # SQLite 初始化
├── openclaw-portal/              # OpenClaw Skill 包（零侵入接入方式）
│   ├── SKILL.md                  # Skill 描述（Claude Code 读取）
│   ├── scripts/
│   │   ├── bridge-src.js         # 桥接进程源码
│   │   ├── bridge.js             # 打包后可执行版本（install 时复制到用户机器）
│   │   ├── install.bat           # Windows 安装脚本
│   │   └── install.sh            # Mac/Linux 安装脚本
│   └── assets/
│       └── config.json           # 默认配置模板
├── agent-starter/                # SDK 方式接入（最小化包）
│   ├── openclaw.js               # 预打包 SDK（不需要 npm install）
│   ├── my-agent.js               # Agent 模板（含 setStatus() 封装）
│   ├── start.bat / start.sh      # 启动脚本
│   └── README.txt
├── scripts/
│   └── demo-agents.ts            # 5个虚拟 Agent（本地测试用）
├── docs/
│   └── HANDOFF.md                # 本文件
├── PLAN.md                       # 功能规划
├── README.md                     # 用户文档
├── package.json
├── next.config.ts                # output: 'export'（静态导出）
├── tailwind.config.ts
└── wrangler.toml                 # Cloudflare Pages 配置
```

---

## 四、核心模块详解

### 4.1 NetworkGraph.tsx（最复杂的文件）

D3 力导向图 + 像素办公室区域系统，是视觉核心。

**区域布局（Canvas 坐标）：**

```
┌──────────[  LOBBY  ]──────────┐  ← 210×58px，入口，totalMessages===0 的 agent
├───────────────┬───────────────┤
│  CHAT ZONE    │   WORKSPACE   │  ← 各占半幅，高度约54%
│  (青色)       │   (绿色)      │
├───────────────┼───────────────┤
│   LOUNGE      │  MEETING ROOM │  ← 各占半幅，高度约42%
│   (橙色/沙发) │  (紫色/会议桌)│
└──[      DEBUG ZONE (68%宽)  ]─┘  ← 82px高，出错时的区域
```

**Zone 状态映射（getZoneTarget 函数）：**

| Agent 状态 | 目标区域 | 吸引力 |
|-----------|---------|--------|
| error | DEBUG | 0.70 |
| idle | LOUNGE | 0.55 |
| totalMessages === 0 | LOBBY | 0.55 |
| busy + master | MEETING | 0.55 |
| busy | WORKSPACE | 0.55 |
| role === master | MEETING | 0.45 |
| active + msgs > 20 | CHAT | 0.42 |
| active | WORKSPACE | 0.45 |

**关键技术细节：**
- `nodePositionsRef`：保存节点位置，防止 draw() 重绘时节点瞬移
- `forceCenter` 已移除：会与 zoneAffinity 对冲，导致节点卡在画布中央
- `alphaDecay: 0.018`（低于默认 0.0228）：让区域漂移动画更明显
- `alpha: 0.6`（有既存位置时）/`1.0`（全新）：状态变化时重激活仿真
- `zoneAffinityForce`：自定义 D3 力，按 index 有偏移量防止同区域节点堆叠
- Canvas overlay（`canvasRef`）：飞信封 + XP 爆炸粒子特效，独立于 D3 重绘
- `zoomRef`：跟踪 D3 zoom 变换，用于 Canvas 特效坐标对齐

**动画系统：**
- floatG（rAF 循环）：每帧更新节点位置，实现 bob/pulse/shake 动效
- `getBubbleCfg(d)`：按状态返回对话气泡内容（空闲中/处理中/协调中等）
- DOT_CLASSES：气泡省略号动画速度按状态区分（idle=800ms, busy=220ms）

### 4.2 store.ts（全局状态）

```typescript
interface NetworkState {
  agents: Agent[];                         // 所有 Agent（含离线）
  links: AgentLink[];                      // 通信边
  messages: Message[];                     // 最近 500 条消息
  experiences: ExperienceTransfer[];       // 最近 200 条经验传递
  selectedAgentId: string | null;          // 侧边栏选中的 Agent
  filterStatus: string;
  isConnected: boolean;
  serverUrl: string;
  stats: { activeAgents, totalMessages, totalExperiences, completedTransfers, activeLinks };
  clearedOfflineIds: Map<string, number>;  // 120秒内抑制已清除的离线 Agent 重新出现
}
```

**重要行为：**
- `updateNetworkSnapshot`：3秒轮询触发，会过滤掉 120 秒内手动清除的离线 Agent
- `upsertAgent`：同样检查 clearedOfflineIds，防止清除后立刻复活
- `markOfflineCleared(ids[])`：清除离线 Agent 时调用，记录抑制窗口

### 4.3 socket.ts（Socket.io 客户端）

**三层状态感知机制：**

1. **层1 - Server push**：监听 `agent:updated` 事件（Server 主动推送，< 100ms）
2. **层2 - 3秒轮询**：连接后每3秒 emit `network:request`，强制同步快照
3. **层3 - 消息推断**：从 `message:received` 事件类型推断状态
   - `task` 消息的 toId → 置为 `busy`
   - `result` 消息的 fromId → 置为 `idle`
   - `error` 消息 → 置为 `error`（8秒后自动恢复 idle）

### 4.4 LobsterSprite.tsx（情绪系统）

像素龙虾 SVG，支持5种情绪（`LobsterMood`）：

| 情绪 | 触发条件 | 视觉表现 |
|------|---------|---------|
| `normal` | 默认/断连 | 普通眼睛 |
| `happy` | ≥3 个正常 Agent | 眼睛 + 嘴角上扬像素 |
| `worried` | 有 Agent 出错 | 眼睛 + 倒V眉毛 |
| `sleepy` | 所有 Agent 空闲 | 半闭眼 + ZZZ 像素 |
| `waving` | 单个新 Agent 加入 | 左钳上举 |

情绪计算在 `Dashboard.tsx` 的 `lobsterMood useMemo` 中。

### 4.5 bridge-src.js / bridge.js（Agent 桥接进程）

Zero-invasive 接入方式，不需要修改 OpenClaw 源代码。

**工作原理：**
1. 连接到本机 OpenClaw Gateway（`ws://127.0.0.1:18789`）
2. 监听 Gateway 事件，推断 Agent 状态（task_start/task_done/error）
3. 注册为一个 Agent 到 Portal Server
4. 双向转发消息

**状态上报：**
```javascript
// bridge.js 中的 reportStatus()
async function reportStatus(status, meta) {
  // 方式1: socket emit "agent:status"
  portalSocket.emit("agent:status", AGENT_ID, status, meta);
  // 方式2: REST PATCH /api/agents/{id}/status（兜底）
  await fetch(`${PORTAL_URL}/api/agents/${AGENT_ID}/status`, { method: "PATCH", ... });
}
```

**注意：`bridge-src.js` 是人类可读源码，`bridge.js` 是含所有依赖的打包版本。** install 脚本复制的是 `bridge.js`。修改后需要同步更新两个文件。

### 4.6 my-agent.js（SDK 接入模板）

包含 `setStatus()` 帮助函数，任务处理前后调用：

```javascript
async function setStatus(status, meta = {}) {
  // socket emit "agent:status" + REST PATCH 双保险
}

async function handleMessage(msg) {
  if (msg.type === "task") {
    await setStatus("busy", { task: msg.content });
    try {
      // ← 你的处理逻辑
      await setStatus("idle");
    } catch (err) {
      await setStatus("error", { reason: err.message });
      setTimeout(() => setStatus("idle"), 5000);
    }
  }
}
```

---

## 五、Socket 协议

### Client → Server

| 事件 | 参数 | 说明 |
|------|------|------|
| `agent:register` | Agent 元数据, callback | 注册 Agent |
| `agent:heartbeat` | agentId | 15秒心跳 |
| `agent:status` | agentId, status, meta? | 主动上报状态变化 |
| `message:send` | Message（不含id/status） | 发消息 |
| `experience:share` | ExperienceTransfer（不含id） | 分享经验 |
| `network:request` | - | 请求完整快照 |

### Server → Client

| 事件 | 参数 | 说明 |
|------|------|------|
| `agent:joined` | Agent | 新 Agent 上线 |
| `agent:left` | agentId | Agent 离线 |
| `agent:updated` | Partial\<Agent\> & {id} | Agent 状态/信息变化 |
| `message:received` | Message | 新消息 |
| `experience:transferred` | ExperienceTransfer | 经验传递完成 |
| `network:snapshot` | {agents, links} | 完整网络快照 |
| `error` | {code, message} | 错误通知 |

---

## 六、REST API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/stats` | 系统统计 |
| GET | `/api/agents/:id/messages` | Agent 消息历史 |
| PATCH | `/api/agents/:id/status` | 更新 Agent 状态（bridge/SDK 调用） |
| DELETE | `/api/agents/offline` | 清除所有离线 Agent |
| GET | `/api/experiences` | 所有经验（支持 ?agentId= 过滤） |
| POST | `/api/experiences` | 新增经验条目 |
| GET | `/api/experiences/export` | 导出全部经验为 JSON |

---

## 七、NPM 脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 同时启动 Server(:3211) + Next.js(:3210) |
| `npm run dev:server` | 只启动 Server |
| `npm run dev:web` | 只启动 Next.js |
| `npm run build` | 生产构建（静态导出到 /out） |
| `npm run deploy:cf` | 部署到 Cloudflare Pages |
| `npm run demo` | 启动5个虚拟 Agent 测试 |
| `npm run build:sdk` | 打包 OpenClawClient.ts → agent-starter/openclaw.js |
| `npm run build:portal` | 打包 bridge-src.js → openclaw-portal/scripts/bridge.js |

---

## 八、已完成的迭代（U1-U8）

| 迭代 | 内容 | 状态 |
|------|------|------|
| U1 | 静态办公室区域布局（6个区域） | ✅ |
| U2 | Zone Affinity D3 力（Agent 按状态漂移到对应区域） | ✅ |
| U3 | Agent 像素动画（bob浮动/pulse光环/error闪烁/对话气泡） | ✅ |
| U4 | 全局像素风格（CRT扫描线/发光文字/ticker页脚/主题切换） | ✅ |
| U5 | 交互特效（飞信封/XP爆炸粒子，Canvas overlay） | ✅ |
| U6 | 状态感知对话气泡（空闲中/处理中/协调中/聊天中/出错了/你好） | ✅ |
| U7 | 区域特化 idle 动画（各 zone 不同运动模式） | ✅ |
| U8 | LobsterSprite 情绪系统（5种情绪 + Dashboard 情绪计算） | ✅ |

**后续修复：**
- Agent 位置保存（`nodePositionsRef`），防止 draw() 重绘时瞬移
- 移除 `forceCenter`，解决 Agent 卡在画布中央
- 3秒轮询兜底状态同步
- 清除离线 Agent 120秒抑制窗口
- Agent 状态上报三层机制（socket/REST/消息推断）
- 区域布局重构（全幅两列，DEBUG 区放大）
- UI 全面升级（霓虹发光/Agent 卡片状态条/系统时钟/网格背景）

---

## 八-2、像素风格美化（commit 304350f）

> 时间：2026-04-09 | commit: `304350f` | 新增代码：648 行

本次美化大幅增强了全局视觉效果，所有新增效果均支持 CRT 主题切换（green/amber/blue）。

### globals.css 新增效果

| 效果名 | 描述 |
|--------|------|
| `pixel-noise-overlay` | 动态噪点/静电干扰叠加层（8秒循环，steps(1) 逐帧） |
| `pixel-hex-bg` | 六边形背景图案漂浮动画（6秒 ease-in-out，旋转+上下浮动） |
| `pixel-card-enhanced` | 增强卡片：顶部渐变流光线 + 扫描线叠加 + 悬停上浮+阴影扩散 |
| `corner-brackets` | 统计框角落闪烁括号装饰（2秒呼吸动画） |
| `tab-shimmer` | 悬停时流光从左扫过效果（3秒循环，60%宽光条） |
| `stat-bar-pulse` | 统计数值呼吸脉冲动画（2秒） |
| `glitch-text` | 文字抖动效果（hover 时触发） |
| `neon-text` | 多层霓虹发光（4层 shadow） |
| `shadow-pixel` | 3D 像素按钮阴影（按下时上移1px） |
| `panel-glow` | 内发光 + 外发光的面板效果 |
| `badge-glow` | 徽章发光阴影 |
| `ambient-pixels` | 环境漂浮像素点（6个 radial-gradient） |
| `hex-float` | 六边形背景元素浮动动画 |
| `corner-tl/tr/bl/br` | 头部角落像素装饰（::before/::after 伪元素） |
| `header-gradient-line` | 顶部渐变线条动画（border-pulse 3秒） |
| `pixel-ripple` | 悬停时径向渐变涟漪 |
| `animate-flicker` | CRT 闪烁（10秒周期，模拟老显示器） |
| `animate-neon-green/cyan/red` | 霓虹脉冲（2.4秒/1.4秒周期） |
| `animate-float` | 浮动动画（3秒上下） |

### Dashboard.tsx 增强

- **顶部渐变线条**：`header-gradient-line` 类，2px 高，绿色渐变，呼吸动画
- **Logo 区**：ASCII 艺术框（`┌──────────────┐` / `└────────────────┘`），glitch 文字效果，角落装饰像素
- **统计框**：`pixel-stat-box` 类，悬停流光扫过 + 角落闪烁像素 + 阴影扩散 + 上浮1px
- **Tab 栏**：`tab-active-indicator` 左侧 ▶ 图标 + 底部渐变高光线 + 悬停图标呼吸动画
- **Footer**：加载动画方块（`loading-chunk` 三块交错 200ms）+ 左右渐变遮罩 + ticker 文字滚动

### PixelCard 增强

- **顶部霓虹流光**：颜色随 `glowColor` 变化（绿/青/红/紫/橙），8px 发光
- **角落像素装饰**：更大更明显（2.5px / 2px），悬停亮度提升
- **内层虚线边框**：`border-dashed border-white/5` 装饰框架
- **悬停效果**：`brightness(110%)` + 卡片上浮 + 阴影扩散

### PixelButton 增强

- **4px 像素角装饰**（::before/::after）：白色高光左上 + 黑色阴影右下
- **新增 purple 变体**：`bg-[#cc44ff] text-black`
- **glow 属性**：支持发光 box-shadow

### PixelBadge 增强

- **glow 属性**：`shadow-[0_0_8px_currentColor]` 霓虹发光边框
- **StatusBadge**：状态点增加 `|` 竖线分隔符
- **RoleBadge**：增加 ◆ 菱形图标装饰

### AgentCard 增强

- **左侧状态条**：`1px → 1.5px` 加宽
- **扫描线动画**：悬停时 `scan-beam-fast`（2秒 linear infinite）从下往上扫过
- **角落像素悬停变色**：`bg-pixel-border → bg-pixel-green`

### MessageFeed 增强

- 消息行 hover 时 `bg-pixel-surface` 背景高亮

### CRT 主题切换

- green（默认）、amber（色相旋转-90°）、blue（色相旋转+100°）三档
- 切换时 `document.documentElement.setAttribute('data-theme', t)`
- 主题保存至 `localStorage`

---

## 九、已知问题 & 待办

### 待确认的服务端行为
- `agent:status` 事件：Portal Server 是否已实现处理？（目前靠3秒轮询兜底）
- `PATCH /api/agents/:id/status`：Server 是否支持此端点？

### 功能待办
- [ ] 消息沿连线飞行的粒子动画（D3 edge path 上的 particle）
- [ ] Agent 按 host 聚合分组显示
- [ ] 节点大小反映活跃度
- [ ] 经验库：标签过滤 + 相似度匹配
- [ ] 消息搜索
- [ ] 任务队列看板（Phase 3）
- [ ] WSS/TLS 支持（跨公网 Agent，Phase 2）

### 已知显示问题
- 同区域 Agent 过多时，即使有 spread offset 仍可能重叠
- 初次连接时 Agent 可能在 LOBBY 短暂聚集后才分散到各区域

---

## 十、本地开发快速启动

```bash
# 克隆仓库
git clone https://github.com/sherlock-huang/openclaw-visual-interface.git
cd openclaw-visual-interface
npm install

# 启动开发环境（Server + Dashboard）
npm run dev
# Dashboard: http://localhost:3210
# Server:    http://localhost:3211

# 启动5个虚拟 Agent 测试
npm run demo

# 部署到 Cloudflare Pages
npm run build
npm run deploy:cf
```

### 新增 Agent 接入方式

**方式 A（推荐，OpenClaw 机器）：**
```bash
# 复制 openclaw-portal/ 目录到目标机器，运行安装脚本
bash openclaw-portal/scripts/install.sh   # Mac/Linux
openclaw-portal\scripts\install.bat        # Windows
```

**方式 B（通用，任意 Node.js 环境）：**
```bash
# 复制 agent-starter/ 目录，编辑 my-agent.js 添加任务处理逻辑
node agent-starter/my-agent.js
```

---

## 十一、关键依赖版本

| 依赖 | 版本 | 用途 |
|------|------|------|
| next | 15.x | App Router + 静态导出 |
| react | 19.x | UI |
| d3 | 7.9.x | 网络图可视化 |
| socket.io-client | 4.8.x | WebSocket 客户端 |
| zustand | 5.0.x | 全局状态管理 |
| socket.io | 4.8.x | WebSocket 服务端 |
| better-sqlite3 | 11.7.x | 数据持久化 |
| tailwindcss | 3.4.x | 样式 |
| clsx | 2.x | 条件样式组合 |
| esbuild | 最新 | SDK 打包 |

---

## 十二、Git Push 说明

仓库推送需要使用 PAT Token（MCP GitHub proxy 有 403 限制），每次 push 前执行：

```bash
git remote set-url origin https://<PAT_TOKEN>@github.com/sherlock-huang/openclaw-visual-interface.git
git push -u origin main
```

Token 保存在 session 上下文中，下一个接手的 Agent 需要从项目 owner 处重新获取。

---

*文档由 Claude Code (claude-sonnet-4-6) 生成，反映截至 2026-04-09 的代码状态。*
