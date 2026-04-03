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
  };
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
}

export const useNetworkStore = create<NetworkState & NetworkActions>((set) => ({
  agents: [],
  links: [],
  messages: [],
  experiences: [],
  selectedAgentId: null,
  filterStatus: "all",
  isConnected: false,
  serverUrl: "http://localhost:3211",
  stats: { activeAgents: 0, totalMessages: 0, totalExperiences: 0, completedTransfers: 0 },

  setAgents: (agents) => set({ agents }),
  upsertAgent: (agent) =>
    set((state) => {
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
  updateNetworkSnapshot: ({ agents, links }) => set({ agents, links }),
}));
