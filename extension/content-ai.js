// SelfMax Capsule Assistant — Persona & Context Injector Content Script
// Injects master persona, rules, and system context into web AI models:
// ChatGPT, Claude, Gemini, Google AI Studio

(function () {
  "use strict";

  const INJECTED_CONTAINER_ID = "selfmax-persona-injector-ui";
  const DEFAULT_PERSONA = `[SYSTEM CONTEXT & USER MASTER PERSONA]
• Role: Principal Software Engineer & Systems Architect
• Working Principles:
  - Check existing and native ecosystem tools first; do not propose custom overkill solutions.
  - If a problem is already solved natively (e.g. native browser APIs, OS utilities), point it out directly.
  - Prioritize actionable bullet points, concise explanations, and minimal conversational fluff.
  - Provide complete, verified code blocks without placeholders.`;

  let activePlatform = detectPlatform();
  let cachedPersona = null;

  // Detect which web AI model surface we are on
  function detectPlatform() {
    const host = window.location.hostname;
    if (host.includes("chatgpt.com")) return "chatgpt";
    if (host.includes("claude.ai")) return "claude";
    if (host.includes("gemini.google.com")) return "gemini";
    if (host.includes("aistudio.google.com")) return "aistudio";
    return "generic_ai";
  }

  // Load master persona from chrome.storage.local
  async function getStoredPersona() {
    if (cachedPersona) return cachedPersona;
    return new Promise((resolve) => {
      chrome.storage.local.get(
        ["master_persona", "smx_master_persona", "smx_identity_role", "smx_master_rules"],
        (data) => {
          const rawPersona = data.master_persona || data.smx_master_persona;
          if (rawPersona && rawPersona.trim()) {
            cachedPersona = rawPersona.trim();
          } else if (data.smx_identity_role || data.smx_master_rules) {
            cachedPersona = `[SYSTEM CONTEXT & USER MASTER PERSONA]
• Role: ${data.smx_identity_role || "Principal Software Engineer"}
• Master Rules:
${data.smx_master_rules || "  - Use existing native tools first.\n  - Provide clear, concise bullet points."}`;
          } else {
            cachedPersona = DEFAULT_PERSONA;
          }
          resolve(cachedPersona);
        },
      );
    });
  }

  // Auto-inject master persona into empty chat when new conversation opens
  function injectPersonaIntoChat() {
    chrome.storage.local.get(
      [
        "master_persona",
        "persona_injection_enabled",
        "global_persona_enabled",
        "auto_inject_enabled",
        "smx_master_persona",
      ],
      (data) => {
        // Global toggle check: if disabled, never inject
        if (data.persona_injection_enabled === false || data.global_persona_enabled === false) {
          return;
        }

        const masterPersona = data.master_persona || data.smx_master_persona;
        if (!masterPersona || data.auto_inject_enabled === false) return;

        // Detect target input elements across popular AI apps
        const inputField =
          document.querySelector("#prompt-textarea") || // ChatGPT
          document.querySelector('div[contenteditable="true"]') || // Claude / Gemini
          document.querySelector("textarea"); // AI Studio / Standard

        if (!inputField) return;

        // Only inject if the field is empty to prevent overwriting an active prompt
        const currentText = inputField.isContentEditable
          ? (inputField.innerText || "").trim()
          : (inputField.value || "").trim();
        if (currentText.length > 0) return;

        const personaText = `[SYSTEM CONTEXT / ABOUT ME]:\n${masterPersona}\n\n---\n`;

        if (inputField.isContentEditable) {
          inputField.focus();
          document.execCommand("insertText", false, personaText);
        } else {
          inputField.value = personaText;
          inputField.dispatchEvent(new Event("input", { bubbles: true }));
        }
      },
    );
  }

  // Listen for storage changes to update cached persona and pill state in real-time
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local") {
      if (changes.master_persona || changes.smx_master_persona || changes.smx_master_rules) {
        cachedPersona = null;
      }
      if (changes.persona_injection_enabled || changes.global_persona_enabled) {
        updateFloatingPillUI();
      }
    }
  });

  // Find the prompt/chat input element across AI platforms
  function findPromptInput() {
    const platform = activePlatform || detectPlatform();

    if (platform === "chatgpt") {
      const el =
        document.querySelector("#prompt-textarea") ||
        document.querySelector('div[contenteditable="true"][data-id]') ||
        document.querySelector('div[contenteditable="true"]#prompt-textarea') ||
        document.querySelector('textarea[data-id="root"]') ||
        document.querySelector('div[contenteditable="true"]');
      if (el) return el;
    }

    if (platform === "claude") {
      const el =
        document.querySelector("div.ProseMirror[contenteditable='true']") ||
        document.querySelector("div[contenteditable='true']") ||
        document.querySelector("fieldset textarea");
      if (el) return el;
    }

    if (platform === "gemini") {
      const el =
        document.querySelector("div.ql-editor[contenteditable='true']") ||
        document.querySelector("rich-textarea div[contenteditable='true']") ||
        document.querySelector("div[contenteditable='true'][role='textbox']") ||
        document.querySelector("textarea");
      if (el) return el;
    }

    if (platform === "aistudio") {
      const el =
        document.querySelector("textarea.prompt-textarea") ||
        document.querySelector("ms-prompt-editor textarea") ||
        document.querySelector("textarea[aria-label*='prompt' i]") ||
        document.querySelector("div.input-container textarea") ||
        document.querySelector("textarea") ||
        document.querySelector("div[contenteditable='true']");
      if (el) return el;
    }

    // Generic fallback for any AI interface
    return (
      document.querySelector("textarea:not([readonly])") ||
      document.querySelector("div[contenteditable='true']") ||
      document.querySelector("input[type='text']:not([readonly])")
    );
  }

  // Programmatically inject text into complex reactive inputs
  function injectTextIntoInput(targetEl, textToInject, mode = "prepend") {
    if (!targetEl) return false;

    targetEl.focus();

    const isContentEditable =
      targetEl.isContentEditable || targetEl.getAttribute("contenteditable") === "true";

    if (isContentEditable) {
      // ContentEditable editor (ProseMirror, Quill, Lexical, Draft)
      const currentText = (targetEl.innerText || targetEl.textContent || "").trim();
      let combined = textToInject;

      if (currentText) {
        if (mode === "prepend") {
          combined = `${textToInject}\n\n${currentText}`;
        } else if (mode === "append") {
          combined = `${currentText}\n\n${textToInject}`;
        }
      }

      // Try execCommand first (safest for rich text editors to update internal state)
      targetEl.focus();
      document.execCommand("selectAll", false, null);
      const inserted = document.execCommand("insertText", false, combined);

      if (!inserted) {
        // Fallback DOM assignment with synthetic events
        targetEl.innerText = combined;
        targetEl.dispatchEvent(
          new InputEvent("beforeinput", {
            bubbles: true,
            composed: true,
            inputType: "insertText",
            data: combined,
          }),
        );
        targetEl.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
        targetEl.dispatchEvent(new Event("change", { bubbles: true }));
      }
      return true;
    }

    // HTMLTextAreaElement or HTMLInputElement
    const currentVal = (targetEl.value || "").trim();
    let finalVal = textToInject;

    if (currentVal) {
      if (mode === "prepend") {
        finalVal = `${textToInject}\n\n${currentVal}`;
      } else if (mode === "append") {
        finalVal = `${currentVal}\n\n${textToInject}`;
      }
    }

    // React / Angular synthetic event prototype setter
    const proto =
      targetEl instanceof HTMLTextAreaElement
        ? window.HTMLTextAreaElement.prototype
        : window.HTMLInputElement.prototype;
    const desc = Object.getOwnPropertyDescriptor(proto, "value");

    if (desc && desc.set) {
      desc.set.call(targetEl, finalVal);
    } else {
      targetEl.value = finalVal;
    }

    targetEl.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
    targetEl.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }

  // Visual toast notification on target web page
  function showPageToast(message, isSuccess = true) {
    const existing = document.getElementById("selfmax-persona-toast");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.id = "selfmax-persona-toast";
    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 999999;
      background: ${isSuccess ? "#1e293b" : "#991b1b"};
      color: #ffffff;
      padding: 10px 16px;
      border-radius: 10px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 13px;
      font-weight: 600;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.2);
      border: 1px solid ${isSuccess ? "#334155" : "#b91c1c"};
      display: flex;
      align-items: center;
      gap: 8px;
      pointer-events: none;
      animation: smxToastIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    `;

    toast.innerHTML = `
      <span style="color:#f0806a; font-size:15px;">⚡</span>
      <span>${message}</span>
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transition = "opacity 0.3s ease";
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  // Master Persona Injector Trigger
  async function performInjection(mode = "prepend") {
    // Check global toggle switch state
    const isGloballyEnabled = await new Promise((resolve) => {
      chrome.storage.local.get(["persona_injection_enabled", "global_persona_enabled"], (data) => {
        resolve(data.persona_injection_enabled !== false && data.global_persona_enabled !== false);
      });
    });

    if (!isGloballyEnabled) {
      showPageToast(
        "Persona injection is currently toggled OFF in popup. Flip switch to ON to inject.",
        false,
      );
      return false;
    }

    const inputEl = findPromptInput();
    if (!inputEl) {
      showPageToast("Prompt input not detected on this page.", false);
      return false;
    }

    const personaText = await getStoredPersona();
    const success = injectTextIntoInput(inputEl, personaText, mode);

    if (success) {
      const platformNames = {
        chatgpt: "ChatGPT",
        claude: "Claude",
        gemini: "Gemini",
        aistudio: "Google AI Studio",
        generic_ai: "AI Model",
      };
      const name = platformNames[activePlatform] || "AI Model";
      showPageToast(`Master Persona & Context injected into ${name}! (Alt+P)`, true);
      return true;
    } else {
      showPageToast("Failed to inject persona context.", false);
      return false;
    }
  }

  // Update floating pill UI based on global persona toggle
  function updateFloatingPillUI() {
    const pill = document.getElementById(INJECTED_CONTAINER_ID);
    if (!pill) return;

    chrome.storage.local.get(["persona_injection_enabled", "global_persona_enabled"], (data) => {
      const isEnabled =
        data.persona_injection_enabled !== false && data.global_persona_enabled !== false;
      if (isEnabled) {
        pill.title = "Click or press Alt+P to inject your Master Persona & Context into prompt";
        pill.style.opacity = "1";
        pill.style.background = "#ffffff";
        pill.style.borderColor = "#fed7aa";
        pill.innerHTML = `
          <span style="color:#f0806a; font-size:13px;">⚡</span>
          <span style="color:#0f172a;">Inject Persona</span>
          <span style="background:#fff1ee; color:#ea580c; border:1px solid #fed7aa; border-radius:4px; padding:1px 5px; font-size:9.5px; font-weight:700;">Alt+P</span>
        `;
      } else {
        pill.title =
          "Persona injection is currently toggled OFF in popup (text preserved). Click to check status.";
        pill.style.opacity = "0.8";
        pill.style.background = "#f8fafc";
        pill.style.borderColor = "#cbd5e1";
        pill.innerHTML = `
          <span style="font-size:12px;">⏸️</span>
          <span style="color:#64748b; font-weight:600;">Persona Paused</span>
        `;
      }
    });
  }

  // Floating Quick-Action Pill near prompt area
  function renderFloatingInjectorPill() {
    if (document.getElementById(INJECTED_CONTAINER_ID)) return;

    const pill = document.createElement("div");
    pill.id = INJECTED_CONTAINER_ID;
    pill.style.cssText = `
      position: fixed;
      bottom: 18px;
      left: 20px;
      z-index: 999990;
      display: flex;
      align-items: center;
      gap: 6px;
      background: #ffffff;
      color: #1e293b;
      padding: 5px 12px;
      border-radius: 20px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 11.5px;
      font-weight: 700;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
      border: 1px solid #fed7aa;
      cursor: pointer;
      user-select: none;
      transition: all 0.18s ease;
    `;

    pill.title = "Click or press Alt+P to inject your Master Persona & Context into the prompt";
    pill.innerHTML = `
      <span style="color:#f0806a; font-size:13px;">⚡</span>
      <span style="color:#0f172a;">Inject Persona</span>
      <span style="background:#fff1ee; color:#ea580c; border:1px solid #fed7aa; border-radius:4px; padding:1px 5px; font-size:9.5px; font-weight:700;">Alt+P</span>
    `;

    pill.addEventListener("mouseenter", () => {
      pill.style.transform = "translateY(-1px) scale(1.02)";
      pill.style.boxShadow = "0 6px 16px rgba(240, 128, 106, 0.25)";
      pill.style.borderColor = "#f0806a";
    });

    pill.addEventListener("mouseleave", () => {
      pill.style.transform = "none";
      pill.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.12)";
      pill.style.borderColor = "#fed7aa";
    });

    pill.addEventListener("click", () => {
      performInjection("prepend");
    });

    document.body.appendChild(pill);
    updateFloatingPillUI();
  }

  // Keyboard shortcut: Alt+P (or Option+P on macOS)
  window.addEventListener("keydown", (e) => {
    if (e.altKey && (e.key === "p" || e.key === "P" || e.code === "KeyP")) {
      e.preventDefault();
      performInjection("prepend");
    }
  });

  // Extension runtime messaging listener
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "INJECT_PERSONA") {
      performInjection(request.mode || "prepend").then((success) => {
        sendResponse({ success });
      });
      return true;
    }

    if (request.action === "CHECK_AI_PAGE") {
      const inputEl = findPromptInput();
      sendResponse({
        isAiPage: true,
        platform: activePlatform,
        hasInput: Boolean(inputEl),
      });
      return true;
    }
  });

  // Initialize once DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      renderFloatingInjectorPill();
      injectPersonaIntoChat();
    });
  } else {
    renderFloatingInjectorPill();
    injectPersonaIntoChat();
  }

  // Observe URL/DOM transitions (Single Page App navigations and new chat openings)
  let lastHref = window.location.href;
  let autoInjectTimer = null;
  const observer = new MutationObserver(() => {
    if (window.location.href !== lastHref) {
      lastHref = window.location.href;
      activePlatform = detectPlatform();
      // On navigation to a new conversation, attempt injection into empty input
      injectPersonaIntoChat();
    }
    if (!document.getElementById(INJECTED_CONTAINER_ID)) {
      renderFloatingInjectorPill();
    }
    clearTimeout(autoInjectTimer);
    autoInjectTimer = setTimeout(() => {
      injectPersonaIntoChat();
    }, 600);
  });

  observer.observe(document.body, { childList: true, subtree: true });
})();
