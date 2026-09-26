// SelfMax Capsule Assistant — background service worker (Manifest V3)
// Pure Client-Side BYOK (Bring Your Own Key) Engine + DOM Tool Calling Automation

const APP_ORIGIN_KEY = "smx_app_origin";
const BYOK_PROVIDER_KEY = "smx_byok_provider"; // "gemini" | "openai" | "anthropic" | "openrouter" | "local" | "webchat"
const KEY_GEMINI = "smx_key_gemini";
const KEY_OPENAI = "smx_key_openai";
const KEY_ANTHROPIC = "smx_key_anthropic";
const KEY_OPENROUTER = "smx_key_openrouter";
const CUSTOM_ENDPOINT_KEY = "smx_custom_endpoint";
const CUSTOM_MODEL_KEY = "smx_custom_model";
const MODEL_GEMINI_KEY = "smx_model_gemini";
const MODEL_OPENAI_KEY = "smx_model_openai";
const MODEL_ANTHROPIC_KEY = "smx_model_anthropic";
const LOCAL_ENDPOINT_KEY = "smx_local_endpoint";

const DEFAULT_APP_ORIGIN = "https://circlesapp.co";
const DEFAULT_LOCAL_ENDPOINT = "http://localhost:1234/v1";

// 1. Declarative Net Request for Web Session spoofing (when Web Session mode is used)
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
    chrome.contextMenus.create({
      id: "smx-inject-persona",
      title: "⚡ Inject Master Persona into Prompt",
      contexts: ["editable", "page"],
      documentUrlPatterns: [
        "https://chatgpt.com/*",
        "https://claude.ai/*",
        "https://gemini.google.com/*",
        "https://aistudio.google.com/*",
      ],
    });
  } catch {
    // Already created
  }
});

chrome.runtime.onStartup.addListener(async () => {
  await setupDeclarativeNetRules();
});

// Shortcut command listener for inject-persona (Alt+P)
chrome.commands?.onCommand?.addListener(async (command) => {
  if (command === "inject-persona") {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;
    chrome.tabs.sendMessage(tab.id, { action: "INJECT_PERSONA" }, () => {
      if (chrome.runtime.lastError) {
        // Fallback: programmatic injection if content-ai.js not yet loaded
        chrome.scripting.executeScript(
          {
            target: { tabId: tab.id },
            files: ["content-ai.js"],
          },
          () => {
            chrome.tabs.sendMessage(tab.id, { action: "INJECT_PERSONA" });
          },
        );
      }
    });
  }
});

async function getAppOrigin() {
  const { [APP_ORIGIN_KEY]: origin } = await chrome.storage.local.get(APP_ORIGIN_KEY);
  return origin || DEFAULT_APP_ORIGIN;
}

