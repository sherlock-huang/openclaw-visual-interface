/**
 * ================================================
 *  OpenClaw Agent 接入示例
 *  ── 只需修改下方 "=== 你的配置 ===" 区域 ───────
 * ================================================
 */

const { OpenClawClient } = require("./openclaw.js");

// ============================================================
// === 你的配置（修改这里）===================================
// ============================================================

const SERVER_URL = "https://openclaw-api.kunpeng-ai.com"; // 服务器地址，不用改

const MY_CONFIG = {
  name: "我的Agent",          // ← 改成你的 Agent 名字
  role: "worker",              // coordinator / worker / specialist / observer
  host: "my-machine",         // ← 改成你的机器名（随意，用于显示）
  port: 9000,                  // ← 改成你的端口（随意）
  capabilities: [              // ← 你的能力列表
    { name: "coding",    level: 80 },
    { name: "analysis",  level: 70 },
  ],
};

// ============================================================
// === 消息处理（收到消息时执行）=============================
// ============================================================

function handleMessage(msg) {
  console.log(`\n📩 收到消息`);
  console.log(`   来自：${msg.fromId}`);
  console.log(`   内容：${msg.content}`);
  console.log(`   类型：${msg.type}`);

  // 在这里写你的处理逻辑
  // 例如：如果收到 task 类型，自动回复结果
  if (msg.type === "task") {
    console.log(`   → 收到任务，正在处理...`);
    setTimeout(() => {
      agent.sendResult(msg.fromId, `任务已完成：${msg.content}`, msg.id);
      console.log(`   → 已回复结果`);
    }, 1000);
  }
}

// ============================================================
// === 启动（不需要修改）=====================================
// ============================================================

const agent = new OpenClawClient({
  serverUrl: SERVER_URL,
  ...MY_CONFIG,
});

async function start() {
  console.log(`\n OpenClaw Agent 启动中...`);
  console.log(`  名字：${MY_CONFIG.name}`);
  console.log(`  服务器：${SERVER_URL}`);
  console.log(``);

  agent.onMessage(handleMessage);

  agent.onStatusChange((connected) => {
    if (connected) {
      console.log(`[状态] 已连接到服务器`);
      // 上线后广播一条消息
      agent.broadcast(`${MY_CONFIG.name} 已上线`);
    } else {
      console.log(`[状态] 与服务器断开，自动重连中...`);
    }
  });

  try {
    await agent.connect();
    console.log(`[OK] 连接成功！在 Dashboard 上可以看到此 Agent`);
    console.log(`     按 Ctrl+C 退出\n`);
  } catch (err) {
    console.error(`[错误] 连接失败：${err.message}`);
    console.error(`  请检查：`);
    console.error(`  1. 服务器是否已启动（1-start-server.bat）`);
    console.error(`  2. 隧道是否已启动（2-start-tunnel.bat）`);
    console.error(`  3. SERVER_URL 是否正确`);
    process.exit(1);
  }
}

// 优雅退出
process.on("SIGINT", () => {
  console.log(`\n[退出] 断开连接...`);
  agent.disconnect();
  process.exit(0);
});

start();
