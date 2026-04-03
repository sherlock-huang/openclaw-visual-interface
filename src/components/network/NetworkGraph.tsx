"use client";

import { useEffect, useRef, useCallback } from "react";
import * as d3 from "d3";
import type { AgentNode, AgentLink } from "../../types";
import { useNetworkStore } from "../../lib/store";

const STATUS_COLOR: Record<string, string> = {
  active:  "#00ff41",
  idle:    "#ffff00",
  busy:    "#ff8c00",
  error:   "#ff2244",
  offline: "#444466",
};

export function NetworkGraph() {
  const svgRef = useRef<SVGSVGElement>(null);
  const simRef = useRef<d3.Simulation<AgentNode, AgentLink> | null>(null);
  const { agents, links, selectedAgentId, selectAgent } = useNetworkStore();

  const draw = useCallback(() => {
    const svg = d3.select(svgRef.current);
    if (!svgRef.current) return;

    const width = svgRef.current.clientWidth || 800;
    const height = svgRef.current.clientHeight || 500;

    svg.selectAll("*").remove();

    const defs = svg.append("defs");
    // 发光滤镜
    const filter = defs.append("filter").attr("id", "glow");
    filter.append("feGaussianBlur").attr("stdDeviation", "3").attr("result", "coloredBlur");
    const merge = filter.append("feMerge");
    merge.append("feMergeNode").attr("in", "coloredBlur");
    merge.append("feMergeNode").attr("in", "SourceGraphic");

    const g = svg.append("g");

    // Zoom
    svg.call(
      d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.3, 3])
        .on("zoom", (event) => g.attr("transform", event.transform))
    );

    const nodes: AgentNode[] = agents.map((a) => ({ ...a }));
    const resolvedLinks = links.map((l) => ({
      ...l,
      source: typeof l.source === "string" ? l.source : l.source.id,
      target: typeof l.target === "string" ? l.target : l.target.id,
    }));

    // Build simulation
    const sim = d3.forceSimulation<AgentNode>(nodes)
      .force("link", d3.forceLink<AgentNode, { source: string; target: string }>(resolvedLinks as { source: string; target: string }[])
        .id((d) => d.id)
        .distance(120)
      )
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide(50));

    simRef.current = sim;

    // Links
    const linkLines = g.append("g").selectAll("line")
      .data(resolvedLinks)
      .join("line")
      .attr("stroke", "#2a2a3f")
      .attr("stroke-width", (d) => Math.max(1, (d as AgentLink).strength * 4))
      .attr("stroke-opacity", 0.7);

    // Message flow animation path
    const flowDots = g.append("g").selectAll("circle.flow")
      .data(resolvedLinks.filter((l) => (l as AgentLink).messageCount > 0))
      .join("circle")
      .attr("class", "flow")
      .attr("r", 3)
      .attr("fill", "#00ffff")
      .attr("opacity", 0.8);

    // Node groups
    const nodeG = g.append("g").selectAll("g.node")
      .data(nodes)
      .join("g")
      .attr("class", "node")
      .attr("cursor", "pointer")
      .call(
        d3.drag<SVGGElement, AgentNode>()
          .on("start", (event, d) => {
            if (!event.active) sim.alphaTarget(0.3).restart();
            d.fx = d.x; d.fy = d.y;
          })
          .on("drag", (event, d) => { d.fx = event.x; d.fy = event.y; })
          .on("end", (event, d) => {
            if (!event.active) sim.alphaTarget(0);
            d.fx = null; d.fy = null;
          })
      )
      .on("click", (_event, d) => selectAgent(d.id));

    // Node glow circle (selection ring)
    nodeG.append("circle")
      .attr("r", 28)
      .attr("fill", "none")
      .attr("stroke", (d) => d.id === selectedAgentId ? "#ffffff" : "transparent")
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "4 2");

    // Hexagon body (pixel-style square)
    nodeG.append("rect")
      .attr("x", -20).attr("y", -20)
      .attr("width", 40).attr("height", 40)
      .attr("fill", (d) => STATUS_COLOR[d.status] + "22")
      .attr("stroke", (d) => STATUS_COLOR[d.status])
      .attr("stroke-width", 2)
      .attr("filter", "url(#glow)");

    // Platform icon text
    nodeG.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "0.4em")
      .attr("font-size", "16px")
      .text((d) => {
        const icons: Record<string, string> = {
          openclaw: "🦞", "claude-code": "🤖", codex: "💻", custom: "⚙️",
        };
        return icons[d.platform] || "🦞";
      });

    // Status dot
    nodeG.append("circle")
      .attr("cx", 16).attr("cy", -16)
      .attr("r", 5)
      .attr("fill", (d) => STATUS_COLOR[d.status]);

    // Name label
    nodeG.append("text")
      .attr("y", 32)
      .attr("text-anchor", "middle")
      .attr("font-family", '"Press Start 2P", monospace')
      .attr("font-size", "7px")
      .attr("fill", "#aaaacc")
      .text((d) => d.name.length > 10 ? d.name.slice(0, 9) + "…" : d.name);

    // Tick
    sim.on("tick", () => {
      linkLines
        .attr("x1", (d) => (d as { source: AgentNode }).source.x ?? 0)
        .attr("y1", (d) => (d as { source: AgentNode }).source.y ?? 0)
        .attr("x2", (d) => (d as { target: AgentNode }).target.x ?? 0)
        .attr("y2", (d) => (d as { target: AgentNode }).target.y ?? 0);

      nodeG.attr("transform", (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    // Animate flow dots along links
    function animateFlows() {
      flowDots.each(function(d) {
        const link = d as unknown as { source: AgentNode; target: AgentNode };
        const t = (Date.now() % 2000) / 2000;
        const x = (link.source.x ?? 0) + ((link.target.x ?? 0) - (link.source.x ?? 0)) * t;
        const y = (link.source.y ?? 0) + ((link.target.y ?? 0) - (link.source.y ?? 0)) * t;
        d3.select(this).attr("cx", x).attr("cy", y);
      });
      requestAnimationFrame(animateFlows);
    }
    animateFlows();

    return () => { sim.stop(); };
  }, [agents, links, selectedAgentId, selectAgent]);

  useEffect(() => {
    const cleanup = draw();
    return cleanup;
  }, [draw]);

  return (
    <svg
      ref={svgRef}
      className="w-full h-full bg-pixel-bg"
      style={{ minHeight: "400px" }}
    />
  );
}
