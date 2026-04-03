// ============================================================
// OpenClaw Agent 类型定义
// ============================================================

export type AgentStatus = "active" | "idle" | "busy" | "error" | "offline";
export type AgentRole = "master" | "worker" | "specialist" | "observer";
export type AgentPlatform = "openclaw" | "claude-code" | "codex" | "custom";

export interface AgentCapability {
  name: string;
  level: number; // 0-100 经验值
  lastUsed?: string;
}

export interface AgentExperience {
  id: string;
  agentId: string;
  category: string;
  content: string;
  tags: string[];
  confidence: number; // 0-100
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Agent {
  id: string;
  name: string;
  role: AgentRole;
  platform: AgentPlatform;
  status: AgentStatus;
  host: string;       // IP 或 hostname
  port: number;
  pid?: number;       // 进程ID（本机 sub-agent）
  version: string;
  capabilities: AgentCapability[];
  metadata: Record<string, unknown>;
  connectedTo: string[];  // 已连接的 agent ID 列表
  createdAt: string;
  lastSeenAt: string;
  totalMessages: number;
  totalExperiences: number;
}

export interface AgentNode extends Agent {
  // D3 网络图节点扩展字段
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
  vx?: number;
  vy?: number;
  index?: number;
}

export interface AgentLink {
  source: string | AgentNode;
  target: string | AgentNode;
  strength: number;     // 连接强度 0-1
  messageCount: number; // 传递消息数
  lastActivity: string;
}
