import { createFileRoute } from "@tanstack/react-router";
import { AppHeader } from "@/components/AppHeader";

export const Route = createFileRoute("/extension")({
  head: () => ({
    meta: [
      { title: "Chrome extension — Self Maximizer" },
      {
        name: "description",
        content:
          "Capture chats, emails, and texts from any page and send them to Self Maximizer for AI sorting.",
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
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="font-brand text-4xl font-extrabold text-[#2a2320]">
          Self Maximizer for Chrome
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Highlight a chat, email, or text on any page — right-click or click the extension — and it
          lands in your dashboard, ready to sort into personal and work memories.
        </p>

        <button
          onClick={download}
          className="mt-6 rounded-lg bg-[#f0806a] px-5 py-3 font-brand font-bold text-white hover:brightness-105"
        >
          Download extension (.zip)
        </button>

        <section className="mt-10">
          <h2 className="font-brand text-2xl font-bold text-[#2a2320]">
            Install (unpacked, ~1 minute)
          </h2>
          <ol className="mt-4 list-decimal space-y-2 pl-6 text-[15px]">
            <li>Unzip the file you just downloaded.</li>
            <li>
              Open <code className="rounded bg-muted px-1.5 py-0.5">chrome://extensions</code> in
              Chrome, Edge, Brave, Arc, or Opera.
            </li>
            <li>
              Toggle <strong>Developer mode</strong> (top-right).
            </li>
            <li>
              Click <strong>Load unpacked</strong> and pick the unzipped
              <code className="mx-1 rounded bg-muted px-1.5 py-0.5">selfmax-extension</code>
              folder.
            </li>
            <li>
              Pin the coral <em>S</em> icon in the toolbar for one-click capture.
            </li>
          </ol>
        </section>

        <section className="mt-10">
          <h2 className="font-brand text-2xl font-bold text-[#2a2320]">How to use it</h2>
          <ul className="mt-4 list-disc space-y-2 pl-6 text-[15px]">
            <li>
              <strong>Selection →</strong> highlight text, right-click, choose{" "}
              <em>Send selection to Self Maximizer</em>.
            </li>
            <li>
              <strong>Whole page →</strong> click the toolbar icon and pick
              <em> Send as chat / email / text</em> to tag the source.
            </li>
            <li>
              The dashboard opens with the text prefilled. Review, then hit
              <em> Sort</em> — the AI routes each memory to the right personal or work project.
            </li>
          </ul>
        </section>

        <p className="mt-10 text-sm text-muted-foreground">
          A one-click Web Store install is coming after publish review. For now the unpacked install
          works in every Chromium browser.
        </p>
      </main>
    </div>
  );
}
