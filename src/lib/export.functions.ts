// Self Maximizer — export helpers (MEMORY.md + system prompt + per-project).
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type MemoryRow = {
  content: string;
  category: string;
  project_id: string;
  created_at: string;
  salience: number;
};
type ProjectRow = { id: string; name: string; kind: string };

// Sort by salience DESC (critical → high → normal), then oldest first within a rank.
function sortBySalience(a: MemoryRow, b: MemoryRow) {
  if ((b.salience ?? 1) !== (a.salience ?? 1)) return (b.salience ?? 1) - (a.salience ?? 1);
  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
}

function buildMarkdown(memories: MemoryRow[], projects: ProjectRow[]): string {
  const byId = new Map(projects.map((p) => [p.id, p]));
  const personal = memories.filter((m) => m.category === "personal").sort(sortBySalience);
  const work = memories.filter((m) => m.category === "work");

  const lines: string[] = ["# MEMORY.md", "", "_Exported from Self Maximizer._", ""];

  if (personal.length) {
    lines.push("## Personal / Family", "");
    for (const m of personal) lines.push(`- ${m.content}`);
    lines.push("");
  }
  if (work.length) {
    lines.push("## Work / Projects", "");
    // group by project, sort each group by salience
    const groups = new Map<string, MemoryRow[]>();
    for (const m of work) {
      const arr = groups.get(m.project_id) ?? [];
      arr.push(m);
      groups.set(m.project_id, arr);
    }
    for (const [pid, items] of groups) {
      const name = byId.get(pid)?.name ?? "Project";
      lines.push(`### ${name}`, "");
      for (const m of items.sort(sortBySalience)) lines.push(`- ${m.content}`);
      lines.push("");
    }
  }
  if (!personal.length && !work.length) lines.push("_No memories yet._");
  return lines.join("\n");
}

export const exportMemoryMd = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: memories }, { data: projects }] = await Promise.all([
      supabase
        .from("memories")
        .select("content, category, project_id, created_at, salience")
        .eq("user_id", userId)
        .eq("is_private", false)
        .order("created_at", { ascending: true }),
      supabase.from("projects").select("id, name, kind").eq("user_id", userId),
    ]);
    return { markdown: buildMarkdown((memories ?? []) as MemoryRow[], projects ?? []) };
  });

export const PROMPT_MODES = ["system", "email", "text"] as const;
export type PromptMode = (typeof PROMPT_MODES)[number];

function wrapForMode(mode: PromptMode, md: string): string {
  if (mode === "email") {
    return `You are helping me draft an email. Below is my ongoing context — use it to keep the message on-subject, in my voice, and grounded in what's already been discussed. Do NOT invent creative flourishes. Keep it concise, clear, and professional.

---

${md}

---

When I paste the email thread or describe the recipient and goal, produce a ready-to-send draft with a subject line and a short body. Ask one clarifying question only if a factual detail is missing.`;
  }
  if (mode === "text") {
    return `You are helping me reply to a text message. Below is my ongoing context — use it to stay on-subject and sound like me. Keep replies short (1–3 sentences), plain, and warm. No emojis unless I use them first. No creative embellishment.

---

${md}

---

When I paste the incoming message, produce a single reply I can send as-is. If the context doesn't cover something, ask one short clarifying question instead of guessing.`;
  }
  return `You are my long-term assistant. Below is my ongoing memory file. Use it as background context in every reply. Do not repeat it back to me unless I ask.

---

${md}

---

Respond conversationally, in first-person, and remember these details across the whole conversation.`;
}

export const buildSystemPrompt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data) =>
    z
      .object({
        criticalFirst: z.boolean().optional(),
        topN: z.number().int().min(1).max(500).optional(),
        mode: z.enum(PROMPT_MODES).optional(),
      })
      .parse(data ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const [{ data: memoriesRaw }, { data: projects }] = await Promise.all([
      supabase
        .from("memories")
        .select("content, category, project_id, created_at, salience")
        .eq("user_id", userId)
        .eq("is_private", false)
        .order("created_at", { ascending: true }),
      supabase.from("projects").select("id, name, kind").eq("user_id", userId),
    ]);
    let memories = (memoriesRaw ?? []) as MemoryRow[];
    if (data.criticalFirst) memories = memories.filter((m) => (m.salience ?? 1) >= 2);
    if (data.topN) {
      memories = [...memories].sort(sortBySalience).slice(0, data.topN);
    }
    const md = buildMarkdown(memories, projects ?? []);
    const prompt = wrapForMode(data.mode ?? "system", md);
    return { prompt, mode: data.mode ?? "system" };
  });

export const exportProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data) => z.object({ projectId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const [{ data: project }, { data: memories }] = await Promise.all([
      supabase
        .from("projects")
        .select("id, name, kind")
        .eq("id", data.projectId)
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("memories")
        .select("content, category, project_id, created_at, salience, is_private")
        .eq("user_id", userId)
        .eq("project_id", data.projectId)
        .eq("is_private", false)
        .order("created_at", { ascending: true }),
    ]);
    if (!project) throw new Error("Project not found.");
    const safe = project.name.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "");
    const lines: string[] = [
      `# ${project.name}`,
      "",
      `_Exported from Self Maximizer on ${new Date().toISOString().slice(0, 10)}._`,
      "",
    ];
    const sorted = ((memories ?? []) as MemoryRow[]).sort(sortBySalience);
    if (!sorted.length) lines.push("_No memories in this project yet._");
    else for (const m of sorted) lines.push(`- ${m.content}`);
    return {
      markdown: lines.join("\n"),
      filename: `${safe || "project"}-memory.md`,
      count: sorted.length,
    };
  });
