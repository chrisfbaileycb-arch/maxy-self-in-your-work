import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import {
  Plus,
  Archive,
  ArchiveRestore,
  Briefcase,
  Heart,
  Sparkles,
  Download,
  Eraser,
} from "lucide-react";
import { toast } from "sonner";

import { AppHeader } from "@/components/AppHeader";
import { listProjects, createProject, archiveProject } from "@/lib/projects.functions";
import { exportProject } from "@/lib/export.functions";
import { clearProject } from "@/lib/memories.functions";
import { getSubscriptionStatus } from "@/lib/settings.functions";
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

export const Route = createFileRoute("/_authenticated/projects")({
  head: () => ({
    meta: [{ title: "Projects — Circles" }, { name: "robots", content: "noindex" }],
  }),
  component: Projects,
});

type Project = {
  id: string;
  name: string;
  kind: "personal" | "work";
  last_activity_at: string;
  archived_at: string | null;
  created_at: string;
};

function Projects() {
  const runList = useServerFn(listProjects);
  const runCreate = useServerFn(createProject);
  const runArchive = useServerFn(archiveProject);
  const runExportProject = useServerFn(exportProject);
  const runSub = useServerFn(getSubscriptionStatus);

  const runClearProject = useServerFn(clearProject);
  const [clearTarget, setClearTarget] = useState<{ id: string; name: string } | null>(null);

  async function handleExportProject(id: string, name: string) {
    try {
      const { markdown, filename } = await runExportProject({ data: { projectId: id } });
      const blob = new Blob([markdown], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();

      URL.revokeObjectURL(url);
      toast.success(`Exported ${name}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed");
    }
  }

  async function handleClearProject(id: string) {
    try {
      const { deleted } = await runClearProject({ data: { projectId: id } });
      toast.success(`Cleared ${deleted} memories.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Clear failed");
    }
  }

  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"personal" | "work">("work");
  const [busy, setBusy] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [projectCap, setProjectCap] = useState<number | null>(2);

  async function refresh() {
    const rows = (await runList()) as Project[];
    setProjects(rows);
  }

  useEffect(() => {
    refresh();
    (async () => {
      const s = await runSub();
      setIsPro(!!s?.isPro);
      setProjectCap(s?.projectCap ?? null);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      await runCreate({ data: { name: name.trim(), kind } });
      toast.success("Project created");
      setName("");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleArchive(id: string, archive: boolean) {
    try {
      await runArchive({ data: { id, archive } });
      toast.success(archive ? "Project archived" : "Project restored");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  }

  const active = projects.filter((p) => !p.archived_at);
  const archived = projects.filter((p) => p.archived_at);
  const atCap = projectCap !== null && active.length >= projectCap;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-6 py-10 space-y-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Circles</h1>
            <p className="mt-1 text-muted-foreground">
              Your <span className="font-medium text-foreground">Personal Circle (PC)</span> is one
              continuous life record. Your{" "}
              <span className="font-medium text-foreground">Work Circles (WCs)</span> are separate
              per client, venture, or project.
            </p>
          </div>
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
              isPro
                ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                : "bg-muted text-muted-foreground border border-border"
            }`}
          >
            {isPro ? "Pro — unlimited Circles" : `Free — ${active.length}/${projectCap} active`}
          </span>
        </div>

        <div className="rounded-lg border border-border/60 bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Personal Circle is continuous.</span> Only
          Work Circles surface stale-project health summaries after 90 days. Your Personal Circle is
          your ongoing life record and is never auto-archived.
        </div>

        {atCap && !isPro && (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm">
              <p className="font-medium">You've reached the free plan limit</p>
              <p className="text-muted-foreground">
                Upgrade to Pro for unlimited projects, AI sorts, and exports.
              </p>
            </div>
            <Link
              to="/settings"
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Sparkles className="h-4 w-4" /> Upgrade to Pro
            </Link>
          </div>
        )}

        <form
          onSubmit={handleCreate}
          className="rounded-2xl border border-border bg-card p-6 space-y-4"
        >
          <h2 className="font-semibold flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary" /> New Circle
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Circle name"
              disabled={atCap}
              className="sm:col-span-2 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
            />
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as "personal" | "work")}
              disabled={atCap}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
            >
              <option value="work">Work Circle</option>
              <option value="personal">Personal Circle</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={busy || !name.trim() || atCap}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            {busy ? "Creating…" : atCap ? "Upgrade to add more" : "Create Circle"}
          </button>
        </form>

        <div className="grid gap-6 md:grid-cols-2">
          <ProjectColumn
            title="Active"
            projects={active}
            onArchive={(id) => handleArchive(id, true)}
            onExport={handleExportProject}
            onClear={(id, name) => setClearTarget({ id, name })}
          />
          <ProjectColumn
            title="Archived"
            projects={archived}
            onArchive={(id) => handleArchive(id, false)}
            onExport={handleExportProject}
            onClear={(id, name) => setClearTarget({ id, name })}
            archiveMode
          />
        </div>
      </main>

      <AlertDialog open={!!clearTarget} onOpenChange={(open) => !open && setClearTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear memories from "{clearTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Every memory inside this project will be permanently removed. The project itself stays
              so you can keep adding new memories to it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                const target = clearTarget;
                setClearTarget(null);
                if (target) await handleClearProject(target.id);
              }}
            >
              Clear memories
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ProjectColumn({
  title,
  projects,
  onArchive,
  onExport,
  onClear,
  archiveMode,
}: {
  title: string;
  projects: Project[];
  onArchive: (id: string) => void;
  onExport: (id: string, name: string) => void;
  onClear: (id: string, name: string) => void;
  archiveMode?: boolean;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h2 className="font-semibold mb-3 flex items-center justify-between">
        {title}
        <span className="text-xs text-muted-foreground">{projects.length}</span>
      </h2>
      {projects.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">
          {archiveMode ? "No archived Circles." : "No Circles yet. Create one above."}
        </p>
      ) : (
        <ul className="space-y-2">
          {projects.map((p) => (
            <li
              key={p.id}
              className="flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-background/60 px-3 py-2"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 text-sm font-medium">
                  {p.kind === "work" ? (
                    <Briefcase className="h-3.5 w-3.5 text-blue-500" />
                  ) : (
                    <Heart className="h-3.5 w-3.5 text-rose-500" />
                  )}
                  {p.name}
                </div>
                <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                  Last activity {new Date(p.last_activity_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onExport(p.id, p.name)}
                  className="rounded p-1.5 hover:bg-accent text-muted-foreground"
                  title="Export this project"
                >
                  <Download className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onClear(p.id, p.name)}
                  className="rounded p-1.5 hover:bg-destructive/20 text-muted-foreground hover:text-destructive"
                  title="Clear all memories in this project"
                >
                  <Eraser className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onArchive(p.id)}
                  className="rounded p-1.5 hover:bg-accent text-muted-foreground"
                  title={archiveMode ? "Restore" : "Archive"}
                >
                  {archiveMode ? (
                    <ArchiveRestore className="h-4 w-4" />
                  ) : (
                    <Archive className="h-4 w-4" />
                  )}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
