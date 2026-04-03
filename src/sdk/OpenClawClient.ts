/**
 * OpenClaw SDK — Agent 接入客户端
 *
 * 用法 (Node.js / Claude Code plugin / Codex):
 *
 *   import { OpenClawClient } from "openclaw-ui/sdk";
 *
 *   const agent = new OpenClawClient({
 *     serverUrl: "http://localhost:3211",
 *     name: "MyLobster",
 *     role: "worker",
 *     capabilities: [{ name: "coding", level: 90 }],
 *   });
 *
 *   await agent.connect();
 *   agent.onMessage((msg) => console.log(msg));
 *   await agent.sendMessage("broadcast", "Hello fleet!");
 */

import { io, Socket } from "socket.io-client";
import { v4 as uuidv4 } from "uuid";
import type {
  Agent,
  AgentRole,
  AgentPlatform,
  AgentCapability,
  Message,
  MessageType,
  MessagePriority,
  ServerToClientEvents,
  ClientToServerEvents,
  ExperienceTransfer,
} from "../types";

export interface OpenClawClientOptions {
  serverUrl?: string;
  name: string;
  role?: AgentRole;
  platform?: AgentPlatform;
  host?: string;
  port?: number;
  capabilities?: AgentCapability[];
  metadata?: Record<string, unknown>;
  agentId?: string;  // 指定固定 ID，方便重连后恢复
  heartbeatInterval?: number;  // ms, default 15000
}

type MessageHandler = (msg: Message) => void;
type ExperienceHandler = (transfer: ExperienceTransfer) => void;
type StatusHandler = (connected: boolean) => void;

export class OpenClawClient {
  readonly id: string;
  private socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;
  private opts: Required<OpenClawClientOptions>;
  private messageHandlers: MessageHandler[] = [];
  private experienceHandlers: ExperienceHandler[] = [];
  private statusHandlers: StatusHandler[] = [];
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  constructor(opts: OpenClawClientOptions) {
    this.id = opts.agentId || uuidv4();
    this.opts = {
      serverUrl: "http://localhost:3211",
      role: "worker",
      platform: "openclaw",
      host: "localhost",
      port: 0,
      capabilities: [],
      metadata: {},
      heartbeatInterval: 15000,
      ...opts,
      name: opts.name,
    };
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const s = io(this.opts.serverUrl, {
        transports: ["websocket"],
        autoConnect: false,
      }) as Socket<ServerToClientEvents, ClientToServerEvents>;

      this.socket = s;

      s.on("connect", () => {
        const agentData: Omit<Agent, "createdAt" | "lastSeenAt" | "totalMessages" | "totalExperiences"> = {
          id: this.id,
          name: this.opts.name,
          role: this.opts.role,
          platform: this.opts.platform,
          status: "active",
          host: this.opts.host,
          port: this.opts.port,
          version: "0.1.0",
          capabilities: this.opts.capabilities,
          metadata: this.opts.metadata,
          connectedTo: [],
        };

        s.emit("agent:register", agentData, (success, agentId) => {
          if (success) {
            console.log(`[OpenClaw] Registered as "${this.opts.name}" (${agentId})`);
            this.startHeartbeat();
            this.statusHandlers.forEach((h) => h(true));
            resolve();
          } else {
            reject(new Error("Failed to register agent"));
          }
        });
      });

      s.on("message:received", (msg) => {
        this.messageHandlers.forEach((h) => h(msg));
      });

      s.on("experience:transferred", (transfer) => {
        this.experienceHandlers.forEach((h) => h(transfer));
      });

      s.on("disconnect", () => {
        this.statusHandlers.forEach((h) => h(false));
        this.stopHeartbeat();
      });

      s.on("error", (err) => {
        console.error("[OpenClaw] Error:", err);
      });

      s.connect();
    });
  }

  disconnect() {
    this.stopHeartbeat();
    this.socket?.disconnect();
    this.socket = null;
  }

  // ── Messaging ─────────────────────────────────────────

  sendMessage(
    toId: string,
    content: string,
    type: MessageType = "chat",
    priority: MessagePriority = "normal",
    payload?: Record<string, unknown>
  ) {
    if (!this.socket) throw new Error("Not connected");
    this.socket.emit("message:send", {
      type,
      fromId: this.id,
      toId,
      content,
      priority,
      payload,
    });
  }

  broadcast(content: string, type: MessageType = "broadcast") {
    this.sendMessage("broadcast", content, type);
  }

  sendTask(toId: string, taskDescription: string, payload?: Record<string, unknown>) {
    this.sendMessage(toId, taskDescription, "task", "high", payload);
  }

  sendResult(toId: string, result: string, replyToId?: string) {
    if (!this.socket) throw new Error("Not connected");
    this.socket.emit("message:send", {
      type: "result",
      fromId: this.id,
      toId,
      content: result,
      priority: "normal",
      replyToId,
    });
  }

  // ── Experience Sharing ────────────────────────────────

  shareExperience(toId: string, experienceIds: string[], reason?: string) {
    if (!this.socket) throw new Error("Not connected");
    this.socket.emit("experience:share", {
      fromId: this.id,
      toId,
      experienceIds,
      accepted: true,
      reason,
    });
  }

  async publishExperience(category: string, content: string, tags: string[] = [], confidence = 80): Promise<string> {
    const res = await fetch(`${this.opts.serverUrl}/api/experiences`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId: this.id, category, content, tags, confidence }),
    });
    const { id } = await res.json() as { id: string };
    return id;
  }

  async getExperiences(agentId?: string): Promise<Record<string, unknown>[]> {
    const url = agentId
      ? `${this.opts.serverUrl}/api/experiences?agentId=${agentId}`
      : `${this.opts.serverUrl}/api/experiences`;
    const res = await fetch(url);
    return res.json();
  }

  // ── Event handlers ────────────────────────────────────

  onMessage(handler: MessageHandler) {
    this.messageHandlers.push(handler);
    return () => { this.messageHandlers = this.messageHandlers.filter((h) => h !== handler); };
  }

  onExperience(handler: ExperienceHandler) {
    this.experienceHandlers.push(handler);
    return () => { this.experienceHandlers = this.experienceHandlers.filter((h) => h !== handler); };
  }

  onStatusChange(handler: StatusHandler) {
    this.statusHandlers.push(handler);
    return () => { this.statusHandlers = this.statusHandlers.filter((h) => h !== handler); };
  }

  // ── Internal ──────────────────────────────────────────

  private startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      this.socket?.emit("agent:heartbeat", this.id);
    }, this.opts.heartbeatInterval);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
}
