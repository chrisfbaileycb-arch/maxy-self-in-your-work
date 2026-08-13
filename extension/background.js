// Self Maximizer — background service worker
const APP_ORIGIN_KEY = "smx_app_origin";
const DEFAULT_ORIGIN = "https://circlesapp.co"; // updated after publish

async function getAppOrigin() {
  const { [APP_ORIGIN_KEY]: origin } = await chrome.storage.local.get(APP_ORIGIN_KEY);
  return origin || DEFAULT_ORIGIN;
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "smx-send-selection",
    title: "Send selection to Self Maximizer",
    contexts: ["selection"],
  });
  chrome.contextMenus.create({
    id: "smx-send-page",
    title: "Send whole page to Self Maximizer",
    contexts: ["page"],
  });
});

async function grabPageText(tabId) {
  const [{ result } = {}] = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const sel = window.getSelection()?.toString();
      if (sel && sel.trim().length > 0) return sel;
      // Fallback: visible body text, trimmed
      return (document.body?.innerText || "").slice(0, 20000);
    },
  });
  return result || "";
}

async function sendToApp(text, source) {
  if (!text || !text.trim()) return;
  const origin = await getAppOrigin();
  // Privacy: captured text is NEVER placed in the URL (URLs land in browser
  // history, sync, and server logs). We hand it to the tab via sessionStorage,
  // which is scoped to that tab and cleared when it closes.
  const payload = { text, source, capturedAt: Date.now() };
  const tab = await chrome.tabs.create({ url: `${origin}/dashboard#ingest=1` });

  const deliver = async (tabId, info) => {
    if (tabId !== tab.id || info.status !== "complete") return;
    chrome.tabs.onUpdated.removeListener(deliver);
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        func: (p) => {
          sessionStorage.setItem("smx_pending", JSON.stringify(p));
          window.dispatchEvent(new Event("smx-pending"));
        },
        args: [payload],
      });
    } catch {
      // If injection is blocked, the user can still paste manually.
    }
  };
  chrome.tabs.onUpdated.addListener(deliver);
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id) return;
  if (info.menuItemId === "smx-send-selection") {
    await sendToApp(info.selectionText || "", "chat");
  } else if (info.menuItemId === "smx-send-page") {
    const text = await grabPageText(tab.id);
    await sendToApp(text, "chat");
  }
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  (async () => {
    if (msg?.type === "SMX_CAPTURE") {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) return sendResponse({ ok: false, error: "no tab" });
      const text = await grabPageText(tab.id);
      await sendToApp(text, msg.source || "chat");
      sendResponse({ ok: true, chars: text.length });
    }
  })();
  return true;
});
