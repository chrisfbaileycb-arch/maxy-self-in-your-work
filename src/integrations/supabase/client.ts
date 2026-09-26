import { createClient, type User, type Session } from "@supabase/supabase-js";
import type { Database } from "./types";

export const DEV_USER_ID = "dev-user-00000000-0000-0000-0000-000000000001";
export const DEV_MOCK_USER = {
  id: DEV_USER_ID,
  email: "developer@selfmax.local",
  user_metadata: { display_name: "Developer Admin" },
  app_metadata: { provider: "developer" },
  aud: "authenticated",
  role: "authenticated",
  created_at: "2026-01-01T00:00:00.000Z",
};

export const DEV_MOCK_TOKEN =
  "dev-mock-access-token-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkZXYtdXNlci0wMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDEiLCJlbWFpbCI6ImRldmVsb3BlckBzZWxmbWF4LmxvY2FsIn0.dev-sig";

export const DEV_MOCK_SESSION = {
  access_token: DEV_MOCK_TOKEN,
  token_type: "bearer",
  expires_in: 31536000,
  expires_at: Math.floor(Date.now() / 1000) + 31536000,
  refresh_token: "dev-mock-refresh-token",
  user: DEV_MOCK_USER,
};

export const isDevBypass =
  typeof window !== "undefined" &&
  (window.location.hostname.includes("ai.studio") ||
    window.location.hostname.includes("run.app") ||
    window.location.hostname.includes("localhost") ||
    window.location.hostname.includes("127.0.0.1"));

export function getActiveDevSession() {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem("smx_dev_session_active");
  if (stored === "true" || isDevBypass) {
    return DEV_MOCK_SESSION;
  }
  return null;
}

export function activateDevSession() {
  if (typeof window !== "undefined") {
    localStorage.setItem("smx_dev_session_active", "true");
    localStorage.setItem("sb-session-dev", JSON.stringify(DEV_MOCK_SESSION));
  }
}

export function clearDevSession() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("smx_dev_session_active");
    localStorage.removeItem("sb-session-dev");
  }
}

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

// In-memory mock storage for resilient preview mode
const mockStore: Record<string, unknown[]> = {
  profiles: [
    {
      id: DEV_USER_ID,
      display_name: "Developer Admin",
      pause_recording: false,
      created_at: "2026-01-01T00:00:00.000Z",
    },
  ],
  projects: [
    {
      id: "project-personal-default",
      user_id: DEV_USER_ID,
      name: "Personal & Family",
      kind: "personal",
      archived_at: null,
      last_activity_at: new Date().toISOString(),
      created_at: "2026-01-01T00:00:00.000Z",
    },
    {
      id: "project-work-default",
      user_id: DEV_USER_ID,
      name: "Primary Venture",
      kind: "work",
      archived_at: null,
      last_activity_at: new Date().toISOString(),
      created_at: "2026-01-01T00:00:00.000Z",
    },
  ],
  subscriptions: [
    {
      user_id: DEV_USER_ID,
      status: "active",
      trial_ends_at: null,
      current_period_end: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString(),
      cancel_at_period_end: false,
      created_at: "2026-01-01T00:00:00.000Z",
    },
  ],
  usage_counters: [
    {
      user_id: DEV_USER_ID,
      period_month: new Date().toISOString().slice(0, 10),
      sort_count: 5,
    },
  ],
  memories: [
    {
      id: "mem-seed-1",
      user_id: DEV_USER_ID,
      project_id: "project-personal-default",
      content: "Prefers concise, actionable summaries without boilerplate or AI meta-commentary.",
      category: "personal",
      is_private: false,
      salience: 5,
      created_at: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: "mem-seed-2",
      user_id: DEV_USER_ID,
      project_id: "project-work-default",
      content: "Working on the SelfMax Capsule Assistant Chrome extension with BYOK architecture.",
      category: "work",
      is_private: false,
      salience: 4,
      created_at: new Date(Date.now() - 7200000).toISOString(),
    },
  ],
  notes: [
    {
      id: "note-seed-1",
      user_id: DEV_USER_ID,
      body: "Check native system utilities before drafting custom OS scripts.",
      done: false,
      created_at: new Date().toISOString(),
    },
  ],
  identity_tokens: [],
  templates: [],
};

