import { createMiddleware } from "@tanstack/react-start";
import { supabase, DEV_MOCK_TOKEN, isDevBypass } from "./client";

export const attachSupabaseAuth = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token || (isDevBypass ? DEV_MOCK_TOKEN : undefined);
      return next({
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    } catch {
      return next({
        headers: isDevBypass ? { Authorization: `Bearer ${DEV_MOCK_TOKEN}` } : {},
      });
    }
  },
);
