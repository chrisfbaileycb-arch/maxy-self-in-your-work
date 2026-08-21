import { createFileRoute } from "@tanstack/react-router";
import { AppHeader } from "@/components/AppHeader";
import { Sparkles, MessageSquare, Mail, Cpu, CheckCircle2, Download, Terminal } from "lucide-react";

export const Route = createFileRoute("/extension")({
  head: () => ({
    meta: [
      { title: "SelfMax Capsule Assistant — Chrome Extension" },
      {
        name: "description",
        content:
          "Zero-API-key AI assistant for email draft refactoring, SMS conversion, and memory capture using Web Sessions, Local LLMs, and custom keys.",
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
    <div className="min-h-screen bg-[#fffdfb]">
      <AppHeader />
      <main className="mx-auto max-w-4xl px-6 py-12">
        <div className="flex flex-col gap-4">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[#fed7aa] bg-[#fff8f4] px-3 py-1 text-xs font-bold text-[#f0806a]">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Version 1.1.0 · Manifest V3</span>
          </div>

          <h1 className="font-brand text-4xl font-extrabold text-[#2a2320] md:text-5xl">
            SelfMax Capsule Assistant for Chrome
          </h1>

          <p className="max-w-2xl text-lg text-muted-foreground">
            A zero-API-key browser companion that polishes Gmail and Outlook drafts, converts long
            emails into crisp SMS texts (&lt;160 characters), and captures thoughts directly into
            your SelfMax memory buckets.
          </p>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-4">
          <button
            id="download-extension-btn"
            onClick={download}
            className="inline-flex items-center gap-2 rounded-xl bg-[#f0806a] px-6 py-3.5 font-brand text-base font-bold text-white shadow-sm transition hover:bg-[#e06c54] active:scale-[0.98]"
          >
            <Download className="h-5 w-5" />
            <span>Download Extension (.zip)</span>
          </button>
          <span className="text-xs text-muted-foreground">
            Compatible with Chrome, Brave, Edge, Arc &amp; Opera
          </span>
        </div>

        {/* Feature Cards Grid */}
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-[#fed7aa] bg-[#fff8f4] p-5 shadow-xs">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f0806a] text-white">
              <Mail className="h-5 w-5" />
            </div>
            <h3 className="mt-4 font-brand text-lg font-bold text-[#2a2320]">
              Gmail &amp; Outlook In-Line
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Injects a compact pill toolbar into Gmail and Outlook compose windows. Refine tone,
              fix grammar, and tighten email drafts in one click.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
              <MessageSquare className="h-5 w-5" />
            </div>
            <h3 className="mt-4 font-brand text-lg font-bold text-[#2a2320]">
              SMS Generator (&lt;160c)
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Instantly converts lengthy paragraphs or emails into actionable, character-budgeted
              SMS texts ready for copy-paste or webhook dispatch.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-white">
              <Cpu className="h-5 w-5" />
            </div>
            <h3 className="mt-4 font-brand text-lg font-bold text-[#2a2320]">
              Triple AI Orchestrator
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Operates via <strong>ChatGPT Web Sessions</strong> without needing API keys, connects
              directly to <strong>Local LLMs</strong> (LM Studio / Jan / Ollama), or uses custom API
              keys.
            </p>
          </div>
        </div>

        {/* Installation Instructions */}
        <section className="mt-14 rounded-2xl border border-slate-200 bg-white p-8 shadow-xs">
          <h2 className="font-brand text-2xl font-bold text-[#2a2320]">
            Quick Installation (~1 minute)
          </h2>
          <ol className="mt-6 space-y-4 text-[15px] text-slate-700">
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#f0806a] text-xs font-bold text-white">
                1
              </span>
              <span>
                Click the <strong>Download Extension (.zip)</strong> button above and extract the
                contents to a folder on your computer.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#f0806a] text-xs font-bold text-white">
                2
              </span>
              <span>
                In your browser, open{" "}
                <code className="rounded bg-slate-100 px-2 py-0.5 font-mono text-sm text-slate-800">
                  chrome://extensions
                </code>{" "}
                (or{" "}
                <code className="rounded bg-slate-100 px-2 py-0.5 font-mono text-sm text-slate-800">
                  edge://extensions
                </code>{" "}
                /{" "}
                <code className="rounded bg-slate-100 px-2 py-0.5 font-mono text-sm text-slate-800">
                  brave://extensions
                </code>
                ).
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#f0806a] text-xs font-bold text-white">
                3
              </span>
              <span>
                Enable <strong>Developer mode</strong> using the toggle in the top-right corner.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#f0806a] text-xs font-bold text-white">
                4
              </span>
              <span>
                Click <strong>Load unpacked</strong> and select the unzipped folder containing{" "}
                <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">
                  manifest.json
                </code>
                .
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#f0806a] text-xs font-bold text-white">
                5
              </span>
              <span>
                Pin the coral <strong>SelfMax</strong> icon to your browser toolbar for quick access
                to the popup and email tools!
              </span>
            </li>
          </ol>
        </section>

        {/* Usage Guide */}
        <section className="mt-10 rounded-2xl border border-slate-200 bg-white p-8 shadow-xs">
          <h2 className="font-brand text-2xl font-bold text-[#2a2320]">How to use the assistant</h2>
          <div className="mt-6 space-y-4 text-[15px] text-slate-700">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#16a34a]" />
              <div>
                <strong>In Gmail / Outlook:</strong> Open any compose window. Click{" "}
                <span className="rounded bg-slate-100 px-1.5 py-0.5 font-semibold text-xs">
                  ✨ Tighten &amp; Fix
                </span>{" "}
                to polish your draft or{" "}
                <span className="rounded bg-slate-100 px-1.5 py-0.5 font-semibold text-xs">
                  💬 SMS (&lt;160 char)
                </span>{" "}
                to condense it immediately.
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#16a34a]" />
              <div>
                <strong>In the Extension Popup:</strong> Paste text to instantly polish or generate
                SMS, or switch to the <em>Capture</em> tab to route any page or selection directly
                into your SelfMax memory dashboard.
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#16a34a]" />
              <div>
                <strong>Engine Flexibility:</strong> Switch between ChatGPT Web Sessions (zero
                config), Local LLM (LM Studio / Jan on{" "}
                <code className="rounded bg-slate-100 px-1 font-mono text-xs">localhost:1234</code>
                ), or Custom API keys in the <em>Engine</em> settings tab.
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
