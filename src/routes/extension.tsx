import { createFileRoute } from "@tanstack/react-router";
import { AppHeader } from "@/components/AppHeader";
import {
  Sparkles,
  MessageSquare,
  Mail,
  Cpu,
  CheckCircle2,
  Download,
  Key,
  MousePointerClick,
  Share2,
} from "lucide-react";

export const Route = createFileRoute("/extension")({
  head: () => ({
    meta: [
      { title: "SelfMax Capsule Assistant — Chrome Extension" },
      {
        name: "description",
        content:
          "Pure client-side Bring-Your-Own-Key (BYOK) browser agent for context extraction, DOM automation, email draft refactoring, SMS conversion, and memory sync.",
      },
      { name: "robots", content: "index,follow" },
    ],
  }),
  component: ExtensionPage,
});

function ExtensionPage() {
  const download = () => {
    fetch("/selfmax-extension.zip")
      .then((res) => {
        if (!res.ok) throw new Error(`Download failed: ${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "selfmax-extension.zip";
        a.click();
        URL.revokeObjectURL(a.href);
      })
      .catch((err) => alert(err.message));
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader />
      <main className="mx-auto max-w-4xl px-6 py-12">
        <div className="flex flex-col gap-4">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Version 1.2.1 · Persona &amp; Context Injector + BYOK Engine</span>
          </div>

          <h1 className="font-brand text-4xl font-extrabold md:text-5xl">
            Self Maximizer - Persona &amp; Context Injector
          </h1>

          <p className="max-w-2xl text-lg text-muted-foreground">
            Injects your master persona, principles, and system rules directly into web AI models
            (ChatGPT, Claude, Gemini, Google AI Studio) with a single click or Alt+P shortcut. Runs
            pure client-side BYOK with local storage privacy.
          </p>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-4">
          <button
            id="download-extension-btn"
            onClick={download}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3.5 font-brand text-base font-bold text-primary-foreground shadow-sm transition hover:bg-primary/90 active:scale-[0.98]"
          >
            <Download className="h-5 w-5" />
            <span>Download Extension (.zip)</span>
          </button>
          <span className="text-xs text-muted-foreground">
            Compatible with Chrome, Brave, Edge, Arc &amp; Opera
          </span>
        </div>

        {/* Feature Cards Grid */}
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 shadow-xs">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Sparkles className="h-5 w-5" />
            </div>
            <h3 className="mt-4 font-brand text-lg font-bold">Persona &amp; Context Injector</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Injects your master persona, system rules, and negative constraints directly into web
              AI models (ChatGPT, Claude, Gemini, Google AI Studio) with a single click or Alt+P
              shortcut. Full JSON import/export support for complete backup and cross-device
              portability.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-foreground text-background">
              <Key className="h-5 w-5" />
            </div>
            <h3 className="mt-4 font-brand text-lg font-bold">Pure Client-Side BYOK</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Direct connection to Google Gemini, OpenAI, Claude, or OpenRouter. Your API keys live
              strictly in your browser's private local storage — zero middleman server proxies.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-foreground text-background">
              <MousePointerClick className="h-5 w-5" />
            </div>
            <h3 className="mt-4 font-brand text-lg font-bold">Structured DOM Automation</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Autonomous tool calling parses live page context, fills inputs, and clicks elements
              based on structured JSON responses with explicit human confirmation safeguards.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-white">
              <Share2 className="h-5 w-5" />
            </div>
            <h3 className="mt-4 font-brand text-lg font-bold">Communication Hub Sync</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Draft messages, generate &lt;160c SMS summaries, and dispatch memory syncs across
              Discord webhooks, Telegram bots, Slack channels, and Twilio relays.
            </p>
          </div>
        </div>

        {/* Secondary Feature Cards */}
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
                <Mail className="h-4 w-4" />
              </div>
              <h4 className="font-semibold text-base">In-Line Gmail &amp; Outlook Refactoring</h4>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Injects compact action buttons directly inside compose windows to polish tone, fix
              grammar, and condense replies with zero workflow disruption.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                <Cpu className="h-4 w-4" />
              </div>
              <h4 className="font-semibold text-base">Local LLM &amp; Offline Notes</h4>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Connect to LM Studio or Ollama on localhost for 100% offline intelligence, with
              debounced auto-saving notes and instant .md Markdown exports.
            </p>
          </div>
        </div>

        {/* Installation Instructions */}
        <section className="mt-14 rounded-2xl border border-border bg-card p-8 shadow-xs">
          <h2 className="font-brand text-2xl font-bold">Quick Installation (~1 minute)</h2>
          <ol className="mt-6 space-y-4 text-[15px] text-muted-foreground">
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                1
              </span>
              <span>
                Click the <strong>Download Extension (.zip)</strong> button above and extract the
                contents to a folder on your computer.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                2
              </span>
              <span>
                In your browser, open{" "}
                <code className="rounded bg-muted px-2 py-0.5 font-mono text-sm text-foreground">
                  chrome://extensions
                </code>{" "}
                (or{" "}
                <code className="rounded bg-muted px-2 py-0.5 font-mono text-sm text-foreground">
                  edge://extensions
                </code>{" "}
                /{" "}
                <code className="rounded bg-muted px-2 py-0.5 font-mono text-sm text-foreground">
                  brave://extensions
                </code>
                ).
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                3
              </span>
              <span>
                Enable <strong>Developer mode</strong> using the toggle in the top-right corner.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                4
              </span>
              <span>
                Click <strong>Load unpacked</strong> and select the unzipped folder containing{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
                  manifest.json
                </code>
                .
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                5
              </span>
              <span>
                Open the extension, head to the <strong>Provider Keys</strong> tab, paste your
                Gemini or OpenAI API key, and you are ready to automate!
              </span>
            </li>
          </ol>
        </section>

        {/* Usage Guide */}
        <section className="mt-10 rounded-2xl border border-border bg-card p-8 shadow-xs">
          <h2 className="font-brand text-2xl font-bold">How to use the assistant</h2>
          <div className="mt-6 space-y-4 text-[15px] text-muted-foreground">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
              <div>
                <strong className="text-foreground">Page Action Automation:</strong> In the{" "}
                <em>Agent</em> tab, type a request (e.g. "Find the search bar and type X" or
                "Analyze form fields"), click{" "}
                <span className="rounded bg-muted px-1.5 py-0.5 font-semibold text-xs text-foreground">
                  🤖 Page Action
                </span>
                , and approve the highlighted DOM action with one click.
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
              <div>
                <strong className="text-foreground">In Gmail / Outlook:</strong> Open any compose
                window. Click{" "}
                <span className="rounded bg-muted px-1.5 py-0.5 font-semibold text-xs text-foreground">
                  ✨ Tighten &amp; Fix
                </span>{" "}
                to polish your draft or{" "}
                <span className="rounded bg-muted px-1.5 py-0.5 font-semibold text-xs text-foreground">
                  💬 SMS (&lt;160 char)
                </span>{" "}
                to condense it immediately.
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
              <div>
                <strong className="text-foreground">Active Webpage Scraper &amp; Notes:</strong>{" "}
                Pull live headings and DOM context into clean Markdown files or auto-saved local
                notes with one click.
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