// 2. Pure Client-Side BYOK AI Completion Router
async function handleBYOKGeneration(promptText, overrideProvider) {
  const store = await chrome.storage.local.get([
    BYOK_PROVIDER_KEY,
    KEY_GEMINI,
    KEY_OPENAI,
    KEY_ANTHROPIC,
    KEY_OPENROUTER,
    CUSTOM_ENDPOINT_KEY,
    CUSTOM_MODEL_KEY,
    MODEL_GEMINI_KEY,
    MODEL_OPENAI_KEY,
    MODEL_ANTHROPIC_KEY,
    LOCAL_ENDPOINT_KEY,
  ]);

  const provider = overrideProvider || store[BYOK_PROVIDER_KEY] || "gemini";

  if (provider === "gemini") {
    const key = store[KEY_GEMINI];
    if (!key)
      throw new Error("Google Gemini API key missing. Enter your key in Provider Keys tab.");
    const model = store[MODEL_GEMINI_KEY] || store[CUSTOM_MODEL_KEY] || "gemini-1.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: promptText }] }],
        generationConfig: { temperature: 0.3 },
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Google Gemini error (${res.status}): ${errText.slice(0, 180)}`);
    }

    const data = await res.json();
    const candidate = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidate) throw new Error("No response generated by Google Gemini.");
    return candidate.trim();
  }

  if (provider === "openai") {
    const key = store[KEY_OPENAI];
    if (!key) throw new Error("OpenAI API key missing. Enter your key in Provider Keys tab.");
    const endpoint =
      (store[CUSTOM_ENDPOINT_KEY] || "https://api.openai.com/v1").replace(/\/+$/, "") +
      "/chat/completions";
    const model = store[MODEL_OPENAI_KEY] || store[CUSTOM_MODEL_KEY] || "gpt-4o-mini";

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: promptText }],
        temperature: 0.3,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`OpenAI error (${res.status}): ${errText.slice(0, 180)}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || "";
  }

  if (provider === "anthropic") {
    const key = store[KEY_ANTHROPIC];
    if (!key) throw new Error("Anthropic API key missing. Enter your key in Provider Keys tab.");
    const model =
      store[MODEL_ANTHROPIC_KEY] || store[CUSTOM_MODEL_KEY] || "claude-3-5-sonnet-20241022";

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model,
        max_tokens: 2048,
        messages: [{ role: "user", content: promptText }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Anthropic error (${res.status}): ${errText.slice(0, 180)}`);
    }

    const data = await res.json();
    return data.content?.[0]?.text?.trim() || "";
  }

  if (provider === "openrouter") {
    const key = store[KEY_OPENROUTER];
    if (!key) throw new Error("OpenRouter API key missing. Enter your key in Provider Keys tab.");
    const model = store[CUSTOM_MODEL_KEY] || "google/gemini-2.0-flash-exp:free";

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
        "HTTP-Referer": "https://circlesapp.co",
        "X-Title": "SelfMax Capsule Assistant",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: promptText }],
        temperature: 0.3,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`OpenRouter error (${res.status}): ${errText.slice(0, 180)}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || "";
  }

  if (provider === "local") {
    const rawEndpoint = store[LOCAL_ENDPOINT_KEY] || DEFAULT_LOCAL_ENDPOINT;
    const endpoint = rawEndpoint.replace(/\/+$/, "") + "/chat/completions";

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: promptText }],
        temperature: 0.3,
      }),
    });

    if (!res.ok) {
      throw new Error(
        `Local LLM server returned HTTP ${res.status}. Is LM Studio / Ollama running at ${rawEndpoint}?`,
      );
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || "";
  }

  // Fallback to webchat
  return await handleChatGPTWebSession(promptText);
}

// 3. Structured DOM Tool Calling Automation
// Injects into active tab to inspect or manipulate live DOM
async function executeDomToolOnActiveTab(tool, params = {}) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error("No active browser tab found.");

  if (tool === "extract_context") {
    const [{ result } = {}] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const title = document.title || "";
        const url = window.location.href;
        const headings = Array.from(document.querySelectorAll("h1, h2, h3"))
          .slice(0, 8)
          .map((h) => h.innerText.trim())
          .filter(Boolean);

        const interactiveElements = Array.from(
          document.querySelectorAll(
            "button, input:not([type='hidden']), textarea, select, a[href]",
          ),
        )
          .slice(0, 15)
          .map((el) => {
            const tag = el.tagName.toLowerCase();
            const id = el.id ? `#${el.id}` : "";
            const name = el.getAttribute("name") || "";
            const placeholder = el.getAttribute("placeholder") || "";
            const text = (el.innerText || el.value || "").slice(0, 40).trim();
            const role = el.getAttribute("role") || "";
            return { tag, id, name, placeholder, text, role };
          });

        const selectedText = window.getSelection()?.toString()?.trim() || "";
        const bodySnippet = (document.body?.innerText || "").slice(0, 15000);

        return {
          title,
          url,
          headings,
          interactiveElements,
          selectedText,
          bodySnippet,
        };
      },
    });
    return result;
  }

  if (tool === "fill_input") {
    const { selector, value } = params;
    if (!value) throw new Error("No value provided to fill_input.");

    const [{ result } = {}] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (sel, val) => {
        let el = null;
        if (sel) {
          el = document.querySelector(sel);
        }
        if (!el && sel) {
          // Fallback search by placeholder, name, or aria-label
          el =
            document.querySelector(`input[placeholder*='${sel}' i]`) ||
            document.querySelector(`textarea[placeholder*='${sel}' i]`) ||
            document.querySelector(`[name*='${sel}' i]`) ||
            document.querySelector(`[aria-label*='${sel}' i]`);
        }
        if (!el) {
          // Fallback to first visible input or textarea
          el = document.querySelector(
            "textarea, input[type='text'], input[type='search'], [contenteditable='true']",
          );
        }

        if (!el) return { success: false, reason: "Element not found" };

        el.focus();
        if (el.isContentEditable) {
          el.innerText = val;
        } else {
          el.value = val;
        }
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));

        // Visual flash highlight
        const originalOutline = el.style.outline;
        el.style.outline = "2px solid #f0806a";
        setTimeout(() => {
          el.style.outline = originalOutline;
        }, 1200);

        return { success: true, elementTag: el.tagName, elementId: el.id || el.name };
      },
      args: [selector || "", value],
    });
    return result;
  }

  if (tool === "click_element") {
    const { selector } = params;
    const [{ result } = {}] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (sel) => {
        let el = null;
        if (sel) {
          el = document.querySelector(sel);
        }
        if (!el && sel) {
          // Find button or link by text content
          const buttons = Array.from(document.querySelectorAll("button, a, input[type='submit']"));
          el = buttons.find(
            (b) =>
              (b.innerText || b.value || "").toLowerCase().includes(sel.toLowerCase()) ||
              (b.getAttribute("aria-label") || "").toLowerCase().includes(sel.toLowerCase()),
          );
        }

        if (!el) return { success: false, reason: "Clickable target not found" };

        el.scrollIntoView({ behavior: "smooth", block: "center" });
        const originalOutline = el.style.outline;
        el.style.outline = "3px solid #22c55e";
        setTimeout(() => {
          el.style.outline = originalOutline;
        }, 800);

        el.click();
        return { success: true, elementTag: el.tagName, text: el.innerText || el.value };
      },
      args: [selector || ""],
    });
    return result;
  }

  throw new Error(`Unsupported tool: ${tool}`);
}

