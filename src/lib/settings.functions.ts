// Self Maximizer — settings/read-only account server functions.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("id, display_name, pause_recording, created_at")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data) =>
    z
      .object({
        displayName: z.string().min(1).max(120).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ display_name: data.displayName })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const FREE_PROJECT_CAP = 2;

export const getSubscriptionStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("subscriptions")
      .select("status, trial_ends_at, current_period_end, cancel_at_period_end")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const row = data ?? {
      status: "none",
      trial_ends_at: null,
      current_period_end: null,
      cancel_at_period_end: false,
    };
    const now = Date.now();
    const endMs = row.current_period_end ? new Date(row.current_period_end).getTime() : null;
    const isPro =
      (row.status === "active" || row.status === "trialing" || row.status === "past_due") &&
      (endMs === null || endMs > now)
        ? true
        : row.status === "canceled" && endMs !== null && endMs > now;
    return {
      ...row,
      isPro,
      projectCap: isPro ? null : FREE_PROJECT_CAP,
    };
  });

export const getUsageThisMonth = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);
    const periodMonth = monthStart.toISOString().slice(0, 10);
    const { data, error } = await context.supabase
      .from("usage_counters")
      .select("sort_count")
      .eq("user_id", context.userId)
      .eq("period_month", periodMonth)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { sort_count: data?.sort_count ?? 0, cap: 1000 };
  });
