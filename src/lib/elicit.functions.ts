// Self Maximizer — guided elicitation. Ask up to 3 prioritized follow-up
// questions after a paste is sorted, and save answers as normal memories.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MemoryHint = z.object({
  category: z.enum(["personal", "work"]),
  content: z.string(),
  subject: z.string().nullable().optional(),
});

export type ElicitedQuestion = {
  question: string;
  rationale: string;
  priority: "critical" | "high" | "normal";
};

const ELICIT_SYSTEM = `Given a user's pasted text and the facts already extracted, identify up to 3 IMPORTANT durable facts that are implied but MISSING (e.g. a client mentioned but unnamed, a deadline referenced but undated). For each, write a short question and a one-line rationale. Rank by importance. Never ask about trivia. Return STRICT JSON: {"questions":[{"question":"...","rationale":"...","priority":"critical"|"high"|"normal"}]}. Return {"questions":[]} if nothing important is missing.`;

function parseQuestions(raw: string): ElicitedQuestion[] {
  let obj: unknown;
  try {
    obj = JSON.parse(raw);
  } catch {
    return [];
  }
  const list = (obj as { questions?: unknown[] })?.questions;
  if (!Array.isArray(list)) return [];
  const out: ElicitedQuestion[] = [];
  for (const q of list) {
    const item = q as { question?: unknown; rationale?: unknown; priority?: unknown };
    const question = typeof item.question === "string" ? item.question.trim() : "";
    const rationale = typeof item.rationale === "string" ? item.rationale.trim() : "";
    const priority =
      item.priority === "critical" || item.priority === "high" || item.priority === "normal"
        ? item.priority
        : "normal";
    if (question) out.push({ question, rationale, priority });
    if (out.length >= 3) break;
  }
  return out;
}

export const suggestGaps = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data) =>
    z
      .object({
        text: z.string().min(1).max(120_000),
        memories: z.array(MemoryHint).max(200),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: profile } = await supabase
      .from("profiles")
      .select("pause_recording")
      .eq("id", userId)
      .maybeSingle();
    if (profile?.pause_recording) return { questions: [] as ElicitedQuestion[] };

    const { chat, AIError } = await import("./ai-gateway.server");
    const facts = data.memories
      .slice(0, 60)
      .map((m) => `- [${m.category}${m.subject ? `/${m.subject}` : ""}] ${m.content}`)
      .join("\n");
    const userMsg = `PASTED TEXT:\n${data.text.slice(0, 12000)}\n\nFACTS ALREADY EXTRACTED:\n${facts || "(none)"}`;
    try {
      const raw = await chat(
        [
          { role: "system", content: ELICIT_SYSTEM },
          { role: "user", content: userMsg },
        ],
        { json: true, temperature: 0.2 },
      );
      return { questions: parseQuestions(raw) };
    } catch (e) {
      if (e instanceof AIError) return { questions: [] as ElicitedQuestion[] };
      throw e;
    }
  });

export const saveElicitedAnswer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data) =>
    z
      .object({
        content: z.string().min(1).max(2000),
        category: z.enum(["personal", "work"]),
        subject: z.string().min(1).max(120).optional(),
        batchId: z.string().uuid().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: profile } = await supabase
      .from("profiles")
      .select("pause_recording")
      .eq("id", userId)
      .maybeSingle();
    if (profile?.pause_recording) {
      return { status: "paused" as const };
    }

    const { data: projects } = await supabase
      .from("projects")
      .select("id, name, kind")
      .eq("user_id", userId)
      .is("archived_at", null);
    const personalId = projects?.find((p) => p.kind === "personal")?.id;
    const defaultWorkId = projects?.find((p) => p.kind === "work")?.id;
    if (!personalId || !defaultWorkId) {
      throw new Error("Your default projects are missing. Sign out and back in.");
    }
    const workProjects = (projects ?? []).filter((p) => p.kind === "work");
    const workByName = new Map(workProjects.map((p) => [p.name.toLowerCase(), p.id]));

    // Pro entitlement mirrors sortConversation.
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("status, current_period_end")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nowMs = Date.now();
    const endMs = sub?.current_period_end ? new Date(sub.current_period_end).getTime() : null;
    const isPro = sub
      ? ((sub.status === "active" || sub.status === "trialing" || sub.status === "past_due") &&
          (endMs === null || endMs > nowMs)) ||
        (sub.status === "canceled" && endMs !== null && endMs > nowMs)
      : false;
    const FREE_PROJECT_CAP = 2;
    const activeCount = workProjects.length + 1;

    let projectId: string;
    if (data.category === "personal") {
      projectId = personalId;
    } else if (data.subject) {
      const key = data.subject.toLowerCase();
      const existing = workByName.get(key);
      if (existing) {
        projectId = existing;
      } else if (isPro || activeCount < FREE_PROJECT_CAP) {
        const { data: created } = await supabase
          .from("projects")
          .insert({ user_id: userId, name: data.subject, kind: "work" })
          .select("id")
          .single();
        projectId = created?.id ?? defaultWorkId;
      } else {
        projectId = defaultWorkId;
      }
    } else {
      projectId = defaultWorkId;
    }

    const { error } = await supabase.from("memories").insert({
      user_id: userId,
      project_id: projectId,
      content: data.content,
      category: data.category,
      source: "elicited",
      batch_id: data.batchId ?? null,
    });
    if (error) throw new Error(error.message);
    return { status: "saved" as const };
  });
