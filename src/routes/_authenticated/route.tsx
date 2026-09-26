import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import type { User } from "@supabase/supabase-js";
import {
  supabase,
  DEV_MOCK_USER,
  isDevBypass,
  getActiveDevSession,
  activateDevSession,
} from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    try {
      const { data, error } = await supabase.auth.getUser();
      if (!error && data?.user) {
        return { user: data.user };
      }

      // Preview / Dev bypass fallback
      if (isDevBypass || getActiveDevSession()) {
        activateDevSession();
        return { user: DEV_MOCK_USER as unknown as User };
      }

      throw redirect({ to: "/auth" });
    } catch (err) {
      if (
        typeof err === "object" &&
        err !== null &&
        ("to" in err || "status" in err || "headers" in err)
      ) {
        throw err;
      }
      if (isDevBypass || getActiveDevSession()) {
        activateDevSession();
        return { user: DEV_MOCK_USER as unknown as User };
      }
      throw redirect({ to: "/auth" });
    }
  },
  component: () => <Outlet />,
});
