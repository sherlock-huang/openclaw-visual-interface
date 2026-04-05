"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { clsx } from "clsx";
import { useNetworkStore } from "../../lib/store";
import { sendMessage } from "../../lib/socket";
import type { MessageType, MessagePriority, Message } from "../../types";

const SERVER = process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:3211";
const PAGE_SIZE = 50;

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

// Normalise rows coming from REST API (snake_case) into Message (camelCase)
function normaliseRow(row: Record<string, unknown>): Message {
  return {
    id:        row.id as string,
    type:      row.type as MessageType,
    fromId:    (row.fromId ?? row.from_id) as string,
    toId:      (row.toId ?? row.to_id) as string,
    content:   row.content as string,
    priority:  (row.priority ?? "normal") as MessagePriority,
    status:    (row.status ?? "sent") as Message["status"],
    createdAt: (row.createdAt ?? row.created_at) as string,
    replyToId: (row.replyToId ?? row.reply_to_id) as string | undefined,
  };
}

export function MessageFeed() {
  const { messages: liveMessages, agents, selectedAgentId, isConnected } = useNetworkStore();

  const [history, setHistory] = useState<Message[]>([]);
  const [historyOffset, setHistoryOffset] = useState(0);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  const [input, setInput] = useState("");
  const [toId, setToId] = useState<string>("broadcast");
  const [msgType, setMsgType] = useState<MessageType>("chat");
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");

  const listRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const atBottomRef = useRef(true);

  // ── Load initial history ──────────────────────────────────
  useEffect(() => {
    fetch(`${SERVER}/api/messages?limit=${PAGE_SIZE}&offset=0`)
      .then((r) => r.json())
      .then((res: { data: Record<string, unknown>[]; total: number }) => {
        setHistory(res.data.map(normaliseRow).reverse()); // oldest first
        setHistoryTotal(res.total);
        setHistoryOffset(res.data.length);
      })
      .catch(() => {/* server not yet running */});
  }, []);

  // ── Load more (older) ─────────────────────────────────────
  const loadMore = useCallback(() => {
    if (loadingMore || historyOffset >= historyTotal) return;
    setLoadingMore(true);
    fetch(`${SERVER}/api/messages?limit=${PAGE_SIZE}&offset=${historyOffset}`)
      .then((r) => r.json())
      .then((res: { data: Record<string, unknown>[]; total: number }) => {
        setHistory((prev) => [...res.data.map(normaliseRow).reverse(), ...prev]);
        setHistoryTotal(res.total);
        setHistoryOffset((o) => o + res.data.length);
      })
      .finally(() => setLoadingMore(false));
  }, [loadingMore, historyOffset, historyTotal]);

  // ── Merge history + live, deduplicate ────────────────────
  const liveIds = new Set(liveMessages.map((m) => m.id));
  const allMessages = [
    ...history.filter((m) => !liveIds.has(m.id)),
    ...liveMessages,
  ];

  // ── Filter by selected agent ──────────────────────────────
  const baseMessages = selectedAgentId
    ? allMessages.filter(
        (m) => m.fromId === selectedAgentId || m.toId === selectedAgentId || m.toId === "broadcast"
      )
    : allMessages;

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

  // ── Smart auto-scroll ─────────────────────────────────────
  function handleScroll() {
    const el = listRef.current;
    if (!el) return;
    atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
  }

  useEffect(() => {
    if (atBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [liveMessages]);

  // ── Send ──────────────────────────────────────────────────
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

  const hasMore = historyOffset < historyTotal;

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

      {/* ── Message list ── */}
      <div
        ref={listRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-3 space-y-0.5 font-mono bg-pixel-bg"
      >
        {/* Load More */}
        {hasMore && (
          <div className="text-center pb-2">
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="font-pixel text-[7px] px-3 py-1 border border-pixel-border text-pixel-gray hover:text-pixel-green hover:border-pixel-green disabled:opacity-40 transition-colors"
            >
              {loadingMore ? "LOADING…" : `▲ LOAD MORE (${historyTotal - historyOffset} left)`}
            </button>
          </div>
        )}

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
            <span className="text-pixel-gray flex-shrink-0 w-14 text-[9px] tabular-nums">
              {new Date(msg.createdAt).toLocaleTimeString("en", {
                hour12: false,
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </span>

            <span className="text-[11px] flex-shrink-0 w-5 text-center" title={msg.type}>
              {typeIcons[msg.type] ?? "●"}
            </span>

            <span className="text-pixel-cyan flex-shrink-0 w-20 truncate text-[9px]">
              {getAgentName(msg.fromId)}
            </span>
            <span className="text-pixel-gray text-[9px]">→</span>
            <span className="text-pixel-yellow flex-shrink-0 w-20 truncate text-[9px]">
              {getAgentName(msg.toId)}
            </span>

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
