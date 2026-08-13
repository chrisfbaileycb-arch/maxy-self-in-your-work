// Self Maximizer — reusable prompt templates with [variable] slots.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type TemplateRow = {
  id: string;
  name: string;
  body: string;
  created_at: string;
};

// Discover [slot] tokens in a template body.
export function extractSlots(body: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const re = /\[([a-zA-Z0-9_\- ]{1,40})\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) {
    const key = m[1].trim().toLowerCase();
    if (!key) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}

export const listTemplates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("templates")
      .select("id, name, body, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { templates: (data ?? []) as TemplateRow[] };
  });

export const upsertTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data) =>
    z
      .object({
        id: z.string().uuid().optional(),
        name: z.string().min(1).max(120),
        body: z.string().min(1).max(8000),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.id) {
      const { error } = await supabase
        .from("templates")
        .update({ name: data.name, body: data.body })
        .eq("id", data.id)
        .eq("user_id", userId);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await supabase
      .from("templates")
      .insert({ user_id: userId, name: data.name, body: data.body })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id as string };
  });

export const deleteTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("templates")
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Hydrate [slots] with real project context + user-provided values.
export const applyTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data) =>
    z
      .object({
        templateId: z.string().uuid(),
        projectId: z.string().uuid().nullable().optional(),
        // free-form slot values keyed by slot name (lowercased)
        values: z.record(z.string(), z.string()).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: tpl, error: tErr } = await supabase
      .from("templates")
      .select("id, name, body")
      .eq("id", data.templateId)
      .eq("user_id", userId)
      .maybeSingle();
    if (tErr) throw new Error(tErr.message);
    if (!tpl) throw new Error("Template not found.");

    let projectName = "";
    let projectMemories: { content: string; salience: number }[] = [];
    if (data.projectId) {
      const [{ data: proj }, { data: mems }] = await Promise.all([
        supabase
          .from("projects")
          .select("id, name")
          .eq("id", data.projectId)
          .eq("user_id", userId)
          .maybeSingle(),
        supabase
          .from("memories")
          .select("content, salience, created_at")
          .eq("user_id", userId)
          .eq("project_id", data.projectId)
          .eq("is_private", false)
          .order("created_at", { ascending: true }),
      ]);
      if (proj) projectName = proj.name as string;
      projectMemories = (mems ?? []).map((m) => ({
        content: m.content as string,
        salience: (m.salience as number) ?? 1,
      }));
    }

    // Sort high-salience memories to the top.
    const topMemories = [...projectMemories]
      .sort((a, b) => (b.salience ?? 1) - (a.salience ?? 1))
      .slice(0, 20)
      .map((m) => `- ${m.content}`)
      .join("\n");

    const today = new Date().toISOString().slice(0, 10);
    const built: Record<string, string> = {
      project: projectName,
      "project name": projectName,
      memories: topMemories,
      "project memories": topMemories,
      date: today,
      today: today,
    };

    const provided = data.values ?? {};
    const values: Record<string, string> = { ...built };
    for (const [k, v] of Object.entries(provided)) {
      values[k.trim().toLowerCase()] = v;
    }

    const output = tpl.body.replace(/\[([a-zA-Z0-9_\- ]{1,40})\]/g, (raw, key: string) => {
      const norm = key.trim().toLowerCase();
      const v = values[norm];
      return v && v.length > 0 ? v : raw;
    });

    return { output, name: tpl.name as string };
  });
