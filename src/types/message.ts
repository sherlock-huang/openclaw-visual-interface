// ============================================================
// OpenClaw 消息协议类型定义
// ============================================================

export type MessageType =
  | "chat"           // 普通对话
  | "task"           // 任务分配
  | "result"         // 任务结果
  | "experience"     // 经验传授
  | "broadcast"      // 广播
  | "ping"           // 心跳检测
  | "pong"           // 心跳响应
  | "join"           // 加入网络
  | "leave"          // 离开网络
  | "sync"           // 状态同步
  | "error";         // 错误通知

export type MessagePriority = "low" | "normal" | "high" | "urgent";
export type MessageStatus = "pending" | "sent" | "delivered" | "read" | "failed";

export interface Message {
  id: string;
  type: MessageType;
  fromId: string;     // 发送方 agent ID
  toId: string | "broadcast"; // 接收方 agent ID 或 broadcast
  content: string;
  payload?: Record<string, unknown>;  // 结构化数据
  priority: MessagePriority;
  status: MessageStatus;
  replyToId?: string; // 回复消息 ID
  createdAt: string;
  deliveredAt?: string;
  readAt?: string;
}

export interface ExperienceTransfer {
  id: string;
  fromId: string;
  toId: string;
  experienceIds: string[];  // 传授的经验 ID 列表
  accepted: boolean;
  reason?: string;
  createdAt: string;
}

// Socket.io 事件类型
export interface ServerToClientEvents {
  "agent:joined": (agent: import("./agent").Agent) => void;
  "agent:left": (agentId: string) => void;
  "agent:updated": (agent: Partial<import("./agent").Agent> & { id: string }) => void;
  "message:received": (message: Message) => void;
  "message:delivered": (messageId: string) => void;
  "experience:transferred": (transfer: ExperienceTransfer) => void;
  "network:snapshot": (data: {
    agents: import("./agent").Agent[];
    links: import("./agent").AgentLink[];
  }) => void;
  "error": (error: { code: string; message: string }) => void;
}

export interface ClientToServerEvents {
  "agent:register": (
    agent: Omit<import("./agent").Agent, "createdAt" | "lastSeenAt" | "totalMessages" | "totalExperiences">,
    cb: (success: boolean, agentId: string) => void
  ) => void;
  "agent:heartbeat": (agentId: string) => void;
  /**
   * Agent 主动上报自己的状态变化。
   * Server 收到后应更新 agent 记录并向所有连接的 Portal 广播 agent:updated。
   *
   * 调用时机（SDK 侧）：
   *   - 收到 task 消息开始处理前  → emit("agent:status", id, "busy",  { task: "..." })
   *   - 处理完成/返回结果后       → emit("agent:status", id, "idle",  {})
   *   - 发生未捕获异常时           → emit("agent:status", id, "error", { reason: err.message })
   *   - 空闲等待新任务时           → emit("agent:status", id, "idle",  {})
   */
  "agent:status": (
    agentId: string,
    status: import("./agent").AgentStatus,
    meta?: Record<string, unknown>
  ) => void;
  "message:send": (message: Omit<Message, "id" | "createdAt" | "status">) => void;
  "experience:share": (transfer: Omit<ExperienceTransfer, "id" | "createdAt">) => void;
  "network:request": () => void;
}
