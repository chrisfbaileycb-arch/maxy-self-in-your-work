import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import {
  User,
  CreditCard,
  BarChart3,
  Bell,
  Save,
  Copy,
  Download,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

import { AppHeader } from "@/components/AppHeader";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { supabase } from "@/integrations/supabase/client";
import {
  getProfile,
  updateProfile,
  getSubscriptionStatus,
  getUsageThisMonth,
} from "@/lib/settings.functions";
import { setPauseRecording } from "@/lib/memories.functions";
import { exportMemoryMd, buildSystemPrompt } from "@/lib/export.functions";
import { createCustomerPortalSession } from "@/lib/payments.functions";
import { usePaddleCheckout } from "@/hooks/usePaddleCheckout";
import { getPushStatus, subscribeToPush, unsubscribeFromPush, type PushStatus } from "@/lib/push";
import { sendTestPush } from "@/lib/push.functions";

const PRO_PRICE_ID = "circles_pro_monthly";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [{ title: "Settings — Self Maximizer" }, { name: "robots", content: "noindex" }],
  }),
  component: Settings,
});

function Settings() {
  const runProfile = useServerFn(getProfile);
  const runUpdateProfile = useServerFn(updateProfile);
  const runSub = useServerFn(getSubscriptionStatus);
  const runUsage = useServerFn(getUsageThisMonth);
  const runPause = useServerFn(setPauseRecording);
  const runExport = useServerFn(exportMemoryMd);
  const runPrompt = useServerFn(buildSystemPrompt);
  const runTestPush = useServerFn(sendTestPush);
  const runPortal = useServerFn(createCustomerPortalSession);
  const { openCheckout, loading: checkoutLoading } = usePaddleCheckout();

  const [displayName, setDisplayName] = useState("");
  const [paused, setPaused] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [sub, setSub] = useState<{
    status: string;
    trial_ends_at: string | null;
    current_period_end: string | null;
    cancel_at_period_end?: boolean | null;
    isPro?: boolean;
  } | null>(null);
  const [usage, setUsage] = useState({ sort_count: 0, cap: 1000 });
  const [pushStatus, setPushStatus] = useState<PushStatus>("prompt");
  const [pushBusy, setPushBusy] = useState(false);

  useEffect(() => {
    setPushStatus(getPushStatus());
    (async () => {
      const [profile, subscription, usageData] = await Promise.all([
        runProfile(),
        runSub(),
        runUsage(),
      ]);
      setDisplayName(profile?.display_name ?? "");
      setPaused(!!profile?.pause_recording);
      setSub(subscription);
      setUsage(usageData);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSaveDisplayName() {
    setProfileSaving(true);
    try {
      await runUpdateProfile({ data: { displayName: displayName.trim() } });
      toast.success("Display name saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setProfileSaving(false);
    }
  }

  async function handleTogglePause() {
    const next = !paused;
    try {
      await runPause({ data: { paused: next } });
      setPaused(next);
      toast.success(next ? "Recording paused" : "Recording resumed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update");
    }
  }

  async function handleExport() {
    try {
      const { markdown } = await runExport();
      const blob = new Blob([markdown], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "MEMORY.md";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Exported MEMORY.md");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed");
    }
  }

  async function handleCopyPrompt() {
    try {
      const { prompt } = await runPrompt();
      await navigator.clipboard.writeText(prompt);
      toast.success("System prompt copied");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Copy failed");
    }
  }

  async function handleEnablePush() {
    setPushBusy(true);
    try {
      const res = await subscribeToPush();
      if (!res.ok) toast.error(res.reason);
      else {
        toast.success("Notifications enabled");
        setPushStatus(getPushStatus());
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not enable notifications");
    } finally {
      setPushBusy(false);
    }
  }

  async function handleDisablePush() {
    setPushBusy(true);
    try {
      await unsubscribeFromPush();
      toast.success("Notifications disabled");
      setPushStatus(getPushStatus());
    } finally {
      setPushBusy(false);
    }
  }

  async function handleTestPush() {
    setPushBusy(true);
    try {
      const res = await runTestPush();
      if (!res.ok) toast.error(res.reason);
      else toast.success(`Sent to ${res.sent} device${res.sent === 1 ? "" : "s"}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Test push failed");
    } finally {
      setPushBusy(false);
    }
  }

  const [portalLoading, setPortalLoading] = useState(false);

  async function handleUpgrade() {
    try {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) {
        toast.error("Please sign in again");
        return;
      }
      await openCheckout({
        priceId: PRO_PRICE_ID,
        customerEmail: user.email ?? undefined,
        customData: { userId: user.id },
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not open checkout");
    }
  }

  async function handleManageBilling() {
    setPortalLoading(true);
    try {
      const { url } = await runPortal();
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not open portal");
    } finally {
      setPortalLoading(false);
    }
  }

  const isPro = !!sub?.isPro;
  const willCancel = isPro && !!sub?.cancel_at_period_end;
  const subLabel = isPro
    ? sub?.status === "trialing"
      ? "Trialing — Pro"
      : sub?.status === "past_due"
        ? "Payment retrying — Pro"
        : willCancel
          ? "Pro (canceling)"
          : "Active — Pro"
    : "Free";
  const renewalDate = sub?.current_period_end
    ? new Date(sub.current_period_end).toLocaleDateString(undefined, {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <div className="min-h-screen bg-background">
      <PaymentTestModeBanner />
      <AppHeader />
      <main className="mx-auto max-w-6xl px-6 py-10 space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="mt-1 text-muted-foreground">
            Manage your account, exports, and subscription.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <section className="rounded-2xl border border-border bg-card p-6 space-y-4">
            <h2 className="font-semibold flex items-center gap-2">
              <User className="h-4 w-4 text-primary" /> Profile
            </h2>
            <div>
              <label className="text-sm font-medium">Display name</label>
              <div className="mt-1 flex gap-2">
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <button
                  onClick={handleSaveDisplayName}
                  disabled={profileSaving}
                  className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" /> Save
                </button>
              </div>
            </div>
            <button
              onClick={handleTogglePause}
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent"
            >
              {paused ? "Resume recording" : "Pause recording"}
            </button>
            {paused && (
              <p className="text-xs text-amber-200 bg-amber-500/10 border border-amber-500/40 rounded-md px-3 py-2">
                Recording is paused. Nothing will be saved until you resume.
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-card p-6 space-y-4">
            <h2 className="font-semibold flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" /> Subscription
            </h2>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    isPro
                      ? willCancel
                        ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                        : "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                      : "bg-muted text-muted-foreground border border-border"
                  }`}
                >
                  {subLabel}
                </span>
              </div>
              {sub?.trial_ends_at && (
                <p className="text-sm">
                  <span className="text-muted-foreground">Trial ends:</span>{" "}
                  {new Date(sub.trial_ends_at).toLocaleDateString()}
                </p>
              )}
              {renewalDate && (
                <p className="text-sm">
                  <span className="text-muted-foreground">
                    {willCancel ? "Access ends:" : isPro ? "Renews:" : "Ends:"}
                  </span>{" "}
                  {renewalDate}
                </p>
              )}
              {willCancel && (
                <p className="text-xs text-amber-200/90 bg-amber-500/10 border border-amber-500/30 rounded-md px-3 py-2 mt-2">
                  Your subscription is set to cancel. You'll keep Pro access through {renewalDate}.
                </p>
              )}
              {sub?.status === "past_due" && (
                <p className="text-xs text-orange-200 bg-orange-500/10 border border-orange-500/30 rounded-md px-3 py-2 mt-2">
                  Last payment failed. We're retrying — update your payment method to avoid
                  interruption.
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              {isPro ? (
                <button
                  onClick={handleManageBilling}
                  disabled={portalLoading}
                  className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent disabled:opacity-50"
                >
                  <ExternalLink className="h-4 w-4" />
                  {portalLoading ? "Opening…" : "Manage subscription"}
                </button>
              ) : (
                <button
                  onClick={handleUpgrade}
                  disabled={checkoutLoading}
                  className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  <Sparkles className="h-4 w-4" />
                  {checkoutLoading ? "Opening…" : "Upgrade to Pro — $9.95/mo"}
                </button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Pro unlocks unlimited AI sorts, projects, and exports. Cancel anytime from your
              billing portal.
            </p>
          </section>

          <section className="rounded-2xl border border-border bg-card p-6 space-y-4">
            <h2 className="font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" /> Usage this month
            </h2>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>AI sorts</span>
                <span>
                  {usage.sort_count} / {usage.cap}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${Math.min((usage.sort_count / usage.cap) * 100, 100)}%` }}
                />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-6 space-y-4">
            <h2 className="font-semibold flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" /> Push notifications
            </h2>
            <p className="text-sm text-muted-foreground">
              Status: <span className="capitalize text-foreground">{pushStatus}</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {pushStatus === "granted" && (
                <>
                  <button
                    onClick={handleTestPush}
                    disabled={pushBusy}
                    className="rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-accent disabled:opacity-50"
                  >
                    Send test
                  </button>
                  <button
                    onClick={handleDisablePush}
                    disabled={pushBusy}
                    className="rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-accent disabled:opacity-50"
                  >
                    Disable
                  </button>
                </>
              )}
              {(pushStatus === "prompt" || pushStatus === "denied") && (
                <button
                  onClick={handleEnablePush}
                  disabled={pushBusy || pushStatus === "denied"}
                  className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {pushStatus === "denied" ? "Blocked in browser" : "Enable notifications"}
                </button>
              )}
            </div>
          </section>

          <section className="md:col-span-2 rounded-2xl border border-border bg-card p-6 space-y-4">
            <h2 className="font-semibold">Exports</h2>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleCopyPrompt}
                className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-accent"
              >
                <Copy className="h-4 w-4" /> Copy system prompt
              </button>
              <button
                onClick={handleExport}
                className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-accent"
              >
                <Download className="h-4 w-4" /> Export MEMORY.md
              </button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
