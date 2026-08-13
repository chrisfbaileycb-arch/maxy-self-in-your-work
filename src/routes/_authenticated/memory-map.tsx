import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Map as MapIcon, Sparkles, Heart, Briefcase, User, ChevronRight } from "lucide-react";

import { AppHeader } from "@/components/AppHeader";
import { getMemoryMap, type MapProject, type MapMemory } from "@/lib/map.functions";

export const Route = createFileRoute("/_authenticated/memory-map")({
  head: () => ({
    meta: [{ title: "Memory Map — Self Maximizer" }, { name: "robots", content: "noindex" }],
  }),
  component: MemoryMap,
});

// --- Layout math -----------------------------------------------------------
const W = 1000;
const H = 620;
const CX = W / 2;
const CY = H / 2;
const RING = 220; // distance from "You" to project bubbles
const MEM_RING = 90; // distance from a project to its memory nodes

function salienceRadius(s: 0 | 1 | 2) {
  return s === 2 ? 12 : s === 1 ? 8 : 5;
}
function salienceColor(s: 0 | 1 | 2) {
  return s === 2 ? "hsl(var(--primary))" : s === 1 ? "hsl(24 90% 60%)" : "hsl(215 15% 55%)";
}

function projectPositions(projects: MapProject[]) {
  const n = Math.max(projects.length, 1);
  return projects.map((p, i) => {
    const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
    return {
      ...p,
      x: CX + Math.cos(angle) * RING,
      y: CY + Math.sin(angle) * RING,
      angle,
    };
  });
}

