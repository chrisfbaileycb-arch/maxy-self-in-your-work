// Self Maximizer — memory server functions.
// Paste a conversation → AI classifies → memories saved to the user's private rows.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MONTHLY_SOFT_CAP = 1000;

export const sortConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data) =>
    z
      .object({
        text: z.string().min(1).max(120_000),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Respect pause flag — never store anything while paused.
    const { data: profile } = await supabase
      .from("profiles")
      .select("pause_recording")
      .eq("id", userId)
      .maybeSingle();
    if (profile?.pause_recording) {
      return { status: "paused" as const, saved: 0, personalCount: 0, workCount: 0 };
    }

    // Soft monthly cap.
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);
    const periodMonth = monthStart.toISOString().slice(0, 10);
    const { data: usage } = await supabase
      .from("usage_counters")
      .select("sort_count")
      .eq("user_id", userId)
      .eq("period_month", periodMonth)
      .maybeSingle();
    if ((usage?.sort_count ?? 0) >= MONTHLY_SOFT_CAP) {
      return {
        status: "capped" as const,
        saved: 0,
        personalCount: 0,
        workCount: 0,
        message: `You've used ${MONTHLY_SOFT_CAP} sorts this month. Reach out to raise the cap.`,
      };
    }

    // Load user's projects (all active, so we can subject-match work items).
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

    // Pro entitlement (unlimited projects) — free users can't auto-create beyond cap.
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
    let activeCount = workProjects.length + 1; // + personal default

    // Classify with existing work project names as hints.
    const { classifyLargeInput, AIError } = await import("./ai-gateway.server");
    let result;
    try {
      result = await classifyLargeInput(
        data.text,
        workProjects.map((p) => p.name),
      );
    } catch (e) {
      throw new Error(e instanceof AIError ? e.message : "Sorting failed. Try again.");
    }

    if (result.memories.length === 0) {
      return {
        status: "empty" as const,
        saved: 0,
        personalCount: 0,
        workCount: 0,
        projectsCreated: [] as string[],
      };
    }

    // Resolve or create a project for each memory.
    const createdProjects: string[] = [];
    const batchId = crypto.randomUUID();
    const rows: {
      user_id: string;
      project_id: string;
      content: string;
      category: string;
      source: string;
      salience: number;
      batch_id: string;
    }[] = [];

    for (const m of result.memories) {
      let projectId: string;
      if (m.category === "personal") {
        projectId = personalId;
      } else if (m.subject) {
        const key = m.subject.toLowerCase();
        const existing = workByName.get(key);
        if (existing) {
          projectId = existing;
        } else if (isPro || activeCount < FREE_PROJECT_CAP) {
          const { data: created, error: cErr } = await supabase
            .from("projects")
            .insert({ user_id: userId, name: m.subject, kind: "work" })
            .select("id, name")
            .single();
          if (cErr || !created) {
            projectId = defaultWorkId;
          } else {
            projectId = created.id;
            workByName.set(key, created.id);
            createdProjects.push(created.name);
            activeCount += 1;
          }
        } else {
          projectId = defaultWorkId;
        }
      } else {
        projectId = defaultWorkId;
      }
      rows.push({
        user_id: userId,
        project_id: projectId,
        content: m.content,
        category: m.category,
        source: "drop",
        salience: m.salience,
        batch_id: batchId,
      });
    }

    const { error } = await supabase.from("memories").insert(rows);
    if (error) throw new Error(error.message);

    // Bump usage counter.
    await supabase.from("usage_counters").upsert(
      {
        user_id: userId,
        period_month: periodMonth,
        sort_count: (usage?.sort_count ?? 0) + 1,
      },
      { onConflict: "user_id,period_month" },
    );

    const personalCount = rows.filter((r) => r.category === "personal").length;
    const workCount = rows.length - personalCount;
    return {
      status: "saved" as const,
      saved: rows.length,
      personalCount,
      workCount,
      projectsCreated: createdProjects,
      truncated: result.truncated,
      batchId,
      memoriesForHints: result.memories.map((m) => ({
        category: m.category,
        content: m.content,
        subject: m.subject,
      })),
    };
  });

export const listMemories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data) =>
    z
      .object({
        includePrivate: z.boolean().optional(),
        search: z.string().optional(),
        limit: z.number().min(1).max(200).optional(),
      })
      .parse(data ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    let q = supabase
      .from("memories")
      .select("id, project_id, content, category, is_private, salience, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 100);
    if (!data.includePrivate) q = q.eq("is_private", false);
    if (data.search) q = q.ilike("content", `%${data.search}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const deleteMemory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("memories")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const toggleMemoryPrivate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data) => z.object({ id: z.string().uuid(), isPrivate: z.boolean() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("memories")
      .update({ is_private: data.isPrivate })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setMemorySalience = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data) =>
    z
      .object({
        id: z.string().uuid(),
        salience: z.union([z.literal(0), z.literal(1), z.literal(2)]),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("memories")
      .update({ salience: data.salience })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true, salience: data.salience };
  });

export const setPauseRecording = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data) => z.object({ paused: z.boolean() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ pause_recording: data.paused })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true, paused: data.paused };
  });

export const undoLastSort = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: latest } = await supabase
      .from("memories")
      .select("batch_id, created_at")
      .eq("user_id", userId)
      .not("batch_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const batchId = latest?.batch_id;
    if (!batchId) return { deleted: 0 };
    const { data: deletedRows, error } = await supabase
      .from("memories")
      .delete()
      .eq("user_id", userId)
      .eq("batch_id", batchId)
      .select("id");
    if (error) throw new Error(error.message);
    return { deleted: deletedRows?.length ?? 0 };
  });

export const deleteMemories = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data) => z.object({ ids: z.array(z.string().uuid()).min(1).max(500) }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: deletedRows, error } = await supabase
      .from("memories")
      .delete()
      .in("id", data.ids)
      .eq("user_id", userId)
      .select("id");
    if (error) throw new Error(error.message);
    return { deleted: deletedRows?.length ?? 0 };
  });

export const clearProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data) => z.object({ projectId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: deletedRows, error } = await supabase
      .from("memories")
      .delete()
      .eq("user_id", userId)
      .eq("project_id", data.projectId)
      .select("id");
    if (error) throw new Error(error.message);
    return { deleted: deletedRows?.length ?? 0 };
  });
