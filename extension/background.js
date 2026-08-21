// SelfMax Capsule Assistant — background service worker (Manifest V3)
const APP_ORIGIN_KEY = "smx_app_origin";
const AI_MODE_KEY = "smx_ai_mode"; // "webchat" | "local" | "byok"
const LOCAL_ENDPOINT_KEY = "smx_local_endpoint"; // default: "http://localhost:1234/v1"
const BYOK_KEY_KEY = "smx_byok_key";
const BYOK_ENDPOINT_KEY = "smx_byok_endpoint";

const DEFAULT_APP_ORIGIN = "https://circlesapp.co";
const DEFAULT_LOCAL_ENDPOINT = "http://localhost:1234/v1";

// 1. Declarative Net Request — Dynamic rule to spoof Origin & Referer for ChatGPT Web Session proxying
async function setupDeclarativeNetRules() {
  const RULE_ID = 1001;
  const rules = [
    {
      id: RULE_ID,
      priority: 1,
      action: {
        type: "modifyHeaders",
        requestHeaders: [
          { header: "Origin", operation: "set", value: "https://chatgpt.com" },
          { header: "Referer", operation: "set", value: "https://chatgpt.com/" },
          {
            header: "User-Agent",
            operation: "set",
            value:
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
          },
        ],
      },
      condition: {
        urlFilter: "https://chatgpt.com/backend-api/*",
        resourceTypes: ["xmlhttprequest"],
      },
    },
  ];

  try {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [RULE_ID],
      addRules: rules,
    });
  } catch (err) {
    console.warn("[SelfMax] Could not register declarative rules:", err);
  }
}

chrome.runtime.onInstalled.addListener(async () => {
  await setupDeclarativeNetRules();

  // Context menus for quick actions
  try {
    chrome.contextMenus.create({
      id: "smx-send-selection",
      title: "📥 Send selection to SelfMax",
      contexts: ["selection"],
    });
    chrome.contextMenus.create({
      id: "smx-send-page",
      title: "📄 Send whole page to SelfMax",
      contexts: ["page"],
    });
  } catch {
    // Already created
  }
});

chrome.runtime.onStartup.addListener(async () => {
  await setupDeclarativeNetRules();
});

// Helper to get configured App Origin
async function getAppOrigin() {
  const { [APP_ORIGIN_KEY]: origin } = await chrome.storage.local.get(APP_ORIGIN_KEY);
  return origin || DEFAULT_APP_ORIGIN;
}