// 4. Autonomous Agent Loop: Page Context + User Goal → Structured Tool Calling
async function runPageAgent(userGoal) {
  // Step 1: Extract active page context
  const context = await executeDomToolOnActiveTab("extract_context");

  // Step 2: Build model prompt instructing JSON tool calling or direct synthesis
  const agentPrompt = `You are the SelfMax Browser Automation Agent.
Your job is to analyze the active webpage and execute or recommend the exact next action.

USER GOAL:
${userGoal}

ACTIVE WEBPAGE CONTEXT:
- Title: ${context.title}
- URL: ${context.url}
- Headings: ${context.headings.join(" | ")}
- Interactive Elements Detected:
${context.interactiveElements.map((el) => `  * <${el.tag} id="${el.id}" name="${el.name}" placeholder="${el.placeholder}"> ${el.text}`).join("\n")}
- Selection: ${context.selectedText || "(none)"}
- Page Snippet (first 4000 chars):
${context.bodySnippet.slice(0, 4000)}

INSTRUCTIONS:
1. First, check if the goal can be solved with existing native browser/system tools or if custom scripts are overkill.
2. If action on this webpage is required, output a strict JSON action block in this format:
{
  "tool": "fill_input" | "click_element" | "extract_context" | "none",
  "params": {
    "selector": "CSS selector or button label",
    "value": "text to fill (if fill_input)"
  },
  "rationale": "Clear 1-2 sentence explanation of what will be done."
}
3. If no DOM manipulation is needed, return "tool": "none" and the rationale with bullet points.`;

  const modelOutput = await handleBYOKGeneration(agentPrompt);

  // Parse JSON tool call if present
  let parsedTool = null;
  try {
    const jsonMatch = modelOutput.match(/\{[\s\S]*"tool"[\s\S]*\}/);
    if (jsonMatch) {
      parsedTool = JSON.parse(jsonMatch[0]);
    }
  } catch {
    parsedTool = null;
  }

  return {
    rawOutput: modelOutput,
    parsedTool,
    pageContext: {
      title: context.title,
      url: context.url,
    },
  };
}

