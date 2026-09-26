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
  MessageSquare,
  Send,
  Radio,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  Bot,
  Hash,
} from "lucide-react";
import { toast } from "sonner";

import { AppHeader } from "@/components/AppHeader";
import { PersonaManager } from "@/components/PersonaManager";
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
import {
  loadMessagingConnectors,
  saveMessagingConnectors,
  testConnectorDispatch,
  DEFAULT_CONNECTORS_CONFIG,
} from "@/lib/push-config";
import type { MessagingConnectorsConfig } from "@/types";

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

  // Messaging Connectors State
  const [connectors, setConnectors] =
    useState<MessagingConnectorsConfig>(DEFAULT_CONNECTORS_CONFIG);
  const [connectorsSaving, setConnectorsSaving] = useState(false);
  const [activeTestService, setActiveTestService] = useState<string | null>(null);

  useEffect(() => {
    setPushStatus(getPushStatus());
    setConnectors(loadMessagingConnectors());
    (async () => {
      try {
        const [profile, subscription, usageData] = await Promise.all([
          runProfile(),
          runSub(),
          runUsage(),
        ]);
        setDisplayName(profile?.display_name ?? "");
        setPaused(!!profile?.pause_recording);
        setSub(subscription);
        setUsage(usageData);
      } catch (err) {
        console.warn("Settings data loading fallback:", err);
      }
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

  // Messaging Connector Handlers
  function handleSaveConnectors() {
    setConnectorsSaving(true);
    try {
      saveMessagingConnectors(connectors);
      toast.success("Communication Hub connectors updated.");
    } catch {
      toast.error("Failed to save connector configuration.");
    } finally {
      setConnectorsSaving(false);
    }
  }

  async function handleTestConnector(service: "discord" | "telegram" | "slack" | "twilio") {
    setActiveTestService(service);
    try {
      const res = await testConnectorDispatch(service, connectors);
      if (res.ok) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Dispatch test failed");
    } finally {
      setActiveTestService(null);
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

  // Active status checks for pills
  const isDiscordActive = Boolean(connectors.discord.webhookUrl || connectors.discord.botToken);
  const isTelegramActive = Boolean(connectors.telegram.botToken && connectors.telegram.chatId);
  const isSlackActive = Boolean(connectors.slack.webhookUrl);
  const isTwilioActive = Boolean(
    connectors.twilio.webhookUrl ||
    (connectors.twilio.accountSid && connectors.twilio.authToken && connectors.twilio.fromNumber),
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PaymentTestModeBanner />
      <AppHeader />
      <main className="mx-auto max-w-6xl px-6 py-10 space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="mt-1 text-muted-foreground">
            Manage your account, master persona injection, messaging pipelines, exports, and
            subscription.
          </p>
        </div>

        {/* MASTER PERSONA MANAGER */}
        <PersonaManager />

        {/* COMMUNICATION HUB */}
        <section className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <Radio className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-bold">Communication Hub</h2>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Expand beyond email — connect real-time webhook and bot channels for automated
                prompt dispatch, memory broadcasts, and standups.
              </p>
            </div>

            {/* Service Status Pills */}
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border ${
                  isDiscordActive
                    ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/30"
                    : "bg-muted text-muted-foreground border-border"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${isDiscordActive ? "bg-indigo-400" : "bg-muted-foreground/40"}`}
                />
                Discord
              </span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border ${
                  isTelegramActive
                    ? "bg-sky-500/10 text-sky-400 border-sky-500/30"
                    : "bg-muted text-muted-foreground border-border"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${isTelegramActive ? "bg-sky-400" : "bg-muted-foreground/40"}`}
                />
                Telegram
              </span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border ${
                  isSlackActive
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                    : "bg-muted text-muted-foreground border-border"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${isSlackActive ? "bg-emerald-400" : "bg-muted-foreground/40"}`}
                />
                Slack
              </span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border ${
                  isTwilioActive
                    ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                    : "bg-muted text-muted-foreground border-border"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${isTwilioActive ? "bg-rose-400" : "bg-muted-foreground/40"}`}
                />
                Twilio / SMS
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium bg-amber-500/10 text-amber-300 border border-amber-500/30">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                Web &amp; Email
              </span>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* 1. Discord Connector */}
            <div className="rounded-xl border border-border/80 bg-background/50 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-indigo-400" />
                  <span className="font-semibold text-sm">Discord Channel &amp; Bot</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleTestConnector("discord")}
                  disabled={activeTestService === "discord"}
                  className="rounded-md border border-input bg-card px-2.5 py-1 text-xs font-medium hover:bg-accent disabled:opacity-50 inline-flex items-center gap-1"
                >
                  <Send className="h-3 w-3" />
                  {activeTestService === "discord" ? "Sending..." : "Test Webhook"}
                </button>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Webhook URL (Broadcasting)
                </label>
                <input
                  type="url"
                  placeholder="https://discord.com/api/webhooks/..."
                  value={connectors.discord.webhookUrl}
                  onChange={(e) =>
                    setConnectors({
                      ...connectors,
                      discord: { ...connectors.discord, webhookUrl: e.target.value },
                    })
                  }
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs font-mono"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Bot Token (Memory Sync)
                </label>
                <input
                  type="password"
                  placeholder="Bot token for bidirectional read/write..."
                  value={connectors.discord.botToken}
                  onChange={(e) =>
                    setConnectors({
                      ...connectors,
                      discord: { ...connectors.discord, botToken: e.target.value },
                    })
                  }
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs font-mono"
                />
              </div>
            </div>

            {/* 2. Telegram Connector */}
            <div className="rounded-xl border border-border/80 bg-background/50 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Send className="h-4 w-4 text-sky-400" />
                  <span className="font-semibold text-sm">Telegram Dispatch</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleTestConnector("telegram")}
                  disabled={activeTestService === "telegram"}
                  className="rounded-md border border-input bg-card px-2.5 py-1 text-xs font-medium hover:bg-accent disabled:opacity-50 inline-flex items-center gap-1"
                >
                  <Send className="h-3 w-3" />
                  {activeTestService === "telegram" ? "Sending..." : "Test Prompt"}
                </button>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Bot Token</label>
                <input
                  type="password"
                  placeholder="123456789:ABCdef..."
                  value={connectors.telegram.botToken}
                  onChange={(e) =>
                    setConnectors({
                      ...connectors,
                      telegram: { ...connectors.telegram, botToken: e.target.value },
                    })
                  }
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs font-mono"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Chat ID</label>
                <input
                  type="text"
                  placeholder="@yourchannel or numeric chat_id"
                  value={connectors.telegram.chatId}
                  onChange={(e) =>
                    setConnectors({
                      ...connectors,
                      telegram: { ...connectors.telegram, chatId: e.target.value },
                    })
                  }
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs font-mono"
                />
              </div>
            </div>

            {/* 3. Slack Connector */}
            <div className="rounded-xl border border-border/80 bg-background/50 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Hash className="h-4 w-4 text-emerald-400" />
                  <span className="font-semibold text-sm">Slack Standups &amp; Summaries</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleTestConnector("slack")}
                  disabled={activeTestService === "slack"}
                  className="rounded-md border border-input bg-card px-2.5 py-1 text-xs font-medium hover:bg-accent disabled:opacity-50 inline-flex items-center gap-1"
                >
                  <Send className="h-3 w-3" />
                  {activeTestService === "slack" ? "Sending..." : "Test Standup"}
                </button>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Incoming Webhook URL
                </label>
                <input
                  type="url"
                  placeholder="https://hooks.slack.com/services/..."
                  value={connectors.slack.webhookUrl}
                  onChange={(e) =>
                    setConnectors({
                      ...connectors,
                      slack: { ...connectors.slack, webhookUrl: e.target.value },
                    })
                  }
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs font-mono"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Target Channel / Workspace (Optional)
                </label>
                <input
                  type="text"
                  placeholder="#team-daily-standup"
                  value={connectors.slack.channel || ""}
                  onChange={(e) =>
                    setConnectors({
                      ...connectors,
                      slack: { ...connectors.slack, channel: e.target.value },
                    })
                  }
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs"
                />
              </div>
            </div>

            {/* 4. Twilio / SMS Connector */}
            <div className="rounded-xl border border-border/80 bg-background/50 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-rose-400" />
                  <span className="font-semibold text-sm">Twilio / SMS Generator (&lt;160c)</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleTestConnector("twilio")}
                  disabled={activeTestService === "twilio"}
                  className="rounded-md border border-input bg-card px-2.5 py-1 text-xs font-medium hover:bg-accent disabled:opacity-50 inline-flex items-center gap-1"
                >
                  <Send className="h-3 w-3" />
                  {activeTestService === "twilio" ? "Validating..." : "Test SMS"}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Account SID</label>
                  <input
                    type="password"
                    placeholder="AC..."
                    value={connectors.twilio.accountSid}
                    onChange={(e) =>
                      setConnectors({
                        ...connectors,
                        twilio: { ...connectors.twilio, accountSid: e.target.value },
                      })
                    }
                    className="mt-1 w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Auth Token</label>
                  <input
                    type="password"
                    placeholder="Auth token..."
                    value={connectors.twilio.authToken}
                    onChange={(e) =>
                      setConnectors({
                        ...connectors,
                        twilio: { ...connectors.twilio, authToken: e.target.value },
                      })
                    }
                    className="mt-1 w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-mono"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    From Phone Number
                  </label>
                  <input
                    type="text"
                    placeholder="+1234567890"
                    value={connectors.twilio.fromNumber}
                    onChange={(e) =>
                      setConnectors({
                        ...connectors,
                        twilio: { ...connectors.twilio, fromNumber: e.target.value },
                      })
                    }
                    className="mt-1 w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Webhook / Relay URL (Optional)
                  </label>
                  <input
                    type="url"
                    placeholder="https://api.twilio.com/..."
                    value={connectors.twilio.webhookUrl || ""}
                    onChange={(e) =>
                      setConnectors({
                        ...connectors,
                        twilio: { ...connectors.twilio, webhookUrl: e.target.value },
                      })
                    }
                    className="mt-1 w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleSaveConnectors}
              disabled={connectorsSaving}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {connectorsSaving ? "Saving..." : "Save Communication Hub Settings"}
            </button>
          </div>
        </section>

        <div className="grid gap-6 md:grid-cols-2">
          {/* PROFILE SECTION */}
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

          {/* SUBSCRIPTION SECTION */}
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

          {/* USAGE SECTION */}
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

          {/* PUSH NOTIFICATIONS */}
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

          {/* EXPORTS SECTION */}
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