// 2. AI Generation Engine: Web Session / Local LLM / BYOK
async function handleAIGeneration(promptText, requestedMode) {
  const storage = await chrome.storage.local.get([
    AI_MODE_KEY,
    LOCAL_ENDPOINT_KEY,
    BYOK_KEY_KEY,
    BYOK_ENDPOINT_KEY,
  ]);

  const mode = requestedMode || storage[AI_MODE_KEY] || "webchat";

  // Mode B: Local LLM Server (LM Studio, Jan, Ollama)
  if (mode === "local") {
    const rawEndpoint = storage[LOCAL_ENDPOINT_KEY] || DEFAULT_LOCAL_ENDPOINT;
    const endpoint = rawEndpoint.replace(/\/+$/, "") + "/chat/completions";

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content:
                "You are an expert communication assistant. Respond with the refined text directly.",
            },
            { role: "user", content: promptText },
          ],
          temperature: 0.3,
        }),
      });

      if (!res.ok) {
        throw new Error(
          `Local LLM server returned HTTP ${res.status}. Is LM Studio / Jan running on ${rawEndpoint}?`,
        );
      }

      const data = await res.json();
      return data.choices?.[0]?.message?.content?.trim() || "No response generated.";
    } catch (err) {
      throw new Error(`Could not connect to Local LLM at ${rawEndpoint}: ${err.message}`);
    }
  }

  // Mode C: BYOK (Custom API Key / Provider)
  if (mode === "byok") {
    const apiKey = storage[BYOK_KEY_KEY];
    if (!apiKey) {
      throw new Error(
        "No custom API key configured. Please configure it in extension popup settings.",
      );
    }
    const endpoint =
      (storage[BYOK_ENDPOINT_KEY] || "https://api.openai.com/v1").replace(/\/+$/, "") +
      "/chat/completions";

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: promptText }],
        temperature: 0.3,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      throw new Error(`API key request failed (${res.status}): ${errBody.slice(0, 150)}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || "";
  }

  // Mode A (Default): Web Session (ChatGPT Zero-Config)
  return await handleChatGPTWebSession(promptText);
}

async function handleChatGPTWebSession(promptText) {
  // Check session cookie
  let sessionCookie = null;
  try {
    sessionCookie = await chrome.cookies.get({
      url: "https://chatgpt.com",
      name: "__Secure-next-auth.session-token",
    });
  } catch (err) {
    console.warn("Cookie lookup error:", err);
  }

  if (!sessionCookie || !sessionCookie.value) {
    throw new Error("No active ChatGPT session. Please open https://chatgpt.com and log in.");
  }

  // Fetch access token from auth endpoint
  let authData = null;
  try {
    const authRes = await fetch("https://chatgpt.com/api/auth/session", {
      headers: { Accept: "application/json" },
    });
    if (!authRes.ok) {
      throw new Error(`Session validation failed (${authRes.status}). Please refresh chatgpt.com.`);
    }
    authData = await authRes.json();
  } catch (err) {
    throw new Error(
      "Could not verify ChatGPT session. Please make sure you are logged into chatgpt.com.",
    );
  }

  if (!authData || !authData.accessToken) {
    throw new Error("ChatGPT session expired or unauthenticated. Please re-login at chatgpt.com.");
  }

  // Post to conversation API
  const conversationRes = await fetch("https://chatgpt.com/backend-api/conversation", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authData.accessToken}`,
      Accept: "text/event-stream",
    },
    body: JSON.stringify({
      action: "next",
      messages: [
        {
          id: crypto.randomUUID(),
          author: { role: "user" },
          content: { content_type: "text", parts: [promptText] },
        },
      ],
      model: "auto",
      timezone_offset_min: new Date().getTimezoneOffset(),
    }),
  });

  if (!conversationRes.ok) {
    if (conversationRes.status === 401 || conversationRes.status === 403) {
      throw new Error(
        "ChatGPT authentication failed (403/401). Please open chatgpt.com in a tab and verify Cloudflare.",
      );
    }
    if (conversationRes.status === 429) {
      throw new Error("ChatGPT rate limit exceeded. Please wait a moment.");
    }
    const errText = await conversationRes.text().catch(() => "");
    throw new Error(
      `ChatGPT Web request failed (${conversationRes.status}): ${errText.slice(0, 150)}`,
    );
  }

  const raw = await conversationRes.text();
  const extracted = extractSSEText(raw);
  if (!extracted) {
    throw new Error("Received empty response from ChatGPT web session.");
  }
  return extracted.trim();
}

function extractSSEText(raw) {
  const lines = raw.split("\n");
  let lastParts = "";
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (line.startsWith("data: ") && line !== "data: [DONE]") {
      try {
        const json = JSON.parse(line.slice(6));
        const parts = json.message?.content?.parts;
        if (Array.isArray(parts) && parts.length > 0) {
          lastParts = parts.join("");
          break;
        }
      } catch {
        continue;
      }
    }
  }
  return lastParts;
}

// 3. Message Routing for Popup & Content Scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "GENERATE_DRAFT") {
    handleAIGeneration(request.prompt, request.mode)
      .then((text) => sendResponse({ success: true, text }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true; // Keep channel open for async response
  }

  if (request.action === "CHECK_SESSION") {
    (async () => {
      try {
        const cookie = await chrome.cookies.get({
          url: "https://chatgpt.com",
          name: "__Secure-next-auth.session-token",
        });
        if (!cookie) {
          return sendResponse({ loggedIn: false, error: "No cookie found for chatgpt.com" });
        }
        const authRes = await fetch("https://chatgpt.com/api/auth/session");
        if (authRes.ok) {
          const data = await authRes.json();
          return sendResponse({ loggedIn: true, user: data.user?.email || "ChatGPT User" });
        }
        sendResponse({ loggedIn: false, error: "Session invalid or expired" });
      } catch (err) {
        sendResponse({ loggedIn: false, error: err.message });
      }
    })();
    return true;
  }

  if (request.type === "SMX_CAPTURE") {
    (async () => {
      let text = request.directText;
      if (!text) {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id) return sendResponse({ ok: false, error: "No active tab." });
        text = await grabPageText(tab.id);
      }
      if (!text || !text.trim()) {
        return sendResponse({ ok: false, error: "No text to capture." });
      }
      await sendToApp(text, request.source || "chat");
      sendResponse({ ok: true, chars: text.length });
    })();
    return true;
  }
});

// 4. Memory Capture & Integration into SelfMax
async function grabPageText(tabId) {
  try {
    const [{ result } = {}] = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const sel = window.getSelection()?.toString();
        if (sel && sel.trim().length > 0) return sel;
        return (document.body?.innerText || "").slice(0, 20000);
      },
    });
    return result || "";
  } catch {
    return "";
  }
}

async function sendToApp(text, source) {
  if (!text || !text.trim()) return;
  const origin = await getAppOrigin();
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
      // Non-fatal if blocked
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