// 5. ChatGPT Web Session (Fallback)
async function handleChatGPTWebSession(promptText) {
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
    throw new Error(
      "No active ChatGPT session. Please add your personal API key in Provider Keys tab.",
    );
  }

  const authRes = await fetch("https://chatgpt.com/api/auth/session", {
    headers: { Accept: "application/json" },
  });
  if (!authRes.ok) throw new Error("Could not verify ChatGPT session. Use BYOK Provider Keys.");
  const authData = await authRes.json();
  if (!authData?.accessToken) throw new Error("ChatGPT session expired. Use BYOK Provider Keys.");

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
    throw new Error(
      `ChatGPT Web request failed (${conversationRes.status}). Use BYOK Provider Keys.`,
    );
  }

  const raw = await conversationRes.text();
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
  return lastParts.trim();
}

// 6. Message Dispatcher
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "GENERATE_DRAFT") {
    handleBYOKGeneration(request.prompt, request.provider)
      .then((text) => sendResponse({ success: true, text }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (request.action === "EXECUTE_DOM_TOOL") {
    executeDomToolOnActiveTab(request.tool, request.params)
      .then((result) => sendResponse({ success: true, result }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (request.action === "RUN_PAGE_AGENT") {
    runPageAgent(request.goal)
      .then((result) => sendResponse({ success: true, ...result }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (request.action === "TEST_PROVIDER_KEY") {
    handleBYOKGeneration("Respond with 'OK' only.", request.provider)
      .then((text) => sendResponse({ success: true, message: text }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (request.action === "CHECK_SESSION") {
    chrome.storage.local
      .get([BYOK_PROVIDER_KEY, KEY_GEMINI, KEY_OPENAI, KEY_ANTHROPIC, KEY_OPENROUTER])
      .then((store) => {
        const provider = store[BYOK_PROVIDER_KEY] || "gemini";
        const hasKey =
          (provider === "gemini" && Boolean(store[KEY_GEMINI])) ||
          (provider === "openai" && Boolean(store[KEY_OPENAI])) ||
          (provider === "anthropic" && Boolean(store[KEY_ANTHROPIC])) ||
          (provider === "openrouter" && Boolean(store[KEY_OPENROUTER])) ||
          provider === "local";

        sendResponse({
          ready: hasKey,
          provider,
          name: `${provider.toUpperCase()} (${hasKey ? "Key Ready" : "Key Needed"})`,
        });
      });
    return true;
  }

  if (request.type === "SMX_CAPTURE") {
    (async () => {
      let text = request.directText;
      if (!text) {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.id) {
          const [{ result } = {}] = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () =>
              window.getSelection()?.toString() || (document.body?.innerText || "").slice(0, 20000),
          });
          text = result;
        }
      }
      if (!text || !text.trim()) return sendResponse({ ok: false, error: "No text to capture." });

      const origin = await getAppOrigin();
      const payload = { text, source: request.source || "chat", capturedAt: Date.now() };
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
          // Non-fatal
        }
      };
      chrome.tabs.onUpdated.addListener(deliver);
      sendResponse({ ok: true, chars: text.length });
    })();
    return true;
  }
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id) return;

  if (info.menuItemId === "smx-inject-persona") {
    chrome.tabs.sendMessage(tab.id, { action: "INJECT_PERSONA" }, () => {
      if (chrome.runtime.lastError) {
        chrome.scripting.executeScript(
          {
            target: { tabId: tab.id },
            files: ["content-ai.js"],
          },
          () => {
            chrome.tabs.sendMessage(tab.id, { action: "INJECT_PERSONA" });
          },
        );
      }
    });
    return;
  }

  const origin = await getAppOrigin();
  const text =
    info.selectionText ||
    ((
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () =>
          window.getSelection()?.toString() || (document.body?.innerText || "").slice(0, 15000),
      })
    )?.[0]?.result ??
      "");

  if (!text) return;
  chrome.tabs.create({ url: `${origin}/dashboard#ingest=1` }, (newTab) => {
    const deliver = (tId, changeInfo) => {
      if (tId !== newTab.id || changeInfo.status !== "complete") return;
      chrome.tabs.onUpdated.removeListener(deliver);
      chrome.scripting.executeScript({
        target: { tabId: tId },
        func: (p) => {
          sessionStorage.setItem("smx_pending", JSON.stringify(p));
          window.dispatchEvent(new Event("smx-pending"));
        },
        args: [{ text, source: "contextMenu", capturedAt: Date.now() }],
      });
    };
    chrome.tabs.onUpdated.addListener(deliver);
  });
});
