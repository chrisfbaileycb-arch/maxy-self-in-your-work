import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Copy, Plus, Save, Trash2, Wand2, X } from "lucide-react";

import { AppHeader } from "@/components/AppHeader";
import { listProjects } from "@/lib/projects.functions";
import {
  applyTemplate,
  deleteTemplate,
  extractSlots,
  listTemplates,
  upsertTemplate,
  type TemplateRow,
} from "@/lib/templates.functions";

export const Route = createFileRoute("/_authenticated/templates")({
  head: () => ({
    meta: [{ title: "Templates — Self Maximizer" }, { name: "robots", content: "noindex" }],
  }),
  component: TemplatesPage,
});

const BUILT_IN = new Set([
  "project",
  "project name",
  "memories",
  "project memories",
  "date",
  "today",
]);

function TemplatesPage() {
  const qc = useQueryClient();
  const runList = useServerFn(listTemplates);
  const runProjects = useServerFn(listProjects);
  const runUpsert = useServerFn(upsertTemplate);
  const runDelete = useServerFn(deleteTemplate);
  const runApply = useServerFn(applyTemplate);

  const templatesQ = useQuery({
    queryKey: ["templates"],
    queryFn: () => runList(),
  });
  const projectsQ = useQuery({
    queryKey: ["projects", "active"],
    queryFn: () => runProjects(),
  });

  const [editing, setEditing] = useState<TemplateRow | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [saving, setSaving] = useState(false);

  const [useTpl, setUseTpl] = useState<TemplateRow | null>(null);
  const [projectId, setProjectId] = useState<string>("");
  const [slotValues, setSlotValues] = useState<Record<string, string>>({});
  const [output, setOutput] = useState<string>("");
  const [applying, setApplying] = useState(false);

  const templates = templatesQ.data?.templates ?? [];
  const projects = (projectsQ.data ?? []).filter((p) => !p.archived_at);

  function startNew() {
    setEditing({ id: "", name: "", body: "", created_at: "" });
    setDraftName("");
    setDraftBody("");
  }
  function startEdit(t: TemplateRow) {
    setEditing(t);
    setDraftName(t.name);
    setDraftBody(t.body);
  }
  function cancelEdit() {
    setEditing(null);
    setDraftName("");
    setDraftBody("");
  }

  async function save() {
    if (!draftName.trim() || !draftBody.trim()) {
      toast.error("Name and body are required.");
      return;
    }
    setSaving(true);
    try {
      await runUpsert({
        data: {
          id: editing?.id ? editing.id : undefined,
          name: draftName.trim(),
          body: draftBody,
        },
      });
      toast.success(editing?.id ? "Template updated" : "Template created");
      cancelEdit();
      qc.invalidateQueries({ queryKey: ["templates"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function remove(t: TemplateRow) {
    if (!confirm(`Delete template "${t.name}"?`)) return;
    try {
      await runDelete({ data: { id: t.id } });
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["templates"] });
      if (useTpl?.id === t.id) setUseTpl(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  }

  function openUse(t: TemplateRow) {
    setUseTpl(t);
    setProjectId(projects[0]?.id ?? "");
    setSlotValues({});
    setOutput("");
  }

  const userSlots = useMemo(() => {
    if (!useTpl) return [] as string[];
    return extractSlots(useTpl.body).filter((s) => !BUILT_IN.has(s));
  }, [useTpl]);

  async function runIt() {
    if (!useTpl) return;
    setApplying(true);
    try {
      const res = await runApply({
        data: {
          templateId: useTpl.id,
          projectId: projectId || null,
          values: slotValues,
        },
      });
      setOutput(res.output);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Apply failed");
    } finally {
      setApplying(false);
    }
  }

  async function copyOutput() {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    toast.success("Copied to clipboard");
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-5xl px-6 py-10 space-y-8">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Templates</h1>
            <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
              Reusable prompts with <code className="rounded bg-muted px-1">[slots]</code>. Built-in
              slots: <code className="rounded bg-muted px-1">[project]</code>,{" "}
              <code className="rounded bg-muted px-1">[memories]</code>,{" "}
              <code className="rounded bg-muted px-1">[date]</code>. Anything else becomes a field
              you fill in.
            </p>
          </div>
          <button
            onClick={startNew}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> New template
          </button>
        </header>

        {editing && (
          <section className="rounded-xl border border-border bg-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {editing.id ? "Edit template" : "New template"}
              </h2>
              <button
                onClick={cancelEdit}
                className="rounded p-1 text-muted-foreground hover:bg-accent"
                title="Cancel"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <input
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              placeholder="Template name — e.g. Kickoff a new client project"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <textarea
              value={draftBody}
              onChange={(e) => setDraftBody(e.target.value)}
              placeholder={`You are helping me on [project].\n\nHere's what you should know:\n[memories]\n\nToday is [date]. Focus on [goal].`}
              rows={10}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
            />
            <div className="flex justify-end">
              <button
                onClick={save}
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save template"}
              </button>
            </div>
          </section>
        )}

        <section className="grid gap-4 md:grid-cols-2">
          {templatesQ.isLoading && (
            <p className="text-sm text-muted-foreground">Loading templates…</p>
          )}
          {!templatesQ.isLoading && templates.length === 0 && !editing && (
            <div className="md:col-span-2 rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No templates yet. Create one to reuse a favorite prompt across projects.
            </div>
          )}
          {templates.map((t) => {
            const slots = extractSlots(t.body);
            return (
              <div
                key={t.id}
                className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold">{t.name}</h3>
                  <div className="flex gap-1">
                    <button
                      onClick={() => startEdit(t)}
                      className="rounded p-1.5 text-muted-foreground hover:bg-accent"
                      title="Edit"
                    >
                      <Wand2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => remove(t)}
                      className="rounded p-1.5 text-muted-foreground hover:bg-destructive/20 hover:text-destructive"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <pre className="whitespace-pre-wrap text-xs text-muted-foreground line-clamp-4">
                  {t.body}
                </pre>
                {slots.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {slots.map((s) => (
                      <span
                        key={s}
                        className="rounded-full border border-border bg-background px-2 py-0.5 text-[11px] text-muted-foreground"
                      >
                        [{s}]
                      </span>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => openUse(t)}
                  className="mt-auto inline-flex items-center justify-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-accent"
                >
                  Use template
                </button>
              </div>
            );
          })}
        </section>

        {useTpl && (
          <section className="rounded-xl border border-primary/40 bg-primary/5 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Fill "{useTpl.name}"</h2>
              <button
                onClick={() => setUseTpl(null)}
                className="rounded p-1 text-muted-foreground hover:bg-accent"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Project context</label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">— No project —</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Fills [project] with the name and [memories] with its top memories.
              </p>
            </div>

            {userSlots.length > 0 && (
              <div className="grid gap-3 sm:grid-cols-2">
                {userSlots.map((s) => (
                  <div key={s} className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">[{s}]</label>
                    <input
                      value={slotValues[s] ?? ""}
                      onChange={(e) => setSlotValues((prev) => ({ ...prev, [s]: e.target.value }))}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={runIt}
              disabled={applying}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              <Wand2 className="h-4 w-4" /> {applying ? "Building…" : "Build prompt"}
            </button>

            {output && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-muted-foreground">Output</label>
                  <button
                    onClick={copyOutput}
                    className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-xs hover:bg-accent"
                  >
                    <Copy className="h-3.5 w-3.5" /> Copy
                  </button>
                </div>
                <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-background p-3 text-xs">
                  {output}
                </pre>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
