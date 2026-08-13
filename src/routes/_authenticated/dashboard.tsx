import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  BellOff,
  Copy,
  Download,
  Link2,
  Lock,
  Pause,
  Play,
  Sparkles,
  Trash2,
  Undo2,
} from "lucide-react";
import { toast } from "sonner";

import { AppHeader } from "@/components/AppHeader";
import { supabase } from "@/integrations/supabase/client";
import { getPushStatus, subscribeToPush, unsubscribeFromPush, type PushStatus } from "@/lib/push";
import { sendTestPush } from "@/lib/push.functions";
import {
  deleteMemories,
  deleteMemory,
  listMemories,
  setMemorySalience,
  setPauseRecording,
  sortConversation,
  toggleMemoryPrivate,
  undoLastSort,
} from "@/lib/memories.functions";

import { buildSystemPrompt, exportMemoryMd } from "@/lib/export.functions";
import {
  listIdentityTokens,
  mintIdentityToken,
  revokeIdentityToken,
} from "@/lib/identity-tokens.functions";
import { saveElicitedAnswer, suggestGaps, type ElicitedQuestion } from "@/lib/elicit.functions";
import { initExtensionHandshake } from "@/lib/extension";
import { BucketRobot } from "@/components/BucketRobot";
import { SelfNotes } from "@/components/SelfNotes";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [{ title: "Dashboard — Self Maximizer" }, { name: "robots", content: "noindex" }],
  }),
  component: Dashboard,
});

type MemoryRow = {
  id: string;
  project_id: string;
  content: string;
  category: string;
  is_private: boolean;
  salience: number;
  created_at: string;
};

