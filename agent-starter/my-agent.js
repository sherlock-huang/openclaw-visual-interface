/**
 * OpenClaw Agent — Claude Code 本机接入
 * 由 SessionStart Hook 自动启动，无需手动运行
 */

const { OpenClawClient } = require("./openclaw.js");
const os = require("os");

const SERVER_URL = "https://openclaw-api.kunpeng-ai.com";

const agent = new OpenClawClient({
  serverUrl: SERVER_URL,
  agentId: `claude-code-${os.hostname()}`,   // 固定 ID，重连后保持同一节点
  name: `Claude Code @ ${os.hostname()}`,
  role: "coordinator",
  host: os.hostname(),
  port: 0,
  capabilities: [
    { name: "coding",     level: 95 },
    { name: "reasoning",  level: 90 },
    { name: "planning",   level: 88 },
  ],
  metadata: {
    platform: process.platform,
    nodeVersion: process.version,
    startedAt: new Date().toISOString(),
  },
});

// ── 状态上报帮助函数 ──────────────────────────────────────────
// 调用时机：收到任务前 setStatus("busy")，完成后 setStatus("idle")，出错时 setStatus("error")
let _currentStatus = "active";
async function setStatus(status, meta = {}) {
  if (status === _currentStatus) return;
  _currentStatus = status;
  try {
    // 方式1：socket emit（Server 支持 agent:status 事件时即时生效）
    if (agent.socket?.connected) {
      agent.socket.emit("agent:status", agent.id, status, meta);
    }
    // 方式2：REST PATCH（多数 Server 实现都支持）
    await fetch(`${SERVER_URL}/api/agents/${agent.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, ...meta }),
    }).catch(() => {});  // 静默失败，Portal 3秒轮询兜底
  } catch {}
}

// ── 消息处理 ──────────────────────────────────────────────────
async function handleMessage(msg) {
  const time = new Date().toLocaleTimeString();
  console.log(`[${time}] 收到消息 from ${msg.fromId}: ${msg.content}`);

  if (msg.type === "task") {
    console.log(`  -> 任务：${msg.content}`);

    // 在这里接入实际的 AI 处理逻辑
    // ↓ 开始处理：通知 Portal 切换到 WORKSPACE
    await setStatus("busy", { task: msg.content.slice(0, 80) });
    try {
      // ─── 你的任务处理代码放这里 ───────────────────────────
      // 例如：const result = await runAI(msg.content);
      //       agent.sendResult(msg.fromId, result, msg.id);
      // ──────────────────────────────────────────────────────
      console.log(`  -> 任务处理完成`);
      await setStatus("idle");
    } catch (err) {
      console.error(`  -> 任务出错：${err.message}`);
      await setStatus("error", { reason: err.message });
      // 5 秒后自动恢复 idle
      setTimeout(() => setStatus("idle"), 5000);
    }
  } else if (msg.type === "chat") {
    // 收到聊天消息不影响状态，但可以回复
    console.log(`  -> 聊天：${msg.content}`);
  }
}

// ── 启动 ──────────────────────────────────────────────────────
async function start() {
  console.log(`[OpenClaw] Claude Code Agent 启动中...`);
  console.log(`[OpenClaw] 服务器：${SERVER_URL}`);

  agent.onMessage(handleMessage);

  agent.onStatusChange((connected) => {
    if (connected) {
      console.log(`[OpenClaw] 已连接 ✓  在 Dashboard 可看到此节点`);
      agent.broadcast(`Claude Code @ ${os.hostname()} 已上线`);
    } else {
      console.log(`[OpenClaw] 断开，自动重连中...`);
    }
  });

  try {
    await agent.connect();
  } catch (err) {
    console.error(`[OpenClaw] 连接失败：${err.message}`);
    // 不 exit，让 Claude Code 正常继续工作
  }
}

process.on("SIGINT", () => { agent.disconnect(); process.exit(0); });
process.on("SIGTERM", () => { agent.disconnect(); process.exit(0); });

start();