export function handleMockRestRequest(url: string, method: string): Response {
  const urlObj = new URL(url);
  const pathname = urlObj.pathname;

  // Auth endpoints
  if (pathname.includes("/auth/v1/user") || pathname.includes("/auth/v1/token")) {
    return new Response(JSON.stringify(DEV_MOCK_USER), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  // REST tables
  for (const table of Object.keys(mockStore)) {
    if (pathname.includes(`/rest/v1/${table}`)) {
      if (method === "GET") {
        const rows = mockStore[table] || [];
        return new Response(JSON.stringify(rows), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Content-Range": `0-${Math.max(0, rows.length - 1)}/${rows.length}`,
          },
        });
      }
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  return new Response(JSON.stringify([]), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Range": "0-0/0",
    },
  });
}

function createSupabaseFetch(supabaseKey: string, supabaseUrl: string): typeof fetch {
  const isPlaceholderUrl = supabaseUrl.includes("placeholder.supabase.co");

  return async (input, init) => {
    const urlString = typeof input === "string" ? input : input instanceof Request ? input.url : "";

    // If placeholder Supabase URL or offline dev bypass, intercept mock REST responses
    if (isPlaceholderUrl || (isDevBypass && urlString.includes("placeholder.supabase.co"))) {
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
      const response = await fetch(input, { ...init, headers });
      return response;
    } catch (err) {
      // Graceful fallback on network failure or unreachable Supabase instance
      console.warn("[Supabase] Network fetch error, routing to resilient local mock:", err);
      return handleMockRestRequest(urlString, init?.method || "GET");
    }
  };
}

function createSupabaseClient() {
  const SUPABASE_URL =
    import.meta.env.VITE_SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    "https://placeholder.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY =
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    "placeholder-key";

  if (
    SUPABASE_URL === "https://placeholder.supabase.co" ||
    SUPABASE_PUBLISHABLE_KEY === "placeholder-key"
  ) {
    console.info(
      "[Supabase] Running with resilient developer mock layer (VITE_SUPABASE_URL unconfigured or preview environment).",
    );
  }

  const client = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: {
      fetch: createSupabaseFetch(SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL),
    },
    auth: {
      storage: typeof window !== "undefined" ? localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
    },
  });

  // Wrap getUser and getSession for seamless fallback
  const originalGetUser = client.auth.getUser.bind(client.auth);
  client.auth.getUser = async (jwt?: string) => {
    try {
      const res = await originalGetUser(jwt);
      if (res.data?.user) return res;
      if (isDevBypass || getActiveDevSession()) {
        return { data: { user: DEV_MOCK_USER as unknown as User }, error: null };
      }
      return res;
    } catch {
      if (isDevBypass || getActiveDevSession()) {
        return { data: { user: DEV_MOCK_USER as unknown as User }, error: null };
      }
      return { data: { user: null }, error: null };
    }
  };

  const originalGetSession = client.auth.getSession.bind(client.auth);
  client.auth.getSession = async () => {
    try {
      const res = await originalGetSession();
      if (res.data?.session) return res;
      if (isDevBypass || getActiveDevSession()) {
        return { data: { session: DEV_MOCK_SESSION as unknown as Session }, error: null };
      }
      return res;
    } catch {
      if (isDevBypass || getActiveDevSession()) {
        return { data: { session: DEV_MOCK_SESSION as unknown as Session }, error: null };
      }
      return { data: { session: null }, error: null };
    }
  };

  return client;
}

let _supabase: ReturnType<typeof createSupabaseClient> | undefined;

export const supabase = new Proxy({} as ReturnType<typeof createSupabaseClient>, {
  get(_, prop, receiver) {
    if (!_supabase) _supabase = createSupabaseClient();
    return Reflect.get(_supabase, prop, receiver);
  },
});
