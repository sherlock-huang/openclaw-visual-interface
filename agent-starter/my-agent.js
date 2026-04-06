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

function handleMessage(msg) {
  const time = new Date().toLocaleTimeString();
  console.log(`[${time}] 收到消息 from ${msg.fromId}: ${msg.content}`);

  if (msg.type === "task") {
    // 在这里可以接入实际的 AI 处理逻辑
    console.log(`  -> 任务：${msg.content}`);
  }
}

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
