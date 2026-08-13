import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { AppHeader } from "@/components/AppHeader";
import { SelfNotes } from "@/components/SelfNotes";
import { addSelfNote } from "@/lib/notes.functions";

export const Route = createFileRoute("/_authenticated/note")({
  validateSearch: z.object({
    mic: z.string().optional(),
    // Android share-target params
    text: z.string().optional(),
    title: z.string().optional(),
  }),
  head: () => ({
    meta: [{ title: "Note to self — Self Maximizer" }, { name: "robots", content: "noindex" }],
  }),
  component: NotePage,
});

function NotePage() {
  const { mic, text, title } = Route.useSearch();
  const runAdd = useServerFn(addSelfNote);
  const [sharedHandled, setSharedHandled] = useState(false);

  useEffect(() => {
    const shared = [title, text].filter(Boolean).join(" — ").slice(0, 500);
    if (!shared || sharedHandled) return;
    setSharedHandled(true);
    runAdd({ data: { body: shared } })
      .then(() => toast.success("Saved to your notes"))
      .catch(() => toast.error("Could not save that note"));
  }, [text, title, sharedHandled, runAdd]);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-xl px-6 py-10 space-y-4">
        <SelfNotes autoMic={mic === "1"} />
        <p className="text-center text-sm text-muted-foreground">
          <Link to="/dashboard" className="underline underline-offset-2">
            Back to dashboard
          </Link>
        </p>
      </main>
    </div>
  );
}
