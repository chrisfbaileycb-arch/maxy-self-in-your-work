// Public read-only endpoint: any AI or script can fetch a user's identity
// prompt with a revocable token. Returns plain text so it pastes cleanly
// into a system-prompt field. No Lovable session required.
import { createFileRoute } from "@tanstack/react-router";

type MemoryRow = {
  content: string;
  category: string;
  project_id: string;
  created_at: string;
  salience: number;
};
type ProjectRow = { id: string; name: string; kind: string };

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

function wrap(mode: string, md: string): string {
  if (mode === "email") {
    return `You are helping me draft an email. Below is my ongoing context — use it to keep the message on-subject, in my voice, and grounded in what's already been discussed.\n\n---\n\n${md}\n\n---\n\nWhen I paste the email thread, produce a ready-to-send draft.`;
  }
  if (mode === "text") {
    return `You are helping me reply to a text message. Below is my ongoing context — stay on-subject and sound like me. Keep replies short.\n\n---\n\n${md}\n\n---`;
  }
  return `You are my long-term assistant. Below is my ongoing memory file. Use it as background context in every reply. Do not repeat it back unless asked.\n\n---\n\n${md}\n\n---\n\nRespond conversationally, in first-person, and remember these details across the whole conversation.`;
}

async function handleGet(token: string): Promise<Response> {
  if (!token || !token.startsWith("smx_")) {
    return new Response("Invalid token.", { status: 404 });
  }
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: tokenRow } = await supabaseAdmin
    .from("identity_tokens")
    .select("id, user_id, mode, critical_only, revoked_at, expires_at")
    .eq("token", token)
    .maybeSingle();

  if (!tokenRow || tokenRow.revoked_at) {
    return new Response("Token not found or revoked.", { status: 404 });
  }
  if (tokenRow.expires_at && new Date(tokenRow.expires_at).getTime() <= Date.now()) {
    return new Response("This link has expired.", { status: 410 });
  }

  const [{ data: memoriesRaw }, { data: projects }] = await Promise.all([
    supabaseAdmin
      .from("memories")
      .select("content, category, project_id, created_at, salience")
      .eq("user_id", tokenRow.user_id)
      .eq("is_private", false)
      .order("created_at", { ascending: true }),
    supabaseAdmin.from("projects").select("id, name, kind").eq("user_id", tokenRow.user_id),
  ]);

  let memories = (memoriesRaw ?? []) as MemoryRow[];
  if (tokenRow.critical_only) memories = memories.filter((m) => (m.salience ?? 1) >= 2);

  const prompt = wrap(
    tokenRow.mode ?? "system",
    buildMarkdown(memories, (projects ?? []) as ProjectRow[]),
  );

  // Fire-and-forget usage timestamp bump.
  void supabaseAdmin
    .from("identity_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", tokenRow.id);

  return new Response(prompt, {
    status: 200,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
      "x-robots-tag": "noindex",
    },
  });
}

export const Route = createFileRoute("/api/public/identity/$token")({
  server: {
    handlers: {
      GET: async ({ params }) => handleGet(params.token),
    },
  },
});
