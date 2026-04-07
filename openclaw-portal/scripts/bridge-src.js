/**
 * OpenClaw Portal Bridge
 * 连接本机 OpenClaw Gateway (ws://127.0.0.1:18789) 与 Portal 服务器
 * 无需修改任何 OpenClaw 代码，零侵入接入
 */

const { io } = require("socket.io-client");
const { WebSocket } = require("ws");
const os = require("os");
const fs = require("fs");
const path = require("path");

// ── 读取配置 ─────────────────────────────────────────────────
// 配置文件固定在 ~/.openclaw/workspace/skills/openclaw-portal/assets/config.json
const SKILL_DIR = path.join(os.homedir(), ".openclaw", "workspace", "skills", "openclaw-portal");
const CONFIG_PATH = path.join(SKILL_DIR, "assets", "config.json");
const PID_FILE = path.join(os.tmpdir(), "openclaw-portal-bridge.pid");
const LOG_FILE = path.join(os.homedir(), ".openclaw", "portal-bridge.log");

function loadConfig() {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, "utf8");
    return JSON.parse(raw);
  } catch {
    return { portalUrl: "https://openclaw-api.kunpeng-ai.com", autoStart: true };
  }
}

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  try {
    fs.appendFileSync(LOG_FILE, line + "\n");
  } catch {}
}

// ── CLI 参数处理 ──────────────────────────────────────────────
const args = process.argv.slice(2);

if (args[0] === "--status") {
  if (fs.existsSync(PID_FILE)) {
    const pid = fs.readFileSync(PID_FILE, "utf8").trim();
    console.log(`[Portal Bridge] 运行中 (PID: ${pid})`);
    console.log(`[Portal Bridge] 日志: ${LOG_FILE}`);
  } else {
    console.log("[Portal Bridge] 未运行");
  }
  process.exit(0);
}

if (args[0] === "--stop") {
  if (fs.existsSync(PID_FILE)) {
    const pid = parseInt(fs.readFileSync(PID_FILE, "utf8").trim(), 10);
    try {
      process.kill(pid, "SIGTERM");
      fs.unlinkSync(PID_FILE);
      console.log(`[Portal Bridge] 已停止 (PID: ${pid})`);
    } catch {
      console.log("[Portal Bridge] 进程不存在，清理 PID 文件");
      fs.unlinkSync(PID_FILE);
    }
  } else {
    console.log("[Portal Bridge] 未运行");
  }
  process.exit(0);
}

if (args[0] === "--send") {
  const toId = args[1];
  const content = args[2];
  if (!toId || !content) {
    console.error("用法: bridge.js --send <agent-id> <message>");
    process.exit(1);
  }
  const cfg = loadConfig();
  const sock = io(cfg.portalUrl, { transports: ["websocket"] });
  sock.on("connect", () => {
    sock.emit("message:send", {
      type: "chat",
      fromId: `openclaw-${os.hostname()}`,
      toId,
      content,
      priority: "normal",
    });
    setTimeout(() => { sock.disconnect(); process.exit(0); }, 500);
  });
  sock.on("connect_error", (e) => {
    console.error("连接失败:", e.message);
    process.exit(1);
  });
  return;
}

// ── 主桥接进程 ────────────────────────────────────────────────
const cfg = loadConfig();
const PORTAL_URL = cfg.portalUrl || "https://openclaw-api.kunpeng-ai.com";
const GATEWAY_URL = "ws://127.0.0.1:18789";
const HOSTNAME = os.hostname();
const AGENT_ID = `openclaw-${HOSTNAME}`;
const AGENT_NAME = cfg.agentName || `OpenClaw @ ${HOSTNAME}`;

// 写入 PID
fs.writeFileSync(PID_FILE, String(process.pid));
process.on("exit", () => { try { fs.unlinkSync(PID_FILE); } catch {} });
process.on("SIGTERM", () => process.exit(0));
process.on("SIGINT", () => process.exit(0));

log(`OpenClaw Portal Bridge 启动`);
log(`Agent: ${AGENT_NAME} (${AGENT_ID})`);
log(`Portal: ${PORTAL_URL}`);

// ── 连接 Portal ───────────────────────────────────────────────
let portalSocket = null;
let registered = false;

