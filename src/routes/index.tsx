import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Sparkles,
  ShieldCheck,
  FolderArchive,
  Clipboard,
  PauseCircle,
  Cloud,
  Map,
  Heart,
  Scale,
} from "lucide-react";
import logo from "@/assets/selfmaxizer-icon-square.svg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Self Maximizer — One memory for every AI you talk to" },
      {
        name: "description",
        content:
          "Stop re-explaining yourself to every AI. Self Maximizer captures, sorts, and hands your memory back as a paste-ready system prompt. 3-day free trial, then $9.95/month.",
      },
      { property: "og:title", content: "Self Maximizer — One memory for every AI" },
      {
        property: "og:description",
        content: "Cloud-private backup. AI-sorted. 3-day free trial, then $9.95/month.",
      },
      { property: "og:url", content: "/" },
      { property: "og:image", content: "/og-image.png" },
      { name: "twitter:image", content: "/og-image.png" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/40">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2 font-brand text-lg">
            <img src={logo} alt="Self Maximizer logo" width={32} height={32} className="h-8 w-8" />
            <span>Self Maximizer</span>
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <Link to="/compare" className="text-muted-foreground hover:text-foreground">
              Compare
            </Link>
            <Link to="/extension" className="text-muted-foreground hover:text-foreground">
              Extension
            </Link>

            <Link to="/auth" className="text-muted-foreground hover:text-foreground">
              Sign in
            </Link>
            <Link
              to="/auth"
              search={{ mode: "signup" }}
              className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Start free trial
            </Link>
          </div>
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto max-w-4xl px-6 pt-16 pb-16 text-center">
          <img
            src={logo}
            alt="Self Maximizer logo"
            width={512}
            height={512}
            className="mx-auto h-40 w-40 md:h-52 md:w-52 rounded-[24%] shadow-xl"
          />
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
            <Sparkles className="h-3 w-3" /> Built by Signal F Holdings LLC
          </div>
          <h1 className="mt-6 text-balance text-5xl font-bold tracking-tight md:text-6xl">
            Your Self inside,{" "}
            <span className="block text-primary text-6xl md:text-8xl font-extrabold">
              maximized outside.
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-balance text-lg text-muted-foreground">
            Organize your life into <span className="font-semibold text-foreground">Circles</span> —
            one continuous <span className="font-semibold text-foreground">Personal Circle</span>{" "}
            and as many <span className="font-semibold text-foreground">Work Circles</span> as you
            need. Self Maximizer sorts what matters into the right Circle and hands every AI the
            context to show up as your best self.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/auth"
              search={{ mode: "signup" }}
              className="inline-flex items-center rounded-md bg-primary px-6 py-3 text-base font-medium text-primary-foreground hover:bg-primary/90"
            >
              Start 3-day free trial
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center rounded-md border border-input bg-background px-6 py-3 text-base font-medium hover:bg-accent"
            >
              See how it works
            </a>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Card required. Cancel anytime. Then $9.95/month.
          </p>
        </section>

        {/* AI relationship map */}
        <section className="border-t border-border/40 bg-gradient-to-b from-primary/5 to-transparent">
          <div className="mx-auto max-w-5xl px-6 py-16 text-center">
            <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Map className="h-6 w-6" />
            </div>
            <h2 className="mt-5 text-3xl font-bold tracking-tight">
              Your relationships — AI, work, or personal — mapped out and executable in every way.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-balance text-lg text-muted-foreground">
              Chat transcripts, emails, and text messages all ingest the same way — paste them in
              and Self Maximizer sorts what matters. Then export as a{" "}
              <span className="font-semibold text-foreground">system prompt</span>, an{" "}
              <span className="font-semibold text-foreground">email prompt</span>, or a{" "}
              <span className="font-semibold text-foreground">text-message prompt</span> — tuned to
              how each channel actually reads.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1">
                <Heart className="h-3.5 w-3.5 text-rose-400" /> Kindness-first tone
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1">
                <Sparkles className="h-3.5 w-3.5 text-primary" /> Works with every AI
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1">
                <ShieldCheck className="h-3.5 w-3.5 text-green-500" /> You control what's shared
              </span>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="how-it-works" className="border-t border-border/40 bg-card/30">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <h2 className="text-center text-3xl font-bold tracking-tight">
              Your memory. Your way. Sorted automatically.
            </h2>
            <div className="mt-12 grid gap-8 md:grid-cols-3">
              <Feature
                icon={<Sparkles className="h-5 w-5" />}
                title="Automatic sorting"
                body="Paste a conversation — even a long transcript. Our AI pulls out what's worth remembering and files each item under Personal/Family or Work/Project."
              />
              <Feature
                icon={<ShieldCheck className="h-5 w-5" />}
                title="Cloud-private backup"
                body="Every memory is stored encrypted in your private bucket. Only you can read it. Row-level security at the database level — no shared tenants."
              />
              <Feature
                icon={<PauseCircle className="h-5 w-5" />}
                title="Privacy pause"
                body="One click stops all recording. Anything you say while paused is never stored — not hidden, never written down."
              />
              <Feature
                icon={<FolderArchive className="h-5 w-5" />}
                title="Multiple projects"
                body="Keep separate Work/Project buckets — one per client, venture, or job — so work memories don't blur together."
              />
              <Feature
                icon={<Clipboard className="h-5 w-5" />}
                title="Copy system prompt"
                body="One button puts your whole context on the clipboard, formatted for any chat. Or export the full MEMORY.md file."
              />
              <Feature
                icon={<Cloud className="h-5 w-5" />}
                title="Lifecycle triage"
                body="Work projects that go quiet for 90 days surface a health summary. Personal is continuous — never triaged, never archived automatically."
              />
              <Feature
                icon={<Map className="h-5 w-5" />}
                title="AI relationship map"
                body="A visible, editable map of your identity, values, and workflow preferences. Drag nodes, edit any fact, and carry the whole map into every AI conversation."
              />
              <Feature
                icon={<Heart className="h-5 w-5" />}
                title="Kindness Mode"
                body="Set the tone you want every AI to use with you — warmth, patience, directness, humor. Saved as a real preference block at the top of your system prompt, not buried in fine print."
              />
              <Feature
                icon={<Scale className="h-5 w-5" />}
                title="Legal clarity"
                body="Plain-English terms, a clear privacy policy, and a DPA on request. Your memory data is yours — exportable any time, deletable in one click, never sold, never used to train models."
              />
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="border-t border-border/40">
          <div className="mx-auto max-w-2xl px-6 py-20 text-center">
            <h2 className="text-3xl font-bold tracking-tight">Simple pricing</h2>
            <div className="mt-10 rounded-2xl border border-border bg-card p-10 text-left">
              <div className="flex items-baseline justify-between">
                <h3 className="text-xl font-semibold">Self Maximizer</h3>
                <div>
                  <span className="text-4xl font-bold">$9.95</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                3-day free trial. Card required at signup. Cancel anytime.
              </p>
              <ul className="mt-6 space-y-2 text-sm">
                <li>• Unlimited memories across personal + work buckets</li>
                <li>• AI sorting included — no API key needed</li>
                <li>• Cloud-private backup (encrypted, RLS-enforced)</li>
                <li>• MEMORY.md export, system-prompt clipboard</li>
                <li>• 90-day project lifecycle triage</li>
              </ul>
              <Link
                to="/auth"
                search={{ mode: "signup" }}
                className="mt-8 inline-flex w-full items-center justify-center rounded-md bg-primary px-6 py-3 font-medium text-primary-foreground hover:bg-primary/90"
              >
                Start 3-day free trial
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/40">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-6 py-8 text-xs text-muted-foreground sm:flex-row">
          <div>© {new Date().getFullYear()} Signal F Holdings LLC</div>
          <div>Self Maximizer — your memory, in your bucket.</div>
        </div>
      </footer>
    </div>
  );
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-xl border border-border bg-background p-6">
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