function Dashboard() {
  const { user } = Route.useRouteContext();

  const runTestPush = useServerFn(sendTestPush);
  const runSort = useServerFn(sortConversation);
  const runList = useServerFn(listMemories);
  const runDelete = useServerFn(deleteMemory);
  const runTogglePrivate = useServerFn(toggleMemoryPrivate);
  const runSetSalience = useServerFn(setMemorySalience);
  const runUndoLast = useServerFn(undoLastSort);
  const runBulkDelete = useServerFn(deleteMemories);

  const runSetPaused = useServerFn(setPauseRecording);
  const runExport = useServerFn(exportMemoryMd);
  const runPrompt = useServerFn(buildSystemPrompt);
  const runSuggestGaps = useServerFn(suggestGaps);
  const runSaveAnswer = useServerFn(saveElicitedAnswer);
  const runListTokens = useServerFn(listIdentityTokens);
  const runMintToken = useServerFn(mintIdentityToken);
  const runRevokeToken = useServerFn(revokeIdentityToken);

  const [displayName, setDisplayName] = useState<string>("");
  const [paused, setPaused] = useState<boolean>(false);
  const [pushStatus, setPushStatus] = useState<PushStatus>("prompt");
  const [pushBusy, setPushBusy] = useState(false);

  const [text, setText] = useState("");
  const [sorting, setSorting] = useState(false);
  const [robotState, setRobotState] = useState<"idle" | "thinking" | "happy">("idle");

  const [memories, setMemories] = useState<MemoryRow[]>([]);
  const [showPrivate, setShowPrivate] = useState(false);

  // Bulk delete / undo state.
  const [lastBatchId, setLastBatchId] = useState<string | null>(null);
  const [lastBatchSummary, setLastBatchSummary] = useState<string>("");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmUndo, setConfirmUndo] = useState(false);
  const [confirmBulk, setConfirmBulk] = useState(false);

  // Guided elicitation state — questions surfaced after a successful sort.
  type ElicitItem = ElicitedQuestion & {
    id: string;
    answer: string;
    saving: boolean;
    subject?: string | null;
    category: "personal" | "work";
  };
  const [elicitTotal, setElicitTotal] = useState(0);
  const [elicitItems, setElicitItems] = useState<ElicitItem[]>([]);

  // Portable identity — revocable public URLs for external AIs.
  type IdentityToken = {
    id: string;
    token: string;
    label: string;
    mode: string;
    critical_only: boolean;
    revoked_at: string | null;
    expires_at: string | null;
    last_used_at: string | null;
    use_count: number;
    created_at: string;
  };

  const [tokens, setTokens] = useState<IdentityToken[]>([]);
  const [mintingToken, setMintingToken] = useState(false);

  async function refreshTokens() {
    try {
      const rows = (await runListTokens({})) as IdentityToken[];
      setTokens(rows);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't load share links");
    }
  }

  async function handleMintToken() {
    setMintingToken(true);
    try {
      const row = (await runMintToken({ data: { mode: "system" } })) as IdentityToken;
      setTokens((prev) => [row, ...prev]);
      const url = `${window.location.origin}/api/public/identity/${row.token}`;
      await navigator.clipboard.writeText(url);
      toast.success("Share link created & copied. Paste into any AI's system prompt.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't create share link");
    } finally {
      setMintingToken(false);
    }
  }

  async function handleCopyTokenUrl(token: string) {
    const url = `${window.location.origin}/api/public/identity/${token}`;
    await navigator.clipboard.writeText(url);
    toast.success("Copied share link");
  }

  async function handleRevokeToken(id: string) {
    try {
      await runRevokeToken({ data: { id } });
      setTokens((prev) =>
        prev.map((t) => (t.id === id ? { ...t, revoked_at: new Date().toISOString() } : t)),
      );
      toast.success("Link revoked");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Revoke failed");
    }
  }

  async function refreshMemories(includePrivate = showPrivate) {
    const rows = (await runList({ data: { includePrivate } })) as MemoryRow[];
    setMemories(rows);
  }

  useEffect(() => {
    setPushStatus(getPushStatus());
    (async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, pause_recording")
        .eq("id", user.id)
        .maybeSingle();
      setDisplayName(profile?.display_name ?? user.email ?? "there");
      setPaused(!!profile?.pause_recording);
      await refreshMemories(false);
      await refreshTokens();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Chrome extension ingest: the extension writes the captured text into this
  // tab's sessionStorage (never into the URL, so nothing lands in history).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const consume = () => {
      const raw = sessionStorage.getItem("smx_pending");
      if (!raw) return;
      sessionStorage.removeItem("smx_pending");
      try {
        const payload = JSON.parse(raw) as { text?: string };
        if (payload?.text) {
          setText(payload.text);
          toast.success("Captured from browser extension — review and Sort.");
        }
      } catch {
        // ignore malformed payloads
      }
    };
    consume();
    window.addEventListener("smx-pending", consume);

    const cleanupHandshake = initExtensionHandshake((payload) => {
      if (payload?.text) {
        setText(payload.text);
        toast.success("Received context from browser extension — review and Sort.");
      }
    });

    if (window.location.hash.includes("ingest=1")) {
      history.replaceState(null, "", window.location.pathname + window.location.search);
    }
    return () => {
      window.removeEventListener("smx-pending", consume);
      cleanupHandshake();
    };
  }, []);

  async function handleSort() {
    const trimmed = text.trim();
    if (!trimmed) {
      toast.error("Paste a conversation first.");
      return;
    }
    setSorting(true);
    setRobotState("thinking");
    try {
      const res = await runSort({ data: { text: trimmed } });
      if (res.status === "paused") {
        toast.info("Recording is paused — nothing was saved.");
      } else if (res.status === "capped") {
        toast.error(res.message ?? "Monthly cap reached.");
      } else if (res.status === "empty") {
        toast.info("Nothing worth remembering was found.");
      } else {
        setRobotState("happy");
        const created = "projectsCreated" in res ? res.projectsCreated : [];
        const base = `Saved ${res.saved} memories (${res.personalCount} personal, ${res.workCount} work).`;
        toast.success(
          created && created.length
            ? `${base} New project${created.length === 1 ? "" : "s"}: ${created.join(", ")}.`
            : base,
        );
        setLastBatchId(res.batchId ?? null);
        setLastBatchSummary(base);
        const hints = "memoriesForHints" in res ? res.memoriesForHints : [];
        setText("");
        await refreshMemories();
        setTimeout(() => setRobotState("idle"), 1800);
        // Fire-and-forget: ask for follow-ups; never block on failure.
        void (async () => {
          try {
            const { questions } = await runSuggestGaps({
              data: { text: trimmed, memories: hints ?? [] },
            });
            if (!questions.length) return;
            setElicitTotal(questions.length);
            setElicitItems(
              questions.map((q, i) => {
                // Route work follow-ups to the most-mentioned work subject when we
                // can guess one; otherwise leave subject undefined (default work).
                const workHint = (hints ?? []).find((h) => h.category === "work" && h.subject);
                return {
                  ...q,
                  id: `${Date.now()}-${i}`,
                  answer: "",
                  saving: false,
                  category: workHint ? "work" : "personal",
                  subject: workHint?.subject ?? null,
                };
              }),
            );
          } catch {
            // Elicitation is optional — swallow errors.
          }
        })();
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Sort failed");
    } finally {
      setSorting(false);
      if (robotState === "thinking") setRobotState("idle");
    }
  }

  async function handleTogglePause() {
    const next = !paused;
    try {
      await runSetPaused({ data: { paused: next } });
      setPaused(next);
      toast.success(next ? "Recording paused" : "Recording resumed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update");
    }
  }

  async function handleDelete(id: string) {
    try {
      await runDelete({ data: { id } });
      setMemories((prev) => prev.filter((m) => m.id !== id));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  }

  async function handleTogglePrivate(m: MemoryRow) {
    try {
      await runTogglePrivate({ data: { id: m.id, isPrivate: !m.is_private } });
      await refreshMemories();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  }

  async function handleSetSalience(m: MemoryRow, salience: 0 | 1 | 2) {
    // Optimistic update.
    setMemories((prev) => prev.map((x) => (x.id === m.id ? { ...x, salience } : x)));
    try {
      await runSetSalience({ data: { id: m.id, salience } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
      await refreshMemories();
    }
  }

  async function handleShowPrivate(next: boolean) {
    setShowPrivate(next);
    await refreshMemories(next);
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

  async function handleCopyPrompt(mode: "system" | "email" | "text" = "system") {
    try {
      const { prompt } = await runPrompt({ data: { mode } });
      await navigator.clipboard.writeText(prompt);
      const label =
        mode === "email"
          ? "Email prompt"
          : mode === "text"
            ? "Text-message prompt"
            : "System prompt";
      toast.success(`${label} copied — paste it into any AI.`);
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
        toast.success("Notifications enabled on this device");
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
      toast.success("Notifications disabled on this device");
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

  async function handleAnswerElicit(item: ElicitItem) {
    const answer = item.answer.trim();
    if (!answer) return;
    setElicitItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, saving: true } : it)));
    try {
      const res = await runSaveAnswer({
        data: {
          content: answer,
          category: item.category,
          subject: item.subject ?? undefined,
          batchId: lastBatchId ?? undefined,
        },
      });
      if (res.status === "paused") {
        toast.info("Recording is paused — nothing was saved.");
      } else {
        toast.success("Saved");
        await refreshMemories();
      }
      setElicitItems((prev) => prev.filter((it) => it.id !== item.id));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
      setElicitItems((prev) =>
        prev.map((it) => (it.id === item.id ? { ...it, saving: false } : it)),
      );
    }
  }

  function toggleElicitCategory(id: string) {
    setElicitItems((prev) =>
      prev.map((it) =>
        it.id === id
          ? {
              ...it,
              category: it.category === "personal" ? "work" : "personal",
              subject: it.category === "personal" ? it.subject : null,
            }
          : it,
      ),
    );
  }

  function dismissAllElicit() {
    setElicitItems([]);
    setElicitTotal(0);
  }

  async function handleUndoLast() {
    try {
      const { deleted } = await runUndoLast();
      setLastBatchId(null);
      setLastBatchSummary("");
      await refreshMemories();
      toast.success(deleted ? `Undone — removed ${deleted} memories.` : "Nothing to undo.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Undo failed");
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const visibleMemoryIds = useMemo(() => memories.map((m) => m.id), [memories]);
  const allSelected =
    visibleMemoryIds.length > 0 && visibleMemoryIds.every((id) => selectedIds.has(id));
  function toggleSelectAllVisible() {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(visibleMemoryIds));
  }

  async function handleBulkDelete() {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    try {
      const { deleted } = await runBulkDelete({ data: { ids } });
      setSelectedIds(new Set());
      await refreshMemories();
      toast.success(`Deleted ${deleted} memories.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  }

  const personalMemories = memories.filter((m) => m.category === "personal");
  const workMemories = memories.filter((m) => m.category === "work");

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="mx-auto max-w-6xl px-6 py-10 space-y-8">
        <div className="flex items-center justify-between gap-6 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold">Welcome, {displayName}</h1>
            <p className="mt-1 text-muted-foreground">
              Drop a chat below. I'll sort what matters into your private bucket.
            </p>
            <button
              onClick={handleTogglePause}
              className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-accent"
            >
              {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              {paused ? "Resume recording" : "Pause recording"}
            </button>
          </div>
          <BucketRobot state={robotState} />
        </div>

        <SelfNotes />

        {paused && (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            Recording is paused. Nothing you drop will be saved until you resume.
          </div>
        )}

        {/* Drop zone */}
        <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <label className="text-sm font-medium flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Paste a conversation
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={8}
            placeholder="Paste anything — a chat with an AI, notes from a call, a journal entry. I'll pull out the durable facts and sort them."
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {text.length.toLocaleString()} chars
            </span>
            <button
              onClick={handleSort}
              disabled={sorting || !text.trim()}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4" />
              {sorting ? "Sorting…" : "Drop into bucket"}
            </button>
          </div>
        </div>

        {lastBatchId && (
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/5 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm">
              <span className="font-medium">{lastBatchSummary}</span>{" "}
              <span className="text-muted-foreground">
                Wrong chat? Undo this sort — all memories from it (including follow-up answers) will
                be removed.
              </span>
            </p>
            <button
              onClick={() => setConfirmUndo(true)}
              className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/40 bg-background px-3 py-1.5 text-sm hover:bg-accent"
            >
              <Undo2 className="h-4 w-4" /> Undo this sort
            </button>
          </div>
        )}

        {/* Selection toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-2">
          <div className="flex items-center gap-4 text-sm">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectionMode}
                onChange={(e) => {
                  setSelectionMode(e.target.checked);
                  if (!e.target.checked) setSelectedIds(new Set());
                }}
              />
              Select memories
            </label>
            {selectionMode && (
              <label className="inline-flex items-center gap-2 text-muted-foreground">
                <input type="checkbox" checked={allSelected} onChange={toggleSelectAllVisible} />
                Select all ({visibleMemoryIds.length})
              </label>
            )}
          </div>
          {selectionMode && selectedIds.size > 0 && (
            <button
              onClick={() => setConfirmBulk(true)}
              className="inline-flex items-center gap-1.5 rounded-md bg-destructive px-3 py-1.5 text-sm font-medium text-destructive-foreground hover:bg-destructive/90"
            >
              <Trash2 className="h-4 w-4" /> Delete {selectedIds.size} selected
            </button>
          )}
        </div>

        {elicitItems.length > 0 && (
          <div className="rounded-2xl border border-primary/40 bg-primary/5 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold">
                  Add a few details? ({elicitTotal - elicitItems.length}/{elicitTotal})
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  I noticed a few things worth pinning down. Answer any that matter — skip the rest.
                </p>
              </div>
              <button
                onClick={dismissAllElicit}
                className="rounded-md border border-input bg-background px-3 py-1.5 text-xs hover:bg-accent"
              >
                Skip
              </button>
            </div>
            <ul className="space-y-3">
              {elicitItems.map((item) => (
                <li
                  key={item.id}
                  className="rounded-lg border border-border bg-background/60 p-3 space-y-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant={
                            item.priority === "critical"
                              ? "destructive"
                              : item.priority === "high"
                                ? "default"
                                : "secondary"
                          }
                          className="text-[10px] uppercase"
                        >
                          {item.priority}
                        </Badge>
                        <button
                          onClick={() => toggleElicitCategory(item.id)}
                          className="text-[10px] uppercase tracking-wide text-muted-foreground hover:text-foreground"
                          title="Toggle personal/work"
                        >
                          {item.category}
                          {item.subject ? ` · ${item.subject}` : ""}
                        </button>
                      </div>
                      <p className="mt-1 text-sm font-medium">{item.question}</p>
                      {item.rationale && (
                        <p className="mt-0.5 text-xs text-muted-foreground">{item.rationale}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={item.answer}
                      onChange={(e) =>
                        setElicitItems((prev) =>
                          prev.map((it) =>
                            it.id === item.id ? { ...it, answer: e.target.value } : it,
                          ),
                        )
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAnswerElicit(item);
                        }
                      }}
                      placeholder="Type your answer…"
                      className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                    <button
                      onClick={() => handleAnswerElicit(item)}
                      disabled={item.saving || !item.answer.trim()}
                      className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                    >
                      {item.saving ? "Saving…" : "Save"}
                    </button>
                    <button
                      onClick={() =>
                        setElicitItems((prev) => prev.filter((it) => it.id !== item.id))
                      }
                      className="rounded-md border border-input bg-background px-2 py-1.5 text-xs hover:bg-accent"
                      title="Dismiss"
                    >
                      ✕
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Memory columns */}

        <div className="grid gap-6 md:grid-cols-2">
          <MemoryColumn
            title="Personal & Family"
            memories={personalMemories}
            onDelete={handleDelete}
            onTogglePrivate={handleTogglePrivate}
            onSetSalience={handleSetSalience}
            selectionMode={selectionMode}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
          />
          <MemoryColumn
            title="Work & Projects"
            memories={workMemories}
            onDelete={handleDelete}
            onTogglePrivate={handleTogglePrivate}
            onSetSalience={handleSetSalience}
            selectionMode={selectionMode}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
          />
        </div>

        <div className="flex items-center justify-between flex-wrap gap-3 rounded-2xl border border-border bg-card p-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showPrivate}
              onChange={(e) => handleShowPrivate(e.target.checked)}
              className="rounded"
            />
            Show private memories
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleCopyPrompt("system")}
              className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-accent"
            >
              <Copy className="h-4 w-4" /> System prompt
            </button>
            <button
              onClick={() => handleCopyPrompt("email")}
              className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-accent"
            >
              <Copy className="h-4 w-4" /> Email prompt
            </button>
            <button
              onClick={() => handleCopyPrompt("text")}
              className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-accent"
            >
              <Copy className="h-4 w-4" /> Text prompt
            </button>
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-accent"
            >
              <Download className="h-4 w-4" /> Export MEMORY.md
            </button>
          </div>
        </div>

        {/* Portable Identity — revocable public URLs for external AIs. */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="font-semibold flex items-center gap-2">
                <Link2 className="h-4 w-4 text-primary" />
                Portable identity links
              </h2>
              <p className="mt-1 text-sm text-muted-foreground max-w-xl">
                Mint a revocable URL that returns your system prompt as plain text. Paste it into
                any AI (ChatGPT, Claude, custom agents) so it bootstraps on your context instantly.
                Private memories are never included. New links share only your{" "}
                <strong>identity-critical</strong> memories and{" "}
                <strong>expire after 30 days</strong>.
              </p>
            </div>
            <button
              onClick={handleMintToken}
              disabled={mintingToken}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              <Link2 className="h-4 w-4" />
              {mintingToken ? "Creating…" : "Create share link"}
            </button>
          </div>

          {tokens.length > 0 && (
            <ul className="mt-4 divide-y divide-border">
              {tokens.map((t) => {
                const url =
                  typeof window !== "undefined"
                    ? `${window.location.origin}/api/public/identity/${t.token}`
                    : `/api/public/identity/${t.token}`;
                const revoked = !!t.revoked_at;
                const expired = !!t.expires_at && new Date(t.expires_at).getTime() <= Date.now();
                const inactive = revoked || expired;
                return (
                  <li key={t.id} className="flex items-center justify-between gap-3 py-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-sm flex-wrap">
                        <span className="font-medium">{t.label}</span>
                        <Badge variant="outline" className="text-xs">
                          {t.mode}
                        </Badge>
                        {t.critical_only && (
                          <Badge variant="outline" className="text-xs">
                            critical only
                          </Badge>
                        )}
                        {revoked && (
                          <Badge variant="destructive" className="text-xs">
                            revoked
                          </Badge>
                        )}
                        {!revoked && expired && (
                          <Badge variant="destructive" className="text-xs">
                            expired
                          </Badge>
                        )}
                      </div>
                      <code className="mt-1 block truncate text-xs text-muted-foreground">
                        {url}
                      </code>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {t.expires_at && !inactive
                          ? `Expires ${new Date(t.expires_at).toLocaleDateString()} · `
                          : ""}
                        {t.last_used_at
                          ? `Last used ${new Date(t.last_used_at).toLocaleString()}`
                          : "Never used"}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {!inactive && (
                        <>
                          <button
                            onClick={() => handleCopyTokenUrl(t.token)}
                            className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-2.5 py-1 text-xs hover:bg-accent"
                          >
                            <Copy className="h-3.5 w-3.5" /> Copy
                          </button>
                          <button
                            onClick={() => handleRevokeToken(t.id)}
                            className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-2.5 py-1 text-xs hover:bg-accent"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Revoke
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Push card kept from before */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-semibold flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary" />
                Push notifications
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Quiet-project reminders and weekly digests on this device.
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              {pushStatus === "unsupported" && (
                <span className="text-xs text-muted-foreground self-center">Not supported</span>
              )}
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
                    className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-accent disabled:opacity-50"
                  >
                    <BellOff className="h-4 w-4" /> Disable
                  </button>
                </>
              )}
              {(pushStatus === "prompt" || pushStatus === "denied") && (
                <button
                  onClick={handleEnablePush}
                  disabled={pushBusy || pushStatus === "denied"}
                  className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  <Bell className="h-4 w-4" />
                  {pushStatus === "denied" ? "Blocked in browser" : "Enable notifications"}
                </button>
              )}
            </div>
          </div>
        </div>

        <Link
          to="/memory-map"
          className="block rounded-2xl border border-border bg-card p-6 hover:bg-accent transition"
        >
          <h2 className="font-semibold">Your Memory Map →</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            The full, editable picture of how every AI sees you.
          </p>
        </Link>
      </main>

      <AlertDialog open={confirmUndo} onOpenChange={setConfirmUndo}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Undo this sort?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes every memory saved from your last paste, including any follow-up answers
              you added. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                setConfirmUndo(false);
                await handleUndoLast();
              }}
            >
              Undo sort
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmBulk} onOpenChange={setConfirmBulk}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} memories?</AlertDialogTitle>
            <AlertDialogDescription>
              These memories will be permanently removed from your bucket.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                setConfirmBulk(false);
                await handleBulkDelete();
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function MemoryColumn({
  title,
  memories,
  onDelete,
  onTogglePrivate,
  onSetSalience,
  selectionMode,
  selectedIds,
  onToggleSelect,
}: {
  title: string;
  memories: MemoryRow[];
  onDelete: (id: string) => void;
  onTogglePrivate: (m: MemoryRow) => void;
  onSetSalience: (m: MemoryRow, salience: 0 | 1 | 2) => void;
  selectionMode: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <header className="flex items-center justify-between mb-3">
        <h2 className="font-semibold">{title}</h2>
        <span className="text-xs text-muted-foreground">{memories.length}</span>
      </header>
      {memories.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">
          Empty. Drop a conversation above to fill this in.
        </p>
      ) : (
        <ul className="space-y-2">
          {memories.map((m) => (
            <li
              key={m.id}
              className="group flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-sm"
            >
              {selectionMode && (
                <input
                  type="checkbox"
                  checked={selectedIds.has(m.id)}
                  onChange={() => onToggleSelect(m.id)}
                  className="mt-1"
                />
              )}
              <div className="flex-1">
                <p className={m.is_private ? "text-muted-foreground italic" : ""}>{m.content}</p>
                <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                  {new Date(m.created_at).toLocaleDateString()}
                  {m.is_private && " · private"}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <SalienceControl
                  salience={(m.salience ?? 1) as 0 | 1 | 2}
                  onChange={(s) => onSetSalience(m, s)}
                />
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                  <button
                    onClick={() => onTogglePrivate(m)}
                    className="rounded p-1 hover:bg-accent"
                    title={m.is_private ? "Mark public in exports" : "Mark private"}
                  >
                    <Lock className={`h-3.5 w-3.5 ${m.is_private ? "text-primary" : ""}`} />
                  </button>
                  <button
                    onClick={() => onDelete(m.id)}
                    className="rounded p-1 hover:bg-destructive/20 text-destructive"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function SalienceControl({
  salience,
  onChange,
}: {
  salience: 0 | 1 | 2;
  onChange: (s: 0 | 1 | 2) => void;
}) {
  const next: 0 | 1 | 2 = salience === 0 ? 1 : salience === 1 ? 2 : 0;
  const label = salience === 2 ? "Critical" : salience === 1 ? "High" : "Normal";
  const cls =
    salience === 2
      ? "bg-destructive/15 text-destructive border-destructive/40"
      : salience === 1
        ? "bg-primary/10 text-primary border-primary/30"
        : "bg-muted text-muted-foreground border-border";
  return (
    <button
      onClick={() => onChange(next)}
      className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide transition hover:opacity-80 ${cls}`}
      title="Click to change salience (Normal → High → Critical)"
    >
      {label}
    </button>
  );
}
