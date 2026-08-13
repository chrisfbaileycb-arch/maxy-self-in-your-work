// Self Maximizer — Memory Map v2 data.
// Returns a graph: "You" anchor → projects (Circles) → memories.
// Edge weights and salience sizing computed server-side.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type MapMemory = {
  id: string;
  content: string;
  salience: 0 | 1 | 2;
  project_id: string;
  created_at: string;
};

export type MapProject = {
  id: string;
  name: string;
  kind: "personal" | "work";
  memoryCount: number;
  identityCount: number; // salience === 2
  weight: number; // edge weight from "You"
};

export type MapData = {
  projects: MapProject[];
  memories: MapMemory[];
  totals: { memories: number; identity: number };
};

export const getMemoryMap = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MapData> => {
    const { supabase, userId } = context;

    const [{ data: projects }, { data: memories }] = await Promise.all([
      supabase
        .from("projects")
        .select("id, name, kind")
        .eq("user_id", userId)
        .is("archived_at", null),
      supabase
        .from("memories")
        .select("id, content, salience, project_id, created_at")
        .eq("user_id", userId)
        .eq("is_private", false)
        .order("salience", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(500),
    ]);

    const mems = (memories ?? []) as MapMemory[];
    const byProject = new Map<string, MapMemory[]>();
    for (const m of mems) {
      const arr = byProject.get(m.project_id) ?? [];
      arr.push(m);
      byProject.set(m.project_id, arr);
    }

    const projectRows: MapProject[] = (projects ?? []).map((p) => {
      const list = byProject.get(p.id) ?? [];
      const identityCount = list.filter((m) => m.salience === 2).length;
      // Edge weight: total memories + identity boost. Personal gets +1 baseline.
      const weight = list.length + identityCount * 2 + (p.kind === "personal" ? 1 : 0);
      return {
        id: p.id,
        name: p.name,
        kind: p.kind as "personal" | "work",
        memoryCount: list.length,
        identityCount,
        weight,
      };
    });

    // Sort: personal first, then by weight desc
    projectRows.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === "personal" ? -1 : 1;
      return b.weight - a.weight;
    });

    return {
      projects: projectRows,
      memories: mems,
      totals: {
        memories: mems.length,
        identity: mems.filter((m) => m.salience === 2).length,
      },
    };
  });
