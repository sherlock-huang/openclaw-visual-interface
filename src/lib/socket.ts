"use client";

import { io, Socket } from "socket.io-client";
import type { ServerToClientEvents, ClientToServerEvents, ExperienceTransfer } from "../types";
import { useNetworkStore } from "./store";

let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

export function getSocket(): Socket<ServerToClientEvents, ClientToServerEvents> {
  if (!socket) {
    const serverUrl = useNetworkStore.getState().serverUrl;
    socket = io(serverUrl, { autoConnect: false, transports: ["websocket"] });
    bindEvents(socket);
  }
  return socket;
}

export function connectSocket(serverUrl?: string) {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  const url = serverUrl || useNetworkStore.getState().serverUrl;
  useNetworkStore.getState().setServerUrl(url);
  socket = io(url, { autoConnect: false, transports: ["websocket"] });
  bindEvents(socket);
  socket.connect();
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
  useNetworkStore.getState().setConnected(false);
}

function bindEvents(s: Socket<ServerToClientEvents, ClientToServerEvents>) {
  const store = useNetworkStore.getState;

  let pollTimer: ReturnType<typeof setInterval> | null = null;

  s.on("connect", () => {
    store().setConnected(true);
    s.emit("network:request");
    // Poll every 3s — catches status changes that server doesn't push
    pollTimer = setInterval(() => {
      if (s.connected) s.emit("network:request");
    }, 3000);
  });

  s.on("disconnect", () => {
    store().setConnected(false);
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
  });

  s.on("network:snapshot", (data) => {
    store().updateNetworkSnapshot(data);
  });

  s.on("agent:joined", (agent) => {
    store().upsertAgent(agent);
  });

  s.on("agent:left", (agentId) => {
    store().removeAgent(agentId);
  });

  s.on("agent:updated", (partial) => {
    const existing = store().agents.find((a) => a.id === partial.id);
    if (existing) store().upsertAgent({ ...existing, ...partial });
  });

  s.on("message:received", (msg) => {
    store().addMessage(msg);
    // ── 从消息类型推断发送方状态（兜底，无需 Server 改动）────
    // agent 发出 task 消息 → 它在分派任务，置 active
    // agent 收到 task（toId 匹配）→ 它要处理任务，置 busy
    // agent 发出 result → 任务完成，置 idle
    // agent 发出/收到 error → 出错
    const agents = store().agents;
    const inferStatus = (agentId: string, status: "active" | "idle" | "busy" | "error") => {
      const a = agents.find((x) => x.id === agentId);
      if (a && a.status !== status && a.status !== "offline") {
        store().upsertAgent({ ...a, status });
      }
    };
    if (msg.type === "task")   inferStatus(msg.toId as string, "busy");
    if (msg.type === "result") inferStatus(msg.fromId, "idle");
    if (msg.type === "error") {
      inferStatus(msg.fromId, "error");
      // auto-recover after 8s
      const id = msg.fromId;
      setTimeout(() => {
        const cur = store().agents.find((x) => x.id === id);
        if (cur?.status === "error") store().upsertAgent({ ...cur, status: "idle" });
      }, 8000);
    }
  });

  s.on("experience:transferred", (transfer) => {
    store().addExperienceTransfer(transfer);
  });
}

export function sendMessage(msg: Parameters<ClientToServerEvents["message:send"]>[0]) {
  getSocket().emit("message:send", msg);
}

export function shareExperience(transfer: Omit<ExperienceTransfer, "id" | "createdAt">) {
  getSocket().emit("experience:share", transfer);
}
