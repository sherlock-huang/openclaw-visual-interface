"use client";

import { useEffect, useRef, useCallback } from "react";
import * as d3 from "d3";
import type { AgentNode, AgentLink } from "../../types";
import { useNetworkStore } from "../../lib/store";

const SERVER = process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:3211";

const STATUS_COLOR: Record<string, string> = {
  active:  "#00ff41",
  idle:    "#ffff00",
  busy:    "#ff8c00",
  error:   "#ff2244",
  offline: "#444466",
};

const PLATFORM_ICON: Record<string, string> = {
  openclaw:     "🦞",
  "claude-code": "🤖",
  codex:        "💻",
  custom:       "⚙️",
};

/** Node half-size: grows with message activity (20–38px) */
function nodeHalf(d: AgentNode): number {
  return 20 + Math.min(Math.log1p(d.totalMessages) * 4, 18);
}

export function NetworkGraph() {
  const svgRef = useRef<SVGSVGElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const { agents, links, selectedAgentId, selectAgent } = useNetworkStore();

  const draw = useCallback(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const width = svgRef.current.clientWidth || 800;
    const height = svgRef.current.clientHeight || 500;

    svg.selectAll("*").remove();

    // ── Defs ──────────────────────────────────────────────────
    const defs = svg.append("defs");
    const glow = defs.append("filter").attr("id", "glow");
    glow.append("feGaussianBlur").attr("stdDeviation", "3").attr("result", "coloredBlur");
    const merge = glow.append("feMerge");
    merge.append("feMergeNode").attr("in", "coloredBlur");
    merge.append("feMergeNode").attr("in", "SourceGraphic");

    const g = svg.append("g");

    // Zoom
    svg.call(
      d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.2, 4])
        .on("zoom", (ev) => g.attr("transform", ev.transform))
    );

    // ── Office Zones (drawn first, behind nodes) ───────────────
    const zoneG = g.append("g").attr("class", "zones");

    const zw  = width  * 0.32;
    const zh  = height * 0.36;
    const pad = 20;
    const topY = 68;                   // main top zones start below Lobby
    const botY = height / 2 + pad;

    // Small Lobby strip (top-center) and Debug Corner (bottom-center)
    const lobbyW = 162, lobbyH = 52;
    const debugW = 144, debugH = 56;

    const zones = [
      // ── special small rooms ──
      {
        id: "lobby",
        label: "LOBBY",
        x: width / 2 - lobbyW / 2,
        y: 10,
        w: lobbyW,
        h: lobbyH,
        color: "#88aaff",
        emoji: "🚪",
        decor: "lobby",
      },
      {
        id: "debug",
        label: "DEBUG",
        x: width / 2 - debugW / 2,
        y: height - debugH - 10,
        w: debugW,
        h: debugH,
        color: "#ff2244",
        emoji: "🔧",
        decor: "debug",
      },
      // ── main 4 zones ──
      {
        id: "workspace",
        label: "WORKSPACE",
        x: width / 2 + pad,
        y: topY,
        w: zw,
        h: zh,
        color: "#00ff41",
        emoji: "💻",
        decor: "desks",
      },
      {
        id: "chat",
        label: "CHAT ZONE",
        x: width / 2 - zw - pad,
        y: topY,
        w: zw,
        h: zh,
        color: "#00ffff",
        emoji: "💬",
        decor: "bubbles",
      },
      {
        id: "lounge",
        label: "LOUNGE",
        x: width / 2 - zw - pad,
        y: botY,
        w: zw,
        h: zh,
        color: "#ff8c00",
        emoji: "☕",
        decor: "couch",
      },
      {
        id: "meeting",
        label: "MEETING ROOM",
        x: width / 2 + pad,
        y: botY,
        w: zw,
        h: zh,
        color: "#cc44ff",
        emoji: "📋",
        decor: "table",
      },
    ];

    for (const z of zones) {
      const zg = zoneG.append("g").attr("class", `zone zone-${z.id}`);

      // Zone background
      zg.append("rect")
        .attr("x", z.x)
        .attr("y", z.y)
        .attr("width", z.w)
        .attr("height", z.h)
        .attr("fill", z.color + "08")
        .attr("stroke", z.color + "55")
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "6 3")
        .attr("rx", 2);

      // Corner pixel accents (top-left, top-right, bottom-left, bottom-right)
      const corners = [
        [z.x, z.y],
        [z.x + z.w - 8, z.y],
        [z.x, z.y + z.h - 8],
        [z.x + z.w - 8, z.y + z.h - 8],
      ];
      for (const [cx, cy] of corners) {
        zg.append("rect")
          .attr("x", cx)
          .attr("y", cy)
          .attr("width", 8)
          .attr("height", 8)
          .attr("fill", z.color + "99");
      }

      // Zone label (top-left inside border)
      zg.append("text")
        .attr("x", z.x + 14)
        .attr("y", z.y + 16)
        .attr("font-family", '"Press Start 2P", monospace')
        .attr("font-size", "7px")
        .attr("fill", z.color + "cc")
        .text(`${z.emoji} ${z.label}`);

      // Zone pixel decorations
      const mx = z.x + z.w / 2;
      const my = z.y + z.h / 2;

      if (z.decor === "desks") {
        // Two pixel desks
        for (let i = 0; i < 2; i++) {
          const dx = mx - 30 + i * 46;
          const dy = my - 10;
          zg.append("rect").attr("x", dx).attr("y", dy).attr("width", 28).attr("height", 14).attr("fill", "#1a2a1a").attr("stroke", z.color + "44").attr("stroke-width", 1);
          zg.append("rect").attr("x", dx + 4).attr("y", dy + 4).attr("width", 8).attr("height", 6).attr("fill", z.color + "33");
          // monitor
          zg.append("rect").attr("x", dx + 18).attr("y", dy - 8).attr("width", 10).attr("height", 8).attr("fill", "#0a1a2a").attr("stroke", z.color + "66").attr("stroke-width", 1);
          zg.append("rect").attr("x", dx + 20).attr("y", dy - 6).attr("width", 6).attr("height", 4).attr("fill", z.color + "44");
        }
      } else if (z.decor === "bubbles") {
        // Three speech bubbles of different sizes
        const bubs = [
          { x: mx - 28, y: my - 20, w: 22, h: 14 },
          { x: mx + 4,  y: my - 14, w: 28, h: 16 },
          { x: mx - 20, y: my + 8,  w: 18, h: 12 },
        ];
        for (const b of bubs) {
          zg.append("rect").attr("x", b.x).attr("y", b.y).attr("width", b.w).attr("height", b.h).attr("rx", 3).attr("fill", z.color + "22").attr("stroke", z.color + "55").attr("stroke-width", 1);
          // tail pixel
          zg.append("rect").attr("x", b.x + 4).attr("y", b.y + b.h).attr("width", 4).attr("height", 4).attr("fill", z.color + "55");
          // text lines
          zg.append("rect").attr("x", b.x + 4).attr("y", b.y + 4).attr("width", b.w - 8).attr("height", 2).attr("fill", z.color + "66");
          if (b.h > 12) zg.append("rect").attr("x", b.x + 4).attr("y", b.y + 8).attr("width", b.w - 12).attr("height", 2).attr("fill", z.color + "44");
        }
      } else if (z.decor === "couch") {
        // Pixel couch: seat + back + armrests
        zg.append("rect").attr("x", mx - 30).attr("y", my - 4).attr("width", 60).attr("height", 16).attr("fill", "#2a1a08").attr("stroke", z.color + "55").attr("stroke-width", 1); // seat
        zg.append("rect").attr("x", mx - 30).attr("y", my - 16).attr("width", 60).attr("height", 12).attr("fill", "#1a1008").attr("stroke", z.color + "44").attr("stroke-width", 1); // back
        zg.append("rect").attr("x", mx - 36).attr("y", my - 14).attr("width", 8).attr("height", 20).attr("fill", "#2a1a08").attr("stroke", z.color + "44").attr("stroke-width", 1); // left arm
        zg.append("rect").attr("x", mx + 28).attr("y", my - 14).attr("width", 8).attr("height", 20).attr("fill", "#2a1a08").attr("stroke", z.color + "44").attr("stroke-width", 1); // right arm
        // cushion lines
        zg.append("rect").attr("x", mx - 2).attr("y", my - 4).attr("width", 4).attr("height", 16).attr("fill", z.color + "22");
        // coffee table
        zg.append("rect").attr("x", mx - 18).attr("y", my + 18).attr("width", 36).attr("height", 10).attr("fill", "#1a1408").attr("stroke", z.color + "44").attr("stroke-width", 1);
        zg.append("circle").attr("cx", mx).attr("cy", my + 23).attr("r", 4).attr("fill", z.color + "33");
      } else if (z.decor === "table") {
        // Round meeting table + 4 chairs
        zg.append("circle").attr("cx", mx).attr("cy", my).attr("r", 20).attr("fill", "#1a0a2a").attr("stroke", z.color + "66").attr("stroke-width", 2);
        const chairPos = [
          [mx, my - 28], [mx, my + 28], [mx - 28, my], [mx + 28, my],
        ];
        for (const [cx2, cy2] of chairPos) {
          zg.append("rect")
            .attr("x", cx2 - 6).attr("y", cy2 - 6)
            .attr("width", 12).attr("height", 12)
            .attr("fill", "#1a0a2a").attr("stroke", z.color + "55").attr("stroke-width", 1);
        }
        zg.append("rect").attr("x", mx - 8).attr("y", my - 6).attr("width", 10).attr("height", 14).attr("fill", "#ffffff11").attr("stroke", z.color + "44").attr("stroke-width", 1);
        zg.append("rect").attr("x", mx + 2).attr("y", my - 4).attr("width", 8).attr("height", 10).attr("fill", "#ffffff0d").attr("stroke", z.color + "33").attr("stroke-width", 1);
      } else if (z.decor === "lobby") {
        // Pixel door + welcome mat
        // door frame
        zg.append("rect").attr("x", mx - 8).attr("y", my - 14).attr("width", 16).attr("height", 22).attr("fill", "#0a0a1a").attr("stroke", z.color + "88").attr("stroke-width", 2);
        // door panel
        zg.append("rect").attr("x", mx - 5).attr("y", my - 11).attr("width", 10).attr("height", 16).attr("fill", z.color + "22").attr("stroke", z.color + "55").attr("stroke-width", 1);
        // doorknob
        zg.append("circle").attr("cx", mx + 3).attr("cy", my - 2).attr("r", 2).attr("fill", z.color + "cc");
        // welcome mat (3 stripes)
        for (let si = 0; si < 3; si++) {
          zg.append("rect").attr("x", mx - 12 + si * 2).attr("y", my + 10).attr("width", 20 - si * 4).attr("height", 4).attr("fill", z.color + (si === 0 ? "44" : si === 1 ? "33" : "22"));
        }
      } else if (z.decor === "debug") {
        // Warning triangle (pixel style)
        const tp = [[mx, my - 16], [mx - 14, my + 8], [mx + 14, my + 8]];
        zg.append("polygon")
          .attr("points", tp.map(([px, py]) => `${px},${py}`).join(" "))
          .attr("fill", z.color + "22")
          .attr("stroke", z.color + "99")
          .attr("stroke-width", 2);
        // exclamation mark pixels
        zg.append("rect").attr("x", mx - 2).attr("y", my - 10).attr("width", 4).attr("height", 10).attr("fill", z.color + "cc");
        zg.append("rect").attr("x", mx - 2).attr("y", my + 2).attr("width", 4).attr("height", 4).attr("fill", z.color + "cc");
        // warning light (blinking effect via low opacity)
        zg.append("circle").attr("cx", mx - 18).attr("cy", my - 10).attr("r", 4).attr("fill", z.color + "66").attr("stroke", z.color).attr("stroke-width", 1);
        zg.append("circle").attr("cx", mx + 18).attr("cy", my - 10).attr("r", 4).attr("fill", z.color + "33").attr("stroke", z.color).attr("stroke-width", 1);
      }
    }

    // ── Zone centers for affinity force ───────────────────────
    const zoneCenters: Record<string, { cx: number; cy: number }> = {};
    for (const z of zones) {
      zoneCenters[z.id] = { cx: z.x + z.w / 2, cy: z.y + z.h / 2 };
    }

    // ── Data ──────────────────────────────────────────────────
    const nodes: AgentNode[] = agents.map((a) => ({ ...a }));
    const resolvedLinks = links.map((l) => ({
      ...l,
      source: typeof l.source === "string" ? l.source : (l.source as AgentNode).id,
      target: typeof l.target === "string" ? l.target : (l.target as AgentNode).id,
    }));

    // ── Neighbors of selected node ────────────────────────────
    const neighborIds = new Set<string>();
    if (selectedAgentId) {
      neighborIds.add(selectedAgentId);
      for (const l of resolvedLinks) {
        const s = typeof l.source === "string" ? l.source : (l.source as unknown as AgentNode).id;
        const t = typeof l.target === "string" ? l.target : (l.target as unknown as AgentNode).id;
        if (s === selectedAgentId) neighborIds.add(t);
        if (t === selectedAgentId) neighborIds.add(s);
      }
    }

    // ── Host-cluster custom force (weak, keeps same-host agents near) ─
    function clusterForce(alpha: number) {
      const sum = new Map<string, { x: number; y: number; count: number }>();
      for (const d of nodes) {
        const s = sum.get(d.host);
        if (!s) sum.set(d.host, { x: d.x ?? 0, y: d.y ?? 0, count: 1 });
        else { s.x += d.x ?? 0; s.y += d.y ?? 0; s.count++; }
      }
      for (const d of nodes) {
        const s = sum.get(d.host);
        if (!s || s.count <= 1) continue;
        d.vx = (d.vx ?? 0) + (s.x / s.count - (d.x ?? 0)) * alpha * 0.06;
        d.vy = (d.vy ?? 0) + (s.y / s.count - (d.y ?? 0)) * alpha * 0.06;
      }
    }

    // ── Zone affinity force ───────────────────────────────────
    // Priority: error > newly-arrived > busy(master→meeting, else→workspace)
    //           > master(idle→meeting) > active+chatty→chat > idle→lounge
    function getZoneTarget(d: AgentNode): { cx: number; cy: number; str: number } | null {
      const zc = zoneCenters;
      if (d.status === "error")   return { ...zc.debug,     str: 0.38 };
      if (d.totalMessages < 5)    return { ...zc.lobby,     str: 0.28 };
      if (d.status === "busy" && d.role === "master")
                                  return { ...zc.meeting,   str: 0.22 };
      if (d.status === "busy")    return { ...zc.workspace, str: 0.22 };
      if (d.role === "master")    return { ...zc.meeting,   str: 0.14 };
      if (d.status === "active" && d.totalMessages > 20)
                                  return { ...zc.chat,      str: 0.14 };
      if (d.status === "idle")    return { ...zc.lounge,    str: 0.18 };
      return null;
    }

    function zoneAffinityForce(alpha: number) {
      for (const d of nodes) {
        const t = getZoneTarget(d);
        if (!t) continue;
        d.vx = (d.vx ?? 0) + (t.cx - (d.x ?? 0)) * alpha * t.str;
        d.vy = (d.vy ?? 0) + (t.cy - (d.y ?? 0)) * alpha * t.str;
      }
    }

    // ── Simulation ────────────────────────────────────────────
    const sim = d3
      .forceSimulation<AgentNode>(nodes)
      .force(
        "link",
        d3
          .forceLink<AgentNode, { source: string; target: string }>(
            resolvedLinks as { source: string; target: string }[]
          )
          .id((d) => d.id)
          .distance(120)
      )
      .force("charge", d3.forceManyBody().strength(-280))
      .force("center", d3.forceCenter(width / 2, height / 2).strength(0.04))
      .force("collision", d3.forceCollide<AgentNode>((d) => nodeHalf(d) + 14))
      .force("cluster",  clusterForce      as unknown as d3.Force<AgentNode, AgentLink>)
      .force("zoneAffinity", zoneAffinityForce as unknown as d3.Force<AgentNode, AgentLink>);

    // ── Links ─────────────────────────────────────────────────
    const isLinkActive = (d: typeof resolvedLinks[0]) => {
      if (!selectedAgentId) return false;
      const s = typeof d.source === "string" ? d.source : (d.source as unknown as AgentNode).id;
      const t = typeof d.target === "string" ? d.target : (d.target as unknown as AgentNode).id;
      return s === selectedAgentId || t === selectedAgentId;
    };

    const linkLines = g
      .append("g")
      .selectAll<SVGLineElement, typeof resolvedLinks[0]>("line")
      .data(resolvedLinks)
      .join("line")
      .attr("stroke", (d) => isLinkActive(d) ? "#00ff41" : "#2a2a3f")
      .attr("stroke-width", (d) => isLinkActive(d) ? Math.max(2, (d as unknown as AgentLink).strength * 5) : Math.max(1, (d as unknown as AgentLink).strength * 4))
      .attr("stroke-opacity", (d) => selectedAgentId ? (isLinkActive(d) ? 1 : 0.12) : 0.7);

    // ── Flow particles (3 per active link, staggered) ─────────
    interface Particle {
      link: typeof resolvedLinks[0];
      phase: number;
      speed: number;
    }
    const particleData: Particle[] = resolvedLinks
      .filter((l) => (l as unknown as AgentLink).messageCount > 0)
      .flatMap((l) => [
        { link: l, phase: 0,    speed: 1.5 },
        { link: l, phase: 0.38, speed: 2.1 },
        { link: l, phase: 0.72, speed: 1.2 },
      ]);

    const flowDots = g
      .append("g")
      .selectAll<SVGCircleElement, Particle>("circle.flow")
      .data(particleData)
      .join("circle")
      .attr("class", "flow")
      .attr("r", 2.5)
      .attr("fill", "#00ffff")
      .attr("opacity", 0.65);

    // ── Nodes ─────────────────────────────────────────────────
    const nodeG = g
      .append("g")
      .selectAll<SVGGElement, AgentNode>("g.node")
      .data(nodes)
      .join("g")
      .attr("class", "node")
      .attr("cursor", "pointer")
      .call(
        d3
          .drag<SVGGElement, AgentNode>()
          .on("start", (ev, d) => {
            if (!ev.active) sim.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (ev, d) => {
            d.fx = ev.x;
            d.fy = ev.y;
          })
          .on("end", (ev, d) => {
            if (!ev.active) sim.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      )
      .on("click", (_ev, d) => selectAgent(d.id === selectedAgentId ? null : d.id))
      .on("mouseover", (ev: MouseEvent, d: AgentNode) => {
        if (!tipRef.current) return;
        const tip = tipRef.current;
        tip.innerHTML = [
          `<span style="color:#00ff41;font-size:9px">${d.name}</span>`,
          `<span style="color:#888">${d.host}:${d.port}</span>`,
          `<span style="color:#00ffff">MSG: ${d.totalMessages}</span>`,
          `<span style="color:#cc44ff">XP: ${d.totalExperiences}</span>`,
          `<span style="color:${STATUS_COLOR[d.status]}">${d.status.toUpperCase()}</span>`,
        ].join("<br/>");
        tip.style.display = "block";
        tip.style.left = `${ev.offsetX + 14}px`;
        tip.style.top  = `${ev.offsetY - 10}px`;
      })
      .on("mousemove", (ev: MouseEvent) => {
        if (!tipRef.current) return;
        tipRef.current.style.left = `${ev.offsetX + 14}px`;
        tipRef.current.style.top  = `${ev.offsetY - 10}px`;
      })
      .on("mouseout", () => {
        if (tipRef.current) tipRef.current.style.display = "none";
      });

    // Dim non-neighbor nodes
    nodeG.attr("opacity", (d) =>
      !selectedAgentId || neighborIds.has(d.id) ? 1 : 0.2
    );

    // Selection ring
    nodeG
      .append("circle")
      .attr("r", (d) => nodeHalf(d) + 12)
      .attr("fill", "none")
      .attr("stroke", (d) => (d.id === selectedAgentId ? "#ffffff" : "transparent"))
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "4 2");

    // Node body (pixel square, size reflects message activity)
    nodeG
      .append("rect")
      .attr("x", (d) => -nodeHalf(d))
      .attr("y", (d) => -nodeHalf(d))
      .attr("width", (d) => nodeHalf(d) * 2)
      .attr("height", (d) => nodeHalf(d) * 2)
      .attr("fill", (d) => STATUS_COLOR[d.status] + "22")
      .attr("stroke", (d) => STATUS_COLOR[d.status])
      .attr("stroke-width", 2)
      .attr("filter", "url(#glow)");

    // Platform icon
    nodeG
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "central")
      .attr("font-size", (d) => `${Math.max(14, nodeHalf(d) * 0.8)}px`)
      .text((d) => PLATFORM_ICON[d.platform] ?? "🦞");

    // Status dot (top-right corner)
    nodeG
      .append("circle")
      .attr("cx", (d) => nodeHalf(d) - 4)
      .attr("cy", (d) => -(nodeHalf(d) - 4))
      .attr("r", 5)
      .attr("fill", (d) => STATUS_COLOR[d.status]);

    // Agent name label
    nodeG
      .append("text")
      .attr("y", (d) => nodeHalf(d) + 12)
      .attr("text-anchor", "middle")
      .attr("font-family", '"Press Start 2P", monospace')
      .attr("font-size", "7px")
      .attr("fill", "#aaaacc")
      .text((d) => (d.name.length > 10 ? d.name.slice(0, 9) + "…" : d.name));

    // Host label (small, below name)
    nodeG
      .append("text")
      .attr("y", (d) => nodeHalf(d) + 23)
      .attr("text-anchor", "middle")
      .attr("font-family", '"Courier New", monospace')
      .attr("font-size", "6px")
      .attr("fill", "#444466")
      .text((d) => d.host.length > 14 ? d.host.slice(0, 13) + "…" : d.host);

    // ── Tick ─────────────────────────────────────────────────
    sim.on("tick", () => {
      linkLines
        .attr("x1", (d) => ((d as unknown as { source: AgentNode }).source.x ?? 0))
        .attr("y1", (d) => ((d as unknown as { source: AgentNode }).source.y ?? 0))
        .attr("x2", (d) => ((d as unknown as { target: AgentNode }).target.x ?? 0))
        .attr("y2", (d) => ((d as unknown as { target: AgentNode }).target.y ?? 0));

      nodeG.attr("transform", (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    // ── Particle animation (rAF loop with cleanup guard) ──────
    let running = true;

    function animateParticles() {
      if (!running) return;
      const now = Date.now();
      flowDots.each(function (this: SVGCircleElement, p: Particle) {
        const src = (p.link as unknown as { source: AgentNode }).source;
        const tgt = (p.link as unknown as { target: AgentNode }).target;
        if (!src || !tgt) return;
        const t = ((now / 2000) * p.speed + p.phase) % 1;
        d3.select(this)
          .attr("cx", (src.x ?? 0) + ((tgt.x ?? 0) - (src.x ?? 0)) * t)
          .attr("cy", (src.y ?? 0) + ((tgt.y ?? 0) - (src.y ?? 0)) * t);
      });
      requestAnimationFrame(animateParticles);
    }
    animateParticles();

    return () => {
      running = false;
      sim.stop();
    };
  }, [agents, links, selectedAgentId, selectAgent]);

  useEffect(() => {
    const cleanup = draw();
    return cleanup;
  }, [draw]);

  return (
    <div className="relative w-full h-full">
      <svg
        ref={svgRef}
        className="w-full h-full bg-pixel-bg"
        style={{ minHeight: "400px" }}
      />
      {/* Hover tooltip */}
      <div
        ref={tipRef}
        style={{ display: "none", position: "absolute", pointerEvents: "none" }}
        className="bg-pixel-surface border border-pixel-border px-2 py-1.5 font-mono text-[9px] leading-relaxed z-10 shadow-lg"
      />
    </div>
  );
}
