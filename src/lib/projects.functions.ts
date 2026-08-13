// Self Maximizer — project management server functions.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listProjects = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("projects")
      .select("id, name, kind, last_activity_at, archived_at, created_at")
      .eq("user_id", context.userId)
      .order("kind", { ascending: true })
      .order("last_activity_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const FREE_PROJECT_CAP = 2;

export const createProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data) =>
    z
      .object({
        name: z.string().min(1).max(120),
        kind: z.enum(["personal", "work"]),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    // Entitlement gate: free users are capped; Pro is unlimited.
    const { data: sub } = await context.supabase
      .from("subscriptions")
      .select("status, current_period_end")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const now = Date.now();
    const endMs = sub?.current_period_end ? new Date(sub.current_period_end).getTime() : null;
    const isPro = sub
      ? ((sub.status === "active" || sub.status === "trialing" || sub.status === "past_due") &&
          (endMs === null || endMs > now)) ||
        (sub.status === "canceled" && endMs !== null && endMs > now)
      : false;

    if (!isPro) {
      const { count } = await context.supabase
        .from("projects")
        .select("id", { count: "exact", head: true })
        .eq("user_id", context.userId)
        .is("archived_at", null);
      if ((count ?? 0) >= FREE_PROJECT_CAP) {
        throw new Error(
          `Free plan is limited to ${FREE_PROJECT_CAP} active projects. Upgrade to Pro for unlimited projects.`,
        );
      }
    }

    const { data: row, error } = await context.supabase
      .from("projects")
      .insert({ user_id: context.userId, name: data.name, kind: data.kind })
      .select("id, name, kind, last_activity_at, archived_at, created_at")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const archiveProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data) => z.object({ id: z.string().uuid(), archive: z.boolean() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("projects")
      .update({ archived_at: data.archive ? new Date().toISOString() : null })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true, archived: data.archive };
  });

export const getLifecycleSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);
    const { data, error } = await context.supabase
      .from("projects")
      .select("id, name, kind, last_activity_at, archived_at")
      .eq("user_id", context.userId)
      .eq("kind", "work")
      .is("archived_at", null)
      .lt("last_activity_at", cutoff.toISOString())
      .order("last_activity_at", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });
