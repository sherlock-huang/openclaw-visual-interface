import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { v4 as uuidv4 } from "uuid";
import cors from "cors";
import {
  registerAgent,
  markOffline,
  heartbeat,
  getAllAgents,
  getNetworkLinks,
  incrementMessages,
  getSocketId,
} from "./agentRegistry";
import { getDb } from "./db";
import type { ServerToClientEvents, ClientToServerEvents, Message } from "../types";

const PORT = parseInt(process.env.OPENCLAW_PORT || "3211", 10);

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

// ── REST API ──────────────────────────────────────────────

app.get("/api/agents", (_req, res) => {
  res.json(getAllAgents());
});

app.get("/api/agents/:id/messages", (req, res) => {
  const db = getDb();
  const msgs = db.prepare(`
    SELECT * FROM messages
    WHERE from_id = ? OR to_id = ? OR to_id = 'broadcast'
    ORDER BY created_at DESC LIMIT 200
  `).all(req.params.id, req.params.id);
  res.json(msgs);
});

app.get("/api/messages", (req, res) => {
  const db = getDb();
  const limit = Math.min(parseInt((req.query.limit as string) || "100", 10), 500);
  const offset = parseInt((req.query.offset as string) || "0", 10);
  const type = (req.query.type as string) || "";
  const search = (req.query.search as string) || "";

  let sql = "SELECT * FROM messages WHERE 1=1";
  const params: (string | number)[] = [];

  if (type && type !== "all") {
    sql += " AND type = ?";
    params.push(type);
  }
  if (search) {
    sql += " AND (content LIKE ? OR from_id LIKE ? OR to_id LIKE ?)";
    const q = `%${search}%`;
    params.push(q, q, q);
  }
  sql += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
  params.push(limit, offset);

  const msgs = db.prepare(sql).all(...params);
  const total = (db.prepare("SELECT COUNT(*) as c FROM messages").get() as { c: number }).c;
  res.json({ data: msgs, total, limit, offset });
});

app.get("/api/experiences", (req, res) => {
  const db = getDb();
  const agentId = req.query.agentId as string | undefined;
  const rows = agentId
    ? db.prepare("SELECT * FROM experiences WHERE agent_id = ? ORDER BY created_at DESC").all(agentId)
    : db.prepare("SELECT * FROM experiences ORDER BY created_at DESC LIMIT 200").all();
  res.json(rows);
});

app.post("/api/experiences", (req, res) => {
  const db = getDb();
  const { agentId, category, content, tags = [], confidence = 80 } = req.body;
  const now = new Date().toISOString();
  const id = uuidv4();
  db.prepare(`
    INSERT INTO experiences (id, agent_id, category, content, tags, confidence, usage_count, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)
  `).run(id, agentId, category, content, JSON.stringify(tags), confidence, now, now);
  res.json({ id });
});

app.get("/api/experiences/export", (_req, res) => {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM experiences ORDER BY created_at DESC").all();
  res.setHeader("Content-Disposition", "attachment; filename=openclaw-experiences.json");
  res.json(rows);
});

app.get("/api/network", (_req, res) => {
  res.json({ agents: getAllAgents(), links: getNetworkLinks() });
});

app.get("/api/stats", (_req, res) => {
  const db = getDb();
  const agentCount = (db.prepare("SELECT COUNT(*) as c FROM agents WHERE status != 'offline'").get() as { c: number }).c;
  const msgCount = (db.prepare("SELECT COUNT(*) as c FROM messages").get() as { c: number }).c;
  const expCount = (db.prepare("SELECT COUNT(*) as c FROM experiences").get() as { c: number }).c;
  const transferCount = (db.prepare("SELECT COUNT(*) as c FROM experience_transfers WHERE accepted = 1").get() as { c: number }).c;
  res.json({ activeAgents: agentCount, totalMessages: msgCount, totalExperiences: expCount, completedTransfers: transferCount });
});

// ── Socket.io ─────────────────────────────────────────────

io.on("connection", (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);

  socket.on("agent:register", (agentData, cb) => {
    try {
      const agent = registerAgent(agentData, socket.id);
      socket.join("network");
      io.to("network").emit("agent:joined", agent);
      // 发送当前网络快照给新加入者
      socket.emit("network:snapshot", {
        agents: getAllAgents(),
        links: getNetworkLinks(),
      });
      cb(true, agent.id);
      console.log(`[Registry] Agent registered: ${agent.name} (${agent.id})`);
    } catch (e) {
      console.error("[Registry] Register error:", e);
      cb(false, "");
    }
  });

  socket.on("agent:heartbeat", (agentId) => {
    heartbeat(agentId);
  });

  socket.on("message:send", (msgData) => {
    const db = getDb();
    const now = new Date().toISOString();
    const msg: Message = {
      ...msgData,
      id: uuidv4(),
      status: "sent",
      createdAt: now,
    };

    db.prepare(`
      INSERT INTO messages (id, type, from_id, to_id, content, payload, priority, status, reply_to_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'sent', ?, ?)
    `).run(
      msg.id, msg.type, msg.fromId, msg.toId,
      msg.content, JSON.stringify(msg.payload ?? {}),
      msg.priority, msg.replyToId ?? null, now
    );

    incrementMessages(msg.fromId);

    if (msg.toId === "broadcast") {
      io.to("network").emit("message:received", msg);
    } else {
      const targetSocket = getSocketId(msg.toId);
      if (targetSocket) {
        io.to(targetSocket).emit("message:received", msg);
        db.prepare("UPDATE messages SET status = 'delivered', delivered_at = ? WHERE id = ?")
          .run(now, msg.id);
        socket.emit("message:delivered", msg.id);
      }
      // Also broadcast to dashboard observers
      io.to("network").emit("message:received", msg);
    }
  });

  socket.on("experience:share", (transfer) => {
    const db = getDb();
    const id = uuidv4();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO experience_transfers (id, from_id, to_id, experience_ids, accepted, reason, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, transfer.fromId, transfer.toId,
      JSON.stringify(transfer.experienceIds),
      transfer.accepted ? 1 : 0,
      transfer.reason ?? null, now
    );

    // increment usage_count for each transferred experience
    const incr = db.prepare("UPDATE experiences SET usage_count = usage_count + 1, updated_at = ? WHERE id = ?");
    for (const expId of transfer.experienceIds) {
      incr.run(now, expId);
    }

    const fullTransfer = { ...transfer, id, createdAt: now };
    const targetSocket = getSocketId(transfer.toId);
    if (targetSocket) {
      io.to(targetSocket).emit("experience:transferred", fullTransfer);
    }
    io.to("network").emit("experience:transferred", fullTransfer);
  });

  socket.on("network:request", () => {
    socket.emit("network:snapshot", {
      agents: getAllAgents(),
      links: getNetworkLinks(),
    });
  });

  socket.on("disconnect", () => {
    const agentId = markOffline(socket.id);
    if (agentId) {
      io.to("network").emit("agent:left", agentId);
      console.log(`[Registry] Agent offline: ${agentId}`);
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════╗
  ║     OpenClaw Server v0.1.0            ║
  ║     Port: ${PORT}                        ║
  ╚═══════════════════════════════════════╝
  `);
});

export { io };
