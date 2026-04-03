"use client";

import { useRef, useEffect, useState } from "react";
import { clsx } from "clsx";
import { useNetworkStore } from "../../lib/store";
import { sendMessage } from "../../lib/socket";
import type { MessageType, MessagePriority } from "../../types";

const typeColors: Record<string, string> = {
  chat:       "text-white",
  task:       "text-pixel-orange",
  result:     "text-pixel-green",
  experience: "text-pixel-purple",
  broadcast:  "text-pixel-cyan",
  ping:       "text-pixel-gray",
  pong:       "text-pixel-gray",
  error:      "text-pixel-red",
  join:       "text-pixel-green",
  leave:      "text-pixel-red",
  sync:       "text-pixel-cyan",
};

const typeIcons: Record<string, string> = {
  chat:       "💬",
  task:       "📋",
  result:     "✅",
  experience: "🧠",
  broadcast:  "📡",
  ping:       "🏓",
  pong:       "🏓",
  error:      "❌",
  join:       "🚪",
  leave:      "👋",
  sync:       "🔄",
};

const FILTER_TYPES = ["all", "chat", "task", "result", "broadcast", "experience"] as const;
type FilterType = (typeof FILTER_TYPES)[number];

export function MessageFeed() {
  const { messages, agents, selectedAgentId, isConnected } = useNetworkStore();
  const [input, setInput] = useState("");
  const [toId, setToId] = useState<string>("broadcast");
  const [msgType, setMsgType] = useState<MessageType>("chat");
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const baseMessages = selectedAgentId
    ? messages.filter(
        (m) =>
          m.fromId === selectedAgentId ||
          m.toId === selectedAgentId ||
          m.toId === "broadcast"
      )
    : messages;

  const displayed = baseMessages.filter((m) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      m.content.toLowerCase().includes(q) ||
      getAgentName(m.fromId).toLowerCase().includes(q) ||
      getAgentName(m.toId).toLowerCase().includes(q);
    const matchType = filterType === "all" || m.type === filterType;
    return matchSearch && matchType;
  });

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || !isConnected) return;
    sendMessage({
      type: msgType,
      fromId: "dashboard",
      toId,
      content: input.trim(),
      priority: "normal" as MessagePriority,
    });
    setInput("");
  }

  function getAgentName(id: string) {
    if (id === "broadcast") return "ALL";
    if (id === "dashboard") return "DASH";
    return agents.find((a) => a.id === id)?.name ?? id.slice(0, 8);
  }

  return (
    <div className="flex flex-col h-full">

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-pixel-border bg-pixel-surface flex-shrink-0">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="SEARCH…"
          className="bg-pixel-bg border border-pixel-border text-pixel-green font-pixel text-[8px] px-2 py-1 w-32 placeholder:text-pixel-gray outline-none focus:border-pixel-green"
        />

        {/* Type filter pills */}
        <div className="flex gap-1">
          {FILTER_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              title={t}
              className={clsx(
                "font-pixel text-[7px] px-2 py-1 border transition-colors leading-none",
                filterType === t
                  ? "border-pixel-green text-pixel-green bg-[#00ff4122]"
                  : "border-pixel-border text-pixel-gray hover:border-pixel-green hover:text-pixel-green"
              )}
            >
              {t === "all" ? "ALL" : typeIcons[t]}
            </button>
          ))}
        </div>

        <span className="font-pixel text-[7px] text-pixel-gray ml-auto">
          {displayed.length}/{baseMessages.length}
        </span>
      </div>

      {/* ── Message list (newest first at top) ── */}
      <div className="flex-1 overflow-y-auto p-3 space-y-0.5 font-mono bg-pixel-bg">
        {displayed.length === 0 && (
          <div className="text-pixel-gray text-center py-10 font-pixel text-[8px]">
            {search || filterType !== "all" ? "NO MATCHES" : "NO MESSAGES YET"}
            <br />
            <span className="animate-blink">_</span>
          </div>
        )}

        {displayed.map((msg) => (
          <div
            key={msg.id}
            className="group flex items-center gap-2 px-1 py-0.5 hover:bg-pixel-surface rounded-none text-[10px]"
          >
            {/* Timestamp */}
            <span className="text-pixel-gray flex-shrink-0 w-14 text-[9px] tabular-nums">
              {new Date(msg.createdAt).toLocaleTimeString("en", {
                hour12: false,
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </span>

            {/* Type icon */}
            <span className="text-[11px] flex-shrink-0 w-5 text-center" title={msg.type}>
              {typeIcons[msg.type] ?? "●"}
            </span>

            {/* From → To */}
            <span className="text-pixel-cyan flex-shrink-0 w-20 truncate text-[9px]">
              {getAgentName(msg.fromId)}
            </span>
            <span className="text-pixel-gray text-[9px]">→</span>
            <span className="text-pixel-yellow flex-shrink-0 w-20 truncate text-[9px]">
              {getAgentName(msg.toId)}
            </span>

            {/* Content */}
            <span className={clsx("flex-1 truncate", typeColors[msg.type] ?? "text-white")}>
              {msg.content}
            </span>
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      {/* ── Send form ── */}
      <form
        onSubmit={handleSend}
        className="border-t border-pixel-border p-3 bg-pixel-surface flex-shrink-0"
      >
        <div className="flex gap-2 mb-2">
          <select
            value={toId}
            onChange={(e) => setToId(e.target.value)}
            className="bg-pixel-bg border border-pixel-border text-pixel-cyan font-pixel text-[8px] px-2 py-1"
          >
            <option value="broadcast">📡 BROADCAST</option>
            {agents
              .filter((a) => a.status !== "offline")
              .map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
          </select>

          <select
            value={msgType}
            onChange={(e) => setMsgType(e.target.value as MessageType)}
            className="bg-pixel-bg border border-pixel-border text-pixel-orange font-pixel text-[8px] px-2 py-1"
          >
            {(["chat", "task", "broadcast", "experience"] as const).map((t) => (
              <option key={t} value={t}>
                {typeIcons[t]} {t.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-2">
          <span className="text-pixel-green font-pixel text-[10px] self-center">&gt;</span>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isConnected ? "Type a message…" : "Not connected"}
            disabled={!isConnected}
            className="flex-1 bg-transparent border-b border-pixel-green text-pixel-green font-mono text-[11px] outline-none placeholder:text-pixel-gray disabled:opacity-40"
          />
          <button
            type="submit"
            disabled={!isConnected || !input.trim()}
            className="font-pixel text-[8px] px-3 py-1 bg-pixel-green text-black disabled:opacity-30 hover:bg-[#00cc33] transition-colors"
          >
            SEND
          </button>
        </div>
      </form>
    </div>
  );
}
