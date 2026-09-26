import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { DEV_USER_ID, DEV_MOCK_USER, handleMockRestRequest } from "./client";

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return async (input, init) => {
    const urlString = typeof input === "string" ? input : input instanceof Request ? input.url : "";

    if (urlString.includes("placeholder.supabase.co")) {
      return handleMockRestRequest(urlString, init?.method || "GET");
    }

    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );

    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }

    if (
      isNewSupabaseApiKey(supabaseKey) &&
      headers.get("Authorization") === `Bearer ${supabaseKey}`
    ) {
      headers.delete("Authorization");
    }

    headers.set("apikey", supabaseKey);
    try {
      return await fetch(input, { ...init, headers });
    } catch {
      return handleMockRestRequest(urlString, init?.method || "GET");
    }
  };
}

function getDevFallbackContext() {
  const fallbackClient = createClient<Database>(
    "https://placeholder.supabase.co",
    "placeholder-key",
    {
      global: {
        fetch: createSupabaseFetch("placeholder-key"),
      },
      auth: {
        storage: undefined,
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );

  return {
    supabase: fallbackClient,
    userId: DEV_USER_ID,
    claims: {
      sub: DEV_USER_ID,
      email: DEV_MOCK_USER.email,
    },
  };
}

export const requireSupabaseAuth = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const SUPABASE_PUBLISHABLE_KEY =
      process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    const request = getRequest();
    const authHeader = request?.headers?.get("authorization");

    // Check for developer mock token or missing Supabase env in preview
    if (
      !SUPABASE_URL ||
      !SUPABASE_PUBLISHABLE_KEY ||
      SUPABASE_URL.includes("placeholder.supabase.co") ||
      !authHeader ||
      authHeader.includes("dev-mock-")
    ) {
      return next({
        context: getDevFallbackContext(),
      });
    }

    const token = authHeader.replace("Bearer ", "").trim();
    if (!token || token.startsWith("dev-mock-")) {
      return next({
        context: getDevFallbackContext(),
      });
    }

    try {
      const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
        global: {
          fetch: createSupabaseFetch(SUPABASE_PUBLISHABLE_KEY),
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
        auth: {
          storage: undefined,
          persistSession: false,
          autoRefreshToken: false,
        },
      });

      const { data, error } = await supabase.auth.getClaims(token);
      if (error || !data?.claims?.sub) {
        // Fall back gracefully in preview environments
        return next({
          context: getDevFallbackContext(),
        });
      }

      return next({
        context: {
          supabase,
          userId: data.claims.sub,
          claims: data.claims,
        },
      });
    } catch {
      return next({
        context: getDevFallbackContext(),
      });
    }
  },
);
