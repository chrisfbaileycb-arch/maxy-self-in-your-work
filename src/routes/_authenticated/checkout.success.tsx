import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Sparkles, CheckCircle2, ArrowRight } from "lucide-react";

import { AppHeader } from "@/components/AppHeader";
import { getSubscriptionStatus } from "@/lib/settings.functions";

export const Route = createFileRoute("/_authenticated/checkout/success")({
  head: () => ({
    meta: [{ title: "Welcome to Pro — Self Maximizer" }, { name: "robots", content: "noindex" }],
  }),
  component: CheckoutSuccess,
});

function CheckoutSuccess() {
  const runSub = useServerFn(getSubscriptionStatus);
  const router = useRouter();
  const [confirmed, setConfirmed] = useState<boolean | null>(null);

  // Poll briefly — the Paddle webhook may not have landed yet when the user
  // is redirected here. Give it ~8s before falling back to a soft state.
  useEffect(() => {
    let cancelled = false;
    let tries = 0;
    async function tick() {
      if (cancelled) return;
      try {
        const sub = await runSub();
        if (sub?.isPro) {
          setConfirmed(true);
          router.invalidate();
          return;
        }
      } catch {
        /* ignore */
      }
      tries += 1;
      if (tries >= 8) setConfirmed(false);
      else setTimeout(tick, 1000);
    }
    tick();
    return () => {
      cancelled = true;
    };
  }, [runSub, router]);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-2xl px-6 py-16">
        <div className="rounded-3xl border border-border bg-card p-10 text-center space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/15">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">Welcome to Self Maximizer Pro</h1>
            <p className="text-muted-foreground">
              Thanks for upgrading — unlimited AI sorts, projects, and exports are unlocked.
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-background/60 p-4 text-sm">
            {confirmed === null && (
              <p className="text-muted-foreground">Confirming your subscription…</p>
            )}
            {confirmed === true && (
              <p className="inline-flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="h-4 w-4" /> Subscription active
              </p>
            )}
            {confirmed === false && (
              <p className="text-muted-foreground">
                We haven't received the confirmation from billing yet. It usually shows up within a
                minute — refresh Settings if it doesn't appear.
              </p>
            )}
          </div>

          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Go to Dashboard <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/settings"
              className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-4 py-2 text-sm hover:bg-accent"
            >
              View subscription
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
