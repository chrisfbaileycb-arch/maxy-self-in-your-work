import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, X, Minus } from "lucide-react";
import logo from "@/assets/selfmaxizer-icon-square.svg";

export const Route = createFileRoute("/compare")({
  head: () => ({
    meta: [
      { title: "Self Maximizer vs Perplexity Brain, ChatGPT Memory & Claude Memory" },
      {
        name: "description",
        content:
          "Perplexity Brain only works inside Perplexity. ChatGPT Memory only inside ChatGPT. Claude memory only inside Claude. Self Maximizer is the one memory layer that follows you between every AI.",
      },
      { property: "og:title", content: "Self Maximizer vs Brain, ChatGPT Memory & Claude Memory" },
      {
        property: "og:description",
        content: "The portable memory layer. One bucket, every AI. $9.95/mo, 3-day free trial.",
      },
      { property: "og:url", content: "/compare" },
      { property: "og:image", content: "/og-image.png" },
      { name: "twitter:image", content: "/og-image.png" },
    ],
    links: [{ rel: "canonical", href: "/compare" }],
  }),
  component: Compare,
});

type Cell = "yes" | "no" | "partial";

const rows: { label: string; mb: Cell; brain: Cell; gpt: Cell; claude: Cell; note?: string }[] = [
  { label: "Works across every AI you use", mb: "yes", brain: "no", gpt: "no", claude: "no" },
  {
    label: "Builds a relationship & identity map with each AI",
    mb: "yes",
    brain: "no",
    gpt: "no",
    claude: "no",
  },
  {
    label: "Exports a kindness-first workflow context",
    mb: "yes",
    brain: "no",
    gpt: "no",
    claude: "no",
  },
  { label: "Export as paste-ready system prompt", mb: "yes", brain: "no", gpt: "no", claude: "no" },
  { label: "Markdown export you own", mb: "yes", brain: "no", gpt: "partial", claude: "no" },
  { label: "Personal vs Work bucket separation", mb: "yes", brain: "no", gpt: "no", claude: "no" },
  { label: "Project lifecycle & archival", mb: "yes", brain: "partial", gpt: "no", claude: "no" },
  {
    label: "Available on every plan",
    mb: "yes",
    brain: "no",
    gpt: "yes",
    claude: "partial",
    note: "Brain is Max-tier only",
  },
  {
    label: "Background consolidation (graph)",
    mb: "partial",
    brain: "yes",
    gpt: "partial",
    claude: "partial",
  },
  {
    label: "Live integrations (Drive, Gmail, Slack)",
    mb: "partial",
    brain: "yes",
    gpt: "partial",
    claude: "partial",
  },
  { label: "Lock-in to one vendor", mb: "no", brain: "yes", gpt: "yes", claude: "yes" },
  {
    label: "Monthly price",
    mb: "yes",
    brain: "no",
    gpt: "no",
    claude: "no",
    note: "$9.95 vs $20+",
  },
];

function Icon({ v }: { v: Cell }) {
  if (v === "yes") return <Check className="mx-auto h-5 w-5 text-green-500" aria-label="Yes" />;
  if (v === "no") return <X className="mx-auto h-5 w-5 text-red-500/70" aria-label="No" />;
  return <Minus className="mx-auto h-5 w-5 text-muted-foreground" aria-label="Partial" />;
}

function Compare() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/40">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <img src={logo} alt="Self Maximizer logo" width={32} height={32} className="h-8 w-8" />
            <span>Self Maximizer</span>
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <Link to="/auth" className="text-muted-foreground hover:text-foreground">
              Sign in
            </Link>
            <Link
              to="/auth"
              className="rounded-md bg-primary px-3 py-1.5 font-medium text-primary-foreground hover:opacity-90"
            >
              Start free trial
            </Link>
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-16">
        <section className="text-center">
          <p className="text-sm font-medium uppercase tracking-wider text-primary">Comparison</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight md:text-5xl">
            The memory layer that follows you between AIs
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
            Perplexity Brain only works in Perplexity. ChatGPT Memory only works in ChatGPT.
            Claude's memory only works in Claude (and Claude Code is just a second copy of it). Self
            Maximizer is the one bucket that pours into all of them.
          </p>
        </section>

        <section className="mt-14 overflow-x-auto rounded-xl border border-border/60">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Capability</th>
                <th className="px-4 py-3 text-center font-semibold text-primary">Self Maximizer</th>
                <th className="px-4 py-3 text-center font-medium">Perplexity Brain</th>
                <th className="px-4 py-3 text-center font-medium">ChatGPT Memory</th>
                <th className="px-4 py-3 text-center font-medium">Claude Memory</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label} className="border-t border-border/40">
                  <td className="px-4 py-3">
                    <div>{r.label}</div>
                    {r.note && <div className="text-xs text-muted-foreground">{r.note}</div>}
                  </td>
                  <td className="px-4 py-3 bg-primary/5">
                    <Icon v={r.mb} />
                  </td>
                  <td className="px-4 py-3">
                    <Icon v={r.brain} />
                  </td>
                  <td className="px-4 py-3">
                    <Icon v={r.gpt} />
                  </td>
                  <td className="px-4 py-3">
                    <Icon v={r.claude} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="mt-16 grid gap-6 md:grid-cols-3">
          {[
            {
              h: "Portable by design",
              p: "Drop a chat from any AI. Export a clean system prompt into any other AI. Your memory isn't a feature of someone else's product.",
            },
            {
              h: "Two buckets, not one blob",
              p: "Personal/Family stays separate from Work/Project. The big players give you one giant graph — fine for them, messy for you.",
            },
            {
              h: "Honest pricing",
              p: "$9.95/month, 3-day free trial. Brain requires Perplexity Max. No bundled search engine you didn't ask for.",
            },
          ].map((c) => (
            <div key={c.h} className="rounded-lg border border-border/60 p-5">
              <h3 className="font-semibold">{c.h}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{c.p}</p>
            </div>
          ))}
        </section>

        <section className="mt-16 rounded-xl border border-border/60 bg-muted/30 p-8 text-center">
          <h2 className="text-2xl font-bold">Try the portable memory layer</h2>
          <p className="mx-auto mt-2 max-w-xl text-muted-foreground">
            3 days free. Then $9.95/month. Cancel any time — your memories export as plain markdown
            you keep forever.
          </p>
          <Link
            to="/auth"
            className="mt-6 inline-block rounded-md bg-primary px-5 py-2.5 font-medium text-primary-foreground hover:opacity-90"
          >
            Start free trial
          </Link>
        </section>

        <p className="mt-10 text-center text-xs text-muted-foreground">
          Comparison based on publicly documented features as of June 2026. Perplexity, ChatGPT, and
          Claude are trademarks of their respective owners and are not affiliated with Self
          Maximizer.
        </p>
      </main>
    </div>
  );
}