function connectPortal() {
  log("连接 Portal 服务器...");

  const sock = io(PORTAL_URL, {
    transports: ["websocket"],
    reconnection: true,
    reconnectionDelay: 3000,
    reconnectionDelayMax: 30000,
  });

  sock.on("connect", () => {
    log("Portal 已连接，注册 Agent...");
    sock.emit("agent:register", {
      id: AGENT_ID,
      name: AGENT_NAME,
      role: cfg.agentRole || "worker",
      platform: "openclaw",
      status: "active",
      host: HOSTNAME,
      port: 18789,
      version: "0.1.0",
      capabilities: cfg.capabilities || [],
      metadata: {
        gatewayUrl: GATEWAY_URL,
        platform: process.platform,
        nodeVersion: process.version,
      },
      connectedTo: [],
    }, (success, agentId) => {
      if (success) {
        registered = true;
        log(`✓ 已注册: ${agentId}，可在 Dashboard 查看此节点`);
        startHeartbeat(sock);
        connectGateway(sock);
      } else {
        log("✗ 注册失败，5秒后重试...");
        setTimeout(() => sock.disconnect(), 5000);
      }
    });
  });

  sock.on("message:received", (msg) => {
    log(`收到来自 ${msg.fromId} 的消息: ${msg.content}`);
    // 将消息转发到本机 OpenClaw Gateway
    forwardToGateway(msg);
  });

  sock.on("disconnect", (reason) => {
    registered = false;
    log(`Portal 断开 (${reason})，自动重连中...`);
  });

  sock.on("connect_error", (err) => {
    log(`Portal 连接失败: ${err.message}`);
  });

  portalSocket = sock;
}

function startHeartbeat(sock) {
  setInterval(() => {
    if (sock.connected) {
      sock.emit("agent:heartbeat", AGENT_ID);
    }
  }, 15000);
}

// ── 连接本机 OpenClaw Gateway ─────────────────────────────────
let gatewayWs = null;
let gatewayRetry = 0;

function connectGateway(portalSock) {
  log(`连接本机 OpenClaw Gateway: ${GATEWAY_URL}`);

  const ws = new WebSocket(GATEWAY_URL);

  ws.on("open", () => {
    gatewayRetry = 0;
    log("✓ OpenClaw Gateway 已连接，开始监听事件");
  });

  ws.on("message", (raw) => {
    try {
      const event = JSON.parse(raw.toString());
      handleGatewayEvent(event, portalSock);
    } catch {}
  });

  ws.on("close", () => {
    log("Gateway 连接断开");
    gatewayWs = null;
    // 指数退避重连
    const delay = Math.min(3000 * 2 ** gatewayRetry, 60000);
    gatewayRetry++;
    log(`${delay / 1000}秒后重连 Gateway...`);
    setTimeout(() => connectGateway(portalSock), delay);
  });

  ws.on("error", (err) => {
    // Gateway 可能未运行，静默失败
    if (gatewayRetry === 0) {
      log(`Gateway 连接失败 (${err.message})，将持续重试`);
    }
  });

  gatewayWs = ws;
}

// ── 状态上报 ─────────────────────────────────────────────────
let currentStatus = "active";

async function reportStatus(status, meta = {}) {
  if (status === currentStatus) return;
  currentStatus = status;
  log(`状态变更: ${status}${meta.task ? ` (${meta.task})` : ""}`);

  // 1. Socket emit — 若 Server 支持 agent:status 即时生效
  if (portalSocket?.connected) {
    portalSocket.emit("agent:status", AGENT_ID, status, meta);
  }

  // 2. REST PATCH — 标准 HTTP 兜底，大多数 Server 实现支持
  try {
    await fetch(`${PORTAL_URL}/api/agents/${AGENT_ID}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, ...meta }),
    });
  } catch { /* server 可能不支持，静默忽略 */ }
}

// ── Gateway 事件处理 ─────────────────────────────────────────
function handleGatewayEvent(event, portalSock) {
  if (!portalSock?.connected) return;

  const evType = event.type || event.method || "";
  const content = event.content || event.text || "";

  // ── 状态推断 ──────────────────────────────────────────────
  // 开始处理任务
  if (
    evType === "task_start" || evType === "processing" ||
    evType === "tool_use" || evType === "thinking" ||
    (evType === "message" && /^(开始|处理|executing|running|task)/i.test(content))
  ) {
    reportStatus("busy", { task: content.slice(0, 80) });
  }
  // 任务完成 / 空闲
  else if (
    evType === "task_complete" || evType === "task_done" ||
    evType === "idle" || evType === "ready" ||
    (evType === "message" && /^(完成|done|finished|result|idle)/i.test(content))
  ) {
    reportStatus("idle");
  }
  // 出错
  else if (
    evType === "error" || evType === "exception" ||
    (evType === "message" && /^(error|错误|失败|exception)/i.test(content))
  ) {
    reportStatus("error", { reason: content.slice(0, 120) });
  }

  // ── 转发消息事件到 Portal ──────────────────────────────────
  if (evType === "message" || evType === "chat") {
    portalSock.emit("message:send", {
      type: "chat",
      fromId: AGENT_ID,
      toId: "broadcast",
      content: `[Gateway] ${content}`,
      priority: "normal",
    });
  }
}

// ── 转发 Portal 消息到 Gateway ────────────────────────────────
function forwardToGateway(msg) {
  if (!gatewayWs || gatewayWs.readyState !== WebSocket.OPEN) return;
  try {
    gatewayWs.send(JSON.stringify({
      method: "message:send",
      params: { content: msg.content, from: msg.fromId },
    }));
  } catch {}
}

// ── 启动 ─────────────────────────────────────────────────────
connectPortal();
