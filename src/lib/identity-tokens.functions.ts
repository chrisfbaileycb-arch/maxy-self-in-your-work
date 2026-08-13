// Self Maximizer — Portable Identity: revocable public URLs that expose the
// user's system prompt to external AIs (ChatGPT, Claude, custom agents).
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MODES = ["system", "email", "text"] as const;

function randomToken(): string {
  // URL-safe, ~22 chars of entropy. Prefix makes tokens easy to spot in logs.
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const b64 = btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return `smx_${b64}`;
}

const TOKEN_COLUMNS =
  "id, token, label, mode, critical_only, revoked_at, expires_at, last_used_at, use_count, created_at";

export const listIdentityTokens = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("identity_tokens")
      .select(TOKEN_COLUMNS)
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const mintIdentityToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data) =>
    z
      .object({
        label: z.string().min(1).max(60).optional(),
        mode: z.enum(MODES).optional(),
        // Privacy default: share only identity-critical facts unless the user
        // deliberately widens the link.
        criticalOnly: z.boolean().optional(),
        // Links expire by default so a forgotten URL stops working on its own.
        expiresInDays: z.number().int().min(1).max(365).nullable().optional(),
      })
      .parse(data ?? {}),
  )
  .handler(async ({ data, context }) => {
    const days = data.expiresInDays === undefined ? 30 : data.expiresInDays;
    const expiresAt = days === null ? null : new Date(Date.now() + days * 86_400_000).toISOString();
    const { data: row, error } = await context.supabase
      .from("identity_tokens")
      .insert({
        user_id: context.userId,
        token: randomToken(),
        label: data.label ?? "Shared identity",
        mode: data.mode ?? "system",
        critical_only: data.criticalOnly ?? true,
        expires_at: expiresAt,
      })
      .select(TOKEN_COLUMNS)
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const revokeIdentityToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("identity_tokens")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
