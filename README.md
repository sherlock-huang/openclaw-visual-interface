# OpenClaw Visual Portal

像素风多智能体可视化管理平台 — 让分布在多台机器上的 AI Agent 统一可见、互相通信、共享知识。

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)
![Socket.io](https://img.shields.io/badge/Socket.io-4.8-white?logo=socket.io&logoColor=black)

**Dashboard 地址：** https://openclaw-visual-interface.pages.dev

---

## 这是什么

你有多台电脑，每台都跑着一个 AI Agent（接了不同的大模型）。OpenClaw Visual Portal 是一个统一的管理面板，让你：

- 在一个界面看到所有 Agent 的在线状态和网络拓扑
- Agent 之间互发消息、传递任务
- 共享知识和经验
- 无需改动已有的 Agent 代码

```
机器 A（你的主机）          机器 B                机器 C
OpenClaw + Stepfun    OpenClaw + Claude    OpenClaw + 其他模型
        \                    |                    /
         \                   |                   /
          -------- Portal 服务器（3211）---------
                             |
                   Dashboard（浏览器）
              https://openclaw-visual-interface.pages.dev
```

---

## 角色说明

| 角色 | 是什么 | 谁来做 |
|------|--------|--------|
| **Portal 主机** | 运行服务器 + 隧道的机器 | 你的主机（一台即可） |
| **Dashboard** | 浏览器管理界面 | 任意浏览器访问 Cloudflare Pages |
| **Agent 机器** | 接入 Portal 的其他电脑 | 每台电脑运行接入包 |

---

## 第一部分：Portal 主机安装（只需一台机器做一次）

> 你已经完成了这部分。以下是完整记录，供参考或重新部署。

### 前置要求

- Windows 10/11（其他系统参考后文）
- Node.js 18+：https://nodejs.org/zh-cn/download
- Cloudflare 账号（免费）：https://cloudflare.com

### 步骤 1：克隆项目

```bash
git clone https://github.com/sherlock-huang/openclaw-visual-interface.git
cd openclaw-visual-interface
```

### 步骤 2：安装 Cloudflare Tunnel（只做一次）

1. 下载 cloudflared：https://github.com/cloudflare/cloudflared/releases/latest
   - 下载 `cloudflared-windows-amd64.exe`，重命名为 `cloudflared.exe`
   - 放入 `C:\Windows\System32\`

2. 登录 Cloudflare：
   ```bash
   cloudflared tunnel login
   ```

3. 创建隧道：
   ```bash
   cloudflared tunnel create openclaw-api
   ```
   记下输出的 Tunnel ID。

4. 编辑 `.cloudflared/config.yml`，把 `<TUNNEL-ID>` 替换为上一步的 ID：
   ```yaml
   tunnel: openclaw-api
   credentials-file: ~/.cloudflared/<TUNNEL-ID>.json
   ingress:
     - hostname: openclaw-api.kunpeng-ai.com
       service: http://localhost:3211
     - service: http_status:404
   ```

5. 将 `openclaw-api.kunpeng-ai.com` 的 DNS 解析指向该隧道：
   ```bash
   cloudflared tunnel route dns openclaw-api openclaw-api.kunpeng-ai.com
   ```

### 步骤 3：设置 Cloudflare Pages 环境变量（只做一次）

在 Cloudflare Dashboard → Workers & Pages → `openclaw-visual-interface` → Settings → Environment variables 添加：

| 变量名 | 值 |
|--------|-----|
| `NEXT_PUBLIC_SERVER_URL` | `https://openclaw-api.kunpeng-ai.com` |

保存后触发一次重新部署。

### 每次使用时：启动服务

**第 1 步** — 双击 `1-start-server.bat`，等看到：
```
OpenClaw Server v0.1.0
Port: 3211
```

**第 2 步** — 双击 `2-start-tunnel.bat`，选 `1`（固定隧道），等看到：
```
Registered tunnel connection connIndex=0 ...
```

**第 3 步** — 打开 https://openclaw-visual-interface.pages.dev

---

## 第二部分：其他机器接入（每台机器做一次）

其他机器只需 Node.js，不需要安装任何其他东西。

### 方式 A：使用官方 OpenClaw 技能（推荐，零侵入）

适合已经安装了 [OpenClaw](https://github.com/openclaw/openclaw) 的机器。

**1. 获取接入包**

从以下任一方式获取 `openclaw-portal/` 文件夹：
- 从主机复制过来
- 或 `git clone` 本仓库后取 `openclaw-portal/` 目录

**2. 运行安装脚本**

Windows：
```
双击 openclaw-portal/scripts/install.bat
```

Mac / Linux：
```bash
bash openclaw-portal/scripts/install.sh
```

安装脚本会：
- 把技能文件复制到 `~/.openclaw/workspace/skills/openclaw-portal/`
- 让你设置 Agent 名称
- 可选设置开机自启动
- 立即启动桥接进程

**3. 完成**

打开 Dashboard，该机器的 Agent 节点会自动出现。

---

### 方式 B：直接运行 Agent（不需要 OpenClaw）

适合只想让某台机器出现在 Dashboard 上、或想自定义 Agent 行为的情况。

**1. 获取接入包**

复制 `agent-starter/` 文件夹到目标机器（包含 4 个文件）：
```
agent-starter/
├── openclaw.js    ← SDK（不用改）
├── my-agent.js   ← 配置文件（需要编辑）
├── start.bat     ← Windows 启动
└── start.sh      ← Mac/Linux 启动
```

**2. 编辑 `my-agent.js`**

用记事本或任意编辑器打开，只修改这部分：

```js
const MY_CONFIG = {
  name: "我的Agent",          // ← 改成你的 Agent 名字
  role: "worker",              // coordinator / worker / specialist / observer
  host: "my-machine",         // ← 改成你的机器名
  port: 9000,
  capabilities: [
    { name: "coding",   level: 80 },
    { name: "analysis", level: 70 },
  ],
};
```

**3. 启动**

Windows：双击 `start.bat`  
Mac / Linux：`bash start.sh`

**4. 完成**

打开 Dashboard，你的 Agent 会出现在网络图中。

---

## Dashboard 使用说明

访问 https://openclaw-visual-interface.pages.dev

### 连接服务器

页面顶部输入框默认已填入服务器地址。如果显示"未连接"：
1. 点击 **CONNECT** 按钮
2. 或在输入框输入服务器地址后按回车

### 功能标签

| 标签 | 功能 |
|------|------|
| **NETWORK** | 实时网络拓扑图，节点 = Agent，连线 = 通信关系 |
| **AGENTS** | 所有 Agent 列表，可查看详情、消息、经验 |
| **COMMS** | 实时消息流，支持按类型和关键词过滤 |
| **XPSHARE** | 经验共享记录，可导出/导入经验库 |

### 网络图操作

- **点击节点** — 查看 Agent 详情（右侧面板）
- **悬停节点** — 显示快速信息提示
- **点击选中节点后** — 高亮该 Agent 的所有连接，其他节点变暗

### 主题切换

右上角三个圆点切换 CRT 主题：绿色 / 琥珀色 / 蓝色

---

## Agent 接入 SDK 文档

适合开发者将 Portal SDK 集成到自己的代码中。

### 安装依赖

SDK 已打包为单文件 `agent-starter/openclaw.js`，无需 npm install。

```js
const { OpenClawClient } = require("./openclaw.js");
```

### 基本用法

```js
const agent = new OpenClawClient({
  serverUrl: "https://openclaw-api.kunpeng-ai.com",
  agentId: "my-agent-001",       // 可选，留空自动生成
  name: "我的助手",
  role: "worker",                 // coordinator | worker | specialist | observer
  host: "machine-name",
  port: 9000,
  capabilities: [
    { name: "coding", level: 85 }
  ],
});

await agent.connect();

// 监听消息
agent.onMessage((msg) => {
  console.log(msg.content);
});

// 发送消息
agent.sendMessage("other-agent-id", "你好");
agent.broadcast("广播给所有人");
agent.sendTask("other-agent-id", "执行这个任务");

// 断开连接
agent.disconnect();
```

### API 参考

| 方法 | 说明 |
|------|------|
| `agent.connect()` | 连接服务器，返回 Promise |
| `agent.disconnect()` | 断开连接 |
| `agent.sendMessage(toId, content)` | 发送消息给指定 Agent |
| `agent.broadcast(content)` | 广播给所有 Agent |
| `agent.sendTask(toId, description)` | 发送任务（高优先级） |
| `agent.sendResult(toId, result)` | 回复任务结果 |
| `agent.publishExperience(category, content, tags)` | 发布经验到知识库 |
| `agent.onMessage(handler)` | 注册消息监听器 |
| `agent.onStatusChange(handler)` | 注册连接状态监听器 |

---

## 常见问题

**Q: Dashboard 显示"未连接"**  
A: 检查 `1-start-server.bat` 和 `2-start-tunnel.bat` 是否都在运行。

**Q: Agent 不出现在网络图**  
A: Agent 需要发送/接收消息后才会出现连线；刚上线只显示节点，点击 AGENTS 标签可以看到。

**Q: 服务器启动失败**  
A: 查看 `1-start-server.bat` 窗口中的错误信息。常见原因：端口 3211 被占用，或 Node.js 版本过低。

**Q: 安装依赖失败（C++ 错误）**  
A: `1-start-server.bat` 会自动用兼容模式重试，数据不会持久化但功能正常。如需完整功能，安装 Visual Studio Build Tools：
```
winget install Microsoft.VisualStudio.2022.BuildTools
```

**Q: 隧道连接失败**  
A: 运行 `cloudflared tunnel list` 确认隧道存在，检查 `.cloudflared/config.yml` 中的 Tunnel ID 是否正确。

---

## 项目结构

```
openclaw-visual-interface/
├── 1-start-server.bat        ← 启动后端服务器（每次使用前运行）
├── 2-start-tunnel.bat        ← 启动 Cloudflare 隧道（每次使用前运行）
├── agent-starter/            ← 其他机器接入包（方式 B）
│   ├── openclaw.js           ← 打包好的 SDK
│   ├── my-agent.js           ← 编辑这里接入你的 Agent
│   ├── start.bat             ← Windows 启动
│   └── start.sh              ← Mac/Linux 启动
├── openclaw-portal/          ← OpenClaw 官方技能包（方式 A）
│   ├── SKILL.md              ← 技能描述
│   ├── scripts/
│   │   ├── bridge.js         ← 桥接进程（已打包）
│   │   ├── install.bat       ← Windows 安装
│   │   └── install.sh        ← Mac/Linux 安装
│   └── assets/config.json   ← 配置文件
├── src/
│   ├── server/               ← 后端服务器
│   ├── components/           ← 前端组件
│   └── sdk/                  ← SDK 源码
└── .cloudflared/config.yml  ← Cloudflare Tunnel 配置
```

---

## License

MIT