function memoryPositions(memories: MapMemory[], cx: number, cy: number, parentAngle: number) {
  // Fan the memories outward from the project bubble.
  const n = Math.max(memories.length, 1);
  const spread = Math.PI * 0.9; // 162°
  const start = parentAngle - spread / 2;
  return memories.map((m, i) => {
    const a = n === 1 ? parentAngle : start + (i / (n - 1)) * spread;
    // Identity memories sit closer to the parent (anchor pull).
    const r = m.salience === 2 ? MEM_RING * 0.75 : MEM_RING;
    return { ...m, x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
  });
}

// --- Component -------------------------------------------------------------
function MemoryMap() {
  const fetchMap = useServerFn(getMemoryMap);
  const { data, isLoading, error } = useQuery({
    queryKey: ["memory-map"],
    queryFn: () => fetchMap(),
  });

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [hover, setHover] = useState<
    { kind: "project"; project: MapProject } | { kind: "memory"; memory: MapMemory } | null
  >(null);

  const positioned = useMemo(() => projectPositions(data?.projects ?? []), [data]);

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="mx-auto max-w-6xl px-6 py-10 space-y-6">
        <header>
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <MapIcon className="h-7 w-7 text-primary" /> Your Memory Map
          </h1>
          <p className="mt-2 text-muted-foreground">
            Your Circles orbit <span className="font-medium text-foreground">You</span>. Bubble size
            reflects how much lives inside; edge thickness shows how much of your identity each
            Circle carries. Click a Circle to unfold its memories.
          </p>
        </header>

        {isLoading && (
          <div className="rounded-2xl border border-border bg-card/40 p-10 text-center text-muted-foreground">
            Loading your map…
          </div>
        )}
        {error && (
          <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-sm text-destructive">
            Couldn't load the map. Try refreshing.
          </div>
        )}

        {data && (
          <>
            {/* Legend */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span
                  className="inline-block h-3 w-3 rounded-full"
                  style={{ background: salienceColor(2) }}
                />
                Identity (Salience 2)
              </span>
              <span className="flex items-center gap-1.5">
                <span
                  className="inline-block h-3 w-3 rounded-full"
                  style={{ background: salienceColor(1) }}
                />
                High (Salience 1)
              </span>
              <span className="flex items-center gap-1.5">
                <span
                  className="inline-block h-3 w-3 rounded-full"
                  style={{ background: salienceColor(0) }}
                />
                Normal
              </span>
              <span className="ml-auto">
                {data.totals.memories} memories · {data.totals.identity} identity anchors
              </span>
            </div>

            {/* Canvas */}
            <div className="relative overflow-hidden rounded-2xl border border-border bg-card/40">
              <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full">
                {/* Edges: You → project */}
                {positioned.map((p) => {
                  const maxW = Math.max(...positioned.map((q) => q.weight), 1);
                  const strokeW = 1 + (p.weight / maxW) * 5;
                  const opacity = 0.35 + (p.weight / maxW) * 0.55;
                  return (
                    <line
                      key={`edge-${p.id}`}
                      x1={CX}
                      y1={CY}
                      x2={p.x}
                      y2={p.y}
                      stroke="hsl(var(--primary))"
                      strokeOpacity={opacity}
                      strokeWidth={strokeW}
                      strokeLinecap="round"
                    />
                  );
                })}

                {/* Expanded clusters: project → memories */}
                {positioned.map((p) => {
                  if (!expanded.has(p.id)) return null;
                  const list = (data.memories ?? []).filter((m) => m.project_id === p.id);
                  const nodes = memoryPositions(list, p.x, p.y, p.angle);
                  return (
                    <g key={`cluster-${p.id}`}>
                      {nodes.map((m) => (
                        <line
                          key={`me-${m.id}`}
                          x1={p.x}
                          y1={p.y}
                          x2={m.x}
                          y2={m.y}
                          stroke="hsl(var(--border))"
                          strokeWidth={m.salience === 2 ? 1.4 : 0.8}
                          strokeOpacity={m.salience === 2 ? 0.9 : 0.55}
                        />
                      ))}
                      {nodes.map((m) => (
                        <circle
                          key={`mn-${m.id}`}
                          cx={m.x}
                          cy={m.y}
                          r={salienceRadius(m.salience)}
                          fill={salienceColor(m.salience)}
                          stroke="hsl(var(--background))"
                          strokeWidth={1.5}
                          className="cursor-pointer transition-opacity hover:opacity-80"
                          onMouseEnter={() => setHover({ kind: "memory", memory: m })}
                          onMouseLeave={() => setHover(null)}
                        />
                      ))}
                    </g>
                  );
                })}

                {/* Project bubbles (semantic folding: cluster view) */}
                {positioned.map((p) => {
                  const r = 26 + Math.min(p.memoryCount, 40) * 0.9;
                  const isPersonal = p.kind === "personal";
                  return (
                    <g
                      key={`p-${p.id}`}
                      className="cursor-pointer"
                      onClick={() => toggle(p.id)}
                      onMouseEnter={() => setHover({ kind: "project", project: p })}
                      onMouseLeave={() => setHover(null)}
                    >
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={r}
                        fill={isPersonal ? "hsl(var(--primary) / 0.15)" : "hsl(24 90% 60% / 0.15)"}
                        stroke={isPersonal ? "hsl(var(--primary))" : "hsl(24 90% 60%)"}
                        strokeWidth={2}
                      />
                      <text
                        x={p.x}
                        y={p.y - 2}
                        textAnchor="middle"
                        className="fill-foreground text-[12px] font-semibold"
                        style={{ pointerEvents: "none" }}
                      >
                        {p.name.length > 18 ? p.name.slice(0, 17) + "…" : p.name}
                      </text>
                      <text
                        x={p.x}
                        y={p.y + 12}
                        textAnchor="middle"
                        className="fill-muted-foreground text-[10px]"
                        style={{ pointerEvents: "none" }}
                      >
                        {p.memoryCount} · {p.identityCount} anchor{p.identityCount === 1 ? "" : "s"}
                      </text>
                    </g>
                  );
                })}

                {/* "You" anchor node */}
                <g>
                  <circle cx={CX} cy={CY} r={34} fill="hsl(var(--primary))" />
                  <circle
                    cx={CX}
                    cy={CY}
                    r={44}
                    fill="none"
                    stroke="hsl(var(--primary) / 0.35)"
                    strokeWidth={2}
                  />
                  <text
                    x={CX}
                    y={CY + 5}
                    textAnchor="middle"
                    className="fill-primary-foreground text-sm font-bold"
                    style={{ pointerEvents: "none" }}
                  >
                    You
                  </text>
                </g>
              </svg>

              {/* Hover panel */}
              <div className="pointer-events-none absolute bottom-3 left-3 right-3 rounded-lg border border-border bg-background/90 p-3 text-xs shadow-sm backdrop-blur">
                {hover?.kind === "project" && (
                  <div className="flex items-start gap-2">
                    {hover.project.kind === "personal" ? (
                      <Heart className="mt-0.5 h-4 w-4 text-primary" />
                    ) : (
                      <Briefcase className="mt-0.5 h-4 w-4 text-orange-500" />
                    )}
                    <div>
                      <div className="font-semibold text-foreground">{hover.project.name}</div>
                      <div className="text-muted-foreground">
                        {hover.project.memoryCount} memories · {hover.project.identityCount}{" "}
                        identity anchors · click to{" "}
                        {expanded.has(hover.project.id) ? "fold" : "expand"}
                      </div>
                    </div>
                  </div>
                )}
                {hover?.kind === "memory" && (
                  <div className="flex items-start gap-2">
                    <Sparkles
                      className="mt-0.5 h-4 w-4"
                      style={{ color: salienceColor(hover.memory.salience) }}
                    />
                    <div>
                      <div className="font-medium text-foreground">
                        {hover.memory.salience === 2
                          ? "Identity"
                          : hover.memory.salience === 1
                            ? "High salience"
                            : "Memory"}
                      </div>
                      <div className="text-muted-foreground line-clamp-2">
                        {hover.memory.content}
                      </div>
                    </div>
                  </div>
                )}
                {!hover && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User className="h-4 w-4" /> Hover a Circle or memory for detail. Click a Circle
                    to unfold its cluster.
                  </div>
                )}
              </div>
            </div>

            {/* Circle list (fallback / accessibility) */}
            <section className="rounded-2xl border border-border bg-card p-4">
              <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Circles</h2>
              <ul className="divide-y divide-border">
                {positioned.map((p) => (
                  <li key={p.id}>
                    <button
                      onClick={() => toggle(p.id)}
                      className="flex w-full items-center gap-3 py-2 text-left hover:bg-muted/40"
                    >
                      <ChevronRight
                        className={`h-4 w-4 text-muted-foreground transition-transform ${expanded.has(p.id) ? "rotate-90" : ""}`}
                      />
                      {p.kind === "personal" ? (
                        <Heart className="h-4 w-4 text-primary" />
                      ) : (
                        <Briefcase className="h-4 w-4 text-orange-500" />
                      )}
                      <span className="font-medium">{p.name}</span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {p.memoryCount} memories · {p.identityCount} identity
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
