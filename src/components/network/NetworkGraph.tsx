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

    // ── Host-cluster custom force ──────────────────────────────
    function clusterForce(alpha: number) {
      const sum = new Map<string, { x: number; y: number; count: number }>();
      for (const d of nodes) {
        const s = sum.get(d.host);
        if (!s) {
          sum.set(d.host, { x: d.x ?? 0, y: d.y ?? 0, count: 1 });
        } else {
          s.x += d.x ?? 0;
          s.y += d.y ?? 0;
          s.count++;
        }
      }
      for (const d of nodes) {
        const s = sum.get(d.host);
        if (!s || s.count <= 1) continue;
        const cx = s.x / s.count;
        const cy = s.y / s.count;
        d.vx = (d.vx ?? 0) + (cx - (d.x ?? 0)) * alpha * 0.1;
        d.vy = (d.vy ?? 0) + (cy - (d.y ?? 0)) * alpha * 0.1;
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
          .distance(140)
      )
      .force("charge", d3.forceManyBody().strength(-350))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide<AgentNode>((d) => nodeHalf(d) + 14))
      .force("cluster", clusterForce as unknown as d3.Force<AgentNode, AgentLink>);

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
