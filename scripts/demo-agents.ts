/**
 * Demo: 启动 5 只虚拟龙虾，演示互联、通信、经验传授
 *
 * 运行: npx tsx scripts/demo-agents.ts
 */

import { OpenClawClient } from "../src/sdk/OpenClawClient";

const DEMO_AGENTS = [
  {
    name: "Alpha-Claw",
    role: "master" as const,
    capabilities: [{ name: "coordination", level: 95 }, { name: "planning", level: 88 }],
  },
  {
    name: "Coder-01",
    role: "worker" as const,
    capabilities: [{ name: "typescript", level: 92 }, { name: "react", level: 85 }],
  },
  {
    name: "Coder-02",
    role: "worker" as const,
    capabilities: [{ name: "python", level: 90 }, { name: "pytorch", level: 78 }],
  },
  {
    name: "ResearchBot",
    role: "specialist" as const,
    capabilities: [{ name: "web-search", level: 88 }, { name: "summarization", level: 82 }],
  },
  {
    name: "Observer",
    role: "observer" as const,
    capabilities: [{ name: "monitoring", level: 70 }],
  },
];

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log("🦞 Starting OpenClaw demo with 5 agents...\n");

  const clients = await Promise.all(
    DEMO_AGENTS.map(async (cfg) => {
      const client = new OpenClawClient({
        serverUrl: "http://localhost:3211",
        ...cfg,
        host: "localhost",
        port: 8000 + Math.floor(Math.random() * 1000),
      });

      client.onMessage((msg) => {
        console.log(`[${cfg.name}] recv ${msg.type} from ${msg.fromId.slice(0, 8)}: ${msg.content}`);
      });

      await client.connect();
      console.log(`✓ ${cfg.name} connected`);
      return { client, name: cfg.name };
    })
  );

  await sleep(1000);

  const [alpha, coder1, coder2, research] = clients;

  // Alpha broadcasts to all
  console.log("\n📡 Alpha broadcasting mission...");
  alpha.client.broadcast("Fleet assembled. Beginning task distribution.", "broadcast");
  await sleep(500);

  // Alpha assigns tasks
  console.log("📋 Assigning tasks...");
  alpha.client.sendTask(coder1.client.id, "Build a pixel-art component library", {
    deadline: "2h",
    priority: "high",
  });
  await sleep(300);
  alpha.client.sendTask(coder2.client.id, "Train a model to classify agent messages", {
    deadline: "4h",
    priority: "normal",
  });
  await sleep(300);
  alpha.client.sendTask(research.client.id, "Research best WebSocket patterns for agent fleets", {
    deadline: "1h",
    priority: "high",
  });

  await sleep(1000);

  // Workers complete and report results
  console.log("\n✅ Workers reporting results...");
  coder1.client.sendResult(alpha.client.id, "Component library complete: 12 pixel components built");
  await sleep(300);
  coder2.client.sendResult(alpha.client.id, "Model trained: 94.2% accuracy on 500 test samples");
  await sleep(300);
  research.client.sendResult(alpha.client.id, "Research done: Socket.io with Redis adapter recommended");

  await sleep(1000);

  // Share experiences
  console.log("\n📚 Publishing experiences to vault...");
  const expId1 = await coder1.client.publishExperience(
    "frontend",
    "CSS image-rendering: pixelated 可让所有浏览器正确渲染像素艺术，无需额外库",
    ["css", "pixel-art", "rendering"],
    95
  );
  const expId2 = await coder2.client.publishExperience(
    "ml",
    "对于 agent 消息分类任务，使用 BERT-small 比 full BERT 快5倍且精度损失<2%",
    ["ml", "bert", "optimization"],
    88
  );
  const expId3 = await research.client.publishExperience(
    "architecture",
    "Socket.io + Redis Adapter 支持多进程扩展，agent 数 >100 时必须启用",
    ["socket.io", "redis", "scaling"],
    92
  );
  console.log(`Published 3 experiences: ${expId1.slice(0, 8)}, ${expId2.slice(0, 8)}, ${expId3.slice(0, 8)}`);

  await sleep(500);

  // Cross-share experiences
  console.log("\n🤝 Sharing experiences between agents...");
  coder1.client.shareExperience(coder2.client.id, [expId1], "Frontend knowledge useful for your viz work");
  await sleep(300);
  research.client.shareExperience(alpha.client.id, [expId3], "Critical architecture insight for scaling");

  await sleep(500);

  // Ongoing chat loop
  console.log("\n💬 Starting chat simulation (Ctrl+C to stop)...");
  const messages = [
    [0, 1, "chat", "Coder-01, how's the pixel component holding up?"],
    [1, 0, "chat", "All good! The glow effects look sick in dark mode"],
    [2, 3, "chat", "ResearchBot, any findings on P2P agent discovery?"],
    [3, 2, "chat", "mDNS works great on LAN. Recommend for local fleets."],
    [4, 0, "chat", "Alpha: overall system health looks GREEN"],
    [0, 4, "chat", "Good. Flag anything above 80% CPU."],
  ];

  let i = 0;
  setInterval(async () => {
    const [fromIdx, toIdx, type, content] = messages[i % messages.length];
    const from = clients[fromIdx as number];
    const to = clients[toIdx as number];
    from.client.sendMessage(to.client.id, content as string, type as "chat" | "task");
    i++;
  }, 3000);

  // Keep alive
  process.on("SIGINT", () => {
    console.log("\n👋 Shutting down demo agents...");
    clients.forEach(({ client, name }) => {
      client.disconnect();
      console.log(`  × ${name} disconnected`);
    });
    process.exit(0);
  });
}

main().catch(console.error);
