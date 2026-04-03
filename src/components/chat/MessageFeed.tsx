"use client";

import { useRef, useEffect, useState } from "react";
import { clsx } from "clsx";
import { useNetworkStore } from "../../lib/store";
import { sendMessage } from "../../lib/socket";
import { v4 as uuidv4 } from "uuid";
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

export function MessageFeed() {
  const { messages, agents, selectedAgentId, isConnected } = useNetworkStore();
  const [input, setInput] = useState("");
  const [toId, setToId] = useState<string>("broadcast");
  const [msgType, setMsgType] = useState<MessageType>("chat");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const displayed = selectedAgentId
    ? messages.filter(
        (m) =>
          m.fromId === selectedAgentId ||
          m.toId === selectedAgentId ||
          m.toId === "broadcast"
      )
    : messages;

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
    if (id === "dashboard") return "Dashboard";
    return agents.find((a) => a.id === id)?.name || id.slice(0, 8);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Message list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1 font-mono text-[10px] bg-pixel-bg">
        {displayed.length === 0 && (
          <div className="text-pixel-gray text-center py-8 font-pixel text-[8px]">
            NO MESSAGES YET
            <br />
            <span className="animate-blink">_</span>
          </div>
        )}
        {[...displayed].reverse().map((msg) => (
          <div key={msg.id} className="group flex gap-2 hover:bg-pixel-surface px-1 py-0.5">
            <span className="text-pixel-gray flex-shrink-0 w-16 truncate">
              {new Date(msg.createdAt).toLocaleTimeString("en", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
            <span className="text-pixel-cyan flex-shrink-0 w-20 truncate">
              {getAgentName(msg.fromId)}
            </span>
            <span className="text-pixel-gray">→</span>
            <span className="text-pixel-yellow flex-shrink-0 w-20 truncate">
              {getAgentName(msg.toId)}
            </span>
            <span className={clsx("flex-1", typeColors[msg.type] || "text-white")}>
              [{msg.type.toUpperCase()}] {msg.content}
            </span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Send form */}
      <form onSubmit={handleSend} className="border-t border-pixel-border p-3 bg-pixel-surface">
        <div className="flex gap-2 mb-2">
          <select
            value={toId}
            onChange={(e) => setToId(e.target.value)}
            className="bg-pixel-bg border border-pixel-border text-pixel-cyan font-pixel text-[8px] px-2 py-1"
          >
            <option value="broadcast">BROADCAST</option>
            {agents.filter((a) => a.status !== "offline").map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
          <select
            value={msgType}
            onChange={(e) => setMsgType(e.target.value as MessageType)}
            className="bg-pixel-bg border border-pixel-border text-pixel-orange font-pixel text-[8px] px-2 py-1"
          >
            {["chat", "task", "broadcast", "experience"].map((t) => (
              <option key={t} value={t}>{t.toUpperCase()}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <span className="text-pixel-green font-pixel text-[10px] self-center">&gt;</span>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isConnected ? "Type a message..." : "Not connected"}
            disabled={!isConnected}
            className="flex-1 bg-transparent border-b border-pixel-green text-pixel-green font-mono text-[11px] outline-none placeholder:text-pixel-gray"
          />
          <button
            type="submit"
            disabled={!isConnected || !input.trim()}
            className="font-pixel text-[8px] px-3 py-1 bg-pixel-green text-black disabled:opacity-30 hover:bg-[#00cc33]"
          >
            SEND
          </button>
        </div>
      </form>
    </div>
  );
}
