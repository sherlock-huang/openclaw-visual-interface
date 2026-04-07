import { create } from "zustand";
import type { Agent, AgentLink, Message, ExperienceTransfer } from "../types";

interface NetworkState {
  agents: Agent[];
  links: AgentLink[];
  messages: Message[];
  experiences: ExperienceTransfer[];
  selectedAgentId: string | null;
  filterStatus: string;
  isConnected: boolean;
  serverUrl: string;
  stats: {
    activeAgents: number;
    totalMessages: number;
    totalExperiences: number;
    completedTransfers: number;
    activeLinks: number;
  };
  // IDs of offline agents the user explicitly cleared; suppressed for 120s
  clearedOfflineIds: Map<string, number>;
}

interface NetworkActions {
  setAgents: (agents: Agent[]) => void;
  upsertAgent: (agent: Agent) => void;
  removeAgent: (agentId: string) => void;
  setLinks: (links: AgentLink[]) => void;
  addMessage: (msg: Message) => void;
  addExperienceTransfer: (transfer: ExperienceTransfer) => void;
  selectAgent: (id: string | null) => void;
  setFilterStatus: (status: string) => void;
  setConnected: (v: boolean) => void;
  setServerUrl: (url: string) => void;
  setStats: (stats: NetworkState["stats"]) => void;
  updateNetworkSnapshot: (data: { agents: Agent[]; links: AgentLink[] }) => void;
  markOfflineCleared: (ids: string[]) => void;
}

export const useNetworkStore = create<NetworkState & NetworkActions>((set, get) => ({
  agents: [],
  links: [],
  messages: [],
  experiences: [],
  selectedAgentId: null,
  filterStatus: "all",
  isConnected: false,
  serverUrl: process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:3211",
  stats: { activeAgents: 0, totalMessages: 0, totalExperiences: 0, completedTransfers: 0, activeLinks: 0 },
  clearedOfflineIds: new Map(),

  setAgents: (agents) => set({ agents }),
  upsertAgent: (agent) =>
    set((state) => {
      // Don't resurface an agent the user just cleared as offline
      const cleared = state.clearedOfflineIds.get(agent.id);
      if (cleared && agent.status === "offline" && Date.now() - cleared < 120_000) {
        return {};
      }
      const exists = state.agents.findIndex((a) => a.id === agent.id);
      if (exists >= 0) {
        const next = [...state.agents];
        next[exists] = agent;
        return { agents: next };
      }
      return { agents: [...state.agents, agent] };
    }),
  removeAgent: (agentId) =>
    set((state) => ({
      agents: state.agents.map((a) =>
        a.id === agentId ? { ...a, status: "offline" as const } : a
      ),
    })),
  setLinks: (links) => set({ links }),
  addMessage: (msg) =>
    set((state) => ({
      messages: [msg, ...state.messages].slice(0, 500),
    })),
  addExperienceTransfer: (transfer) =>
    set((state) => ({
      experiences: [transfer, ...state.experiences].slice(0, 200),
    })),
  selectAgent: (id) => set({ selectedAgentId: id }),
  setFilterStatus: (filterStatus) => set({ filterStatus }),
  setConnected: (isConnected) => set({ isConnected }),
  setServerUrl: (serverUrl) => set({ serverUrl }),
  setStats: (stats) => set({ stats }),

  updateNetworkSnapshot: ({ agents, links }) => {
    const now = Date.now();
    const cleared = get().clearedOfflineIds;
    // Prune expired suppressions
    const freshCleared = new Map<string, number>();
    cleared.forEach((ts, id) => { if (now - ts < 120_000) freshCleared.set(id, ts); });
    // Filter out offline agents the user cleared (within suppression window)
    const filtered = agents.filter(
      (a) => !(a.status === "offline" && freshCleared.has(a.id))
    );
    set({ agents: filtered, links, clearedOfflineIds: freshCleared });
  },

  markOfflineCleared: (ids: string[]) => {
    set((state) => {
      const next = new Map(state.clearedOfflineIds);
      const now = Date.now();
      ids.forEach((id) => next.set(id, now));
      return { clearedOfflineIds: next };
    });
  },
}));
