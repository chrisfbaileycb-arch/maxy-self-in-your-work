// SelfMax Capsule Assistant — Popup Script
const APP_ORIGIN_KEY = "smx_app_origin";
const AI_MODE_KEY = "smx_ai_mode";
const LOCAL_ENDPOINT_KEY = "smx_local_endpoint";
const BYOK_KEY_KEY = "smx_byok_key";
const BYOK_ENDPOINT_KEY = "smx_byok_endpoint";

// DOM Elements
const sessionBadge = document.getElementById("session-badge");
const draftInput = document.getElementById("draft-input");
const btnPaste = document.getElementById("btn-paste");
const btnPolish = document.getElementById("btn-polish");
const btnSms = document.getElementById("btn-sms");
const aiStatus = document.getElementById("ai-status");
const resultContainer = document.getElementById("result-container");
const resultText = document.getElementById("result-text");
const charCount = document.getElementById("char-count");
const btnCopy = document.getElementById("btn-copy");
const btnSaveMemory = document.getElementById("btn-save-memory");

const captureStatus = document.getElementById("capture-status");
const noteToSelfBtn = document.getElementById("note-to-self");

const saveSettingsBtn = document.getElementById("save-settings");
const settingsStatus = document.getElementById("settings-status");
const appOriginInput = document.getElementById("app-origin");
const localEndpointInput = document.getElementById("local-endpoint");
const byokKeyInput = document.getElementById("byok-key");
const byokEndpointInput = document.getElementById("byok-endpoint");
const localConfigPane = document.getElementById("local-config");
const byokConfigPane = document.getElementById("byok-config");

// 1. Tab Switching
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach((c) => c.classList.remove("active"));

    btn.classList.add("active");
    const target = document.getElementById(btn.dataset.tab);
    if (target) target.classList.add("active");
  });
});

// 2. Initialize Settings & Session
async function init() {
  const storage = await chrome.storage.local.get([
    APP_ORIGIN_KEY,
    AI_MODE_KEY,
    LOCAL_ENDPOINT_KEY,
    BYOK_KEY_KEY,
    BYOK_ENDPOINT_KEY,
  ]);

  if (storage[APP_ORIGIN_KEY]) appOriginInput.value = storage[APP_ORIGIN_KEY];
  if (storage[LOCAL_ENDPOINT_KEY]) localEndpointInput.value = storage[LOCAL_ENDPOINT_KEY];
  if (storage[BYOK_KEY_KEY]) byokKeyInput.value = storage[BYOK_KEY_KEY];
  if (storage[BYOK_ENDPOINT_KEY]) byokEndpointInput.value = storage[BYOK_ENDPOINT_KEY];

  const currentMode = storage[AI_MODE_KEY] || "webchat";
  const radio = document.querySelector(`input[name="ai_mode"][value="${currentMode}"]`);
  if (radio) radio.checked = true;
  updateConfigPanes(currentMode);

  // Check ChatGPT Session
  checkSessionStatus();
}

function updateConfigPanes(mode) {
  if (mode === "local") {
    localConfigPane.classList.remove("hidden");
    byokConfigPane.classList.add("hidden");
  } else if (mode === "byok") {
    localConfigPane.classList.add("hidden");
    byokConfigPane.classList.remove("hidden");
  } else {
    localConfigPane.classList.add("hidden");
    byokConfigPane.classList.add("hidden");
  }
}

document.querySelectorAll('input[name="ai_mode"]').forEach((r) => {
  r.addEventListener("change", (e) => {
    updateConfigPanes(e.target.value);
  });
});

async function checkSessionStatus() {
  sessionBadge.textContent = "Checking...";
  sessionBadge.className = "badge";

  chrome.runtime.sendMessage({ action: "CHECK_SESSION" }, (res) => {
    if (chrome.runtime.lastError || !res) {
      sessionBadge.textContent = "Offline";
      sessionBadge.className = "badge";
      return;
    }

    if (res.loggedIn) {
      sessionBadge.textContent = "🟢 Web Active";
      sessionBadge.className = "badge online";
      sessionBadge.title = `Connected as ${res.user}`;
    } else {
      sessionBadge.textContent = "🔴 Login ChatGPT";
      sessionBadge.className = "badge offline";
      sessionBadge.title = "Click to open chatgpt.com and log in";
      sessionBadge.onclick = () => chrome.tabs.create({ url: "https://chatgpt.com" });
    }
  });
}

// 3. AI Polish & SMS Actions
btnPaste.addEventListener("click", async () => {
  try {
    const text = await navigator.clipboard.readText();
    if (text) draftInput.value = text;
  } catch {
    draftInput.focus();
  }
});

btnPolish.addEventListener("click", () => runAITask("polish"));
btnSms.addEventListener("click", () => runAITask("sms"));

async function runAITask(actionType) {
  const rawText = draftInput.value.trim();
  if (!rawText) {
    aiStatus.textContent = "⚠️ Please paste or enter draft text.";
    setTimeout(() => (aiStatus.textContent = ""), 2500);
    return;
  }

  aiStatus.innerHTML = `<span style="color:#f0806a;">⚡ Generating with AI...</span>`;
  resultContainer.classList.add("hidden");

  let prompt = "";
  if (actionType === "polish") {
    prompt = `Refactor this email draft to be clear, professional, natural, and concise while fixing grammar, flow, and tone. Return ONLY the final draft text without commentary:\n\n${rawText}`;
  } else {
    prompt = `Convert the following message into an actionable, crystal-clear SMS text message under 160 characters. Return ONLY the SMS text without commentary:\n\n${rawText}`;
  }

  chrome.runtime.sendMessage({ action: "GENERATE_DRAFT", prompt }, (res) => {
    if (chrome.runtime.lastError) {
      aiStatus.textContent = "❌ " + (chrome.runtime.lastError.message || "Error");
      return;
    }

    if (res && res.success && res.text) {
      aiStatus.innerHTML = `<span style="color:#16a34a; font-weight:600;">✓ Complete!</span>`;
      resultText.value = res.text;
      updateCharCount(res.text.length, actionType === "sms");
      resultContainer.classList.remove("hidden");
    } else {
      const err = res?.error || "AI generation failed";
      aiStatus.innerHTML = `<span style="color:#dc2626;">❌ ${err}</span>`;
      if (err.toLowerCase().includes("session") || err.toLowerCase().includes("login")) {
        checkSessionStatus();
      }
    }
  });
}

function updateCharCount(len, isSms) {
  charCount.textContent = `${len} chars`;
  if (isSms && len > 160) {
    charCount.classList.add("warning");
  } else {
    charCount.classList.remove("warning");
  }
}

btnCopy.addEventListener("click", async () => {
  if (!resultText.value) return;
  await navigator.clipboard.writeText(resultText.value);
  btnCopy.textContent = "✓ Copied!";
  setTimeout(() => (btnCopy.textContent = "📋 Copy"), 1800);
});

btnSaveMemory.addEventListener("click", () => {
  const text = resultText.value.trim();
  if (!text) return;
  chrome.runtime.sendMessage({ type: "SMX_CAPTURE", source: "email", directText: text }, (res) => {
    if (res?.ok) {
      btnSaveMemory.textContent = "✓ Sent!";
      setTimeout(() => (btnSaveMemory.textContent = "📥 Send to SelfMax"), 1800);
    }
  });
});

// 4. Capture Tab Actions
document.querySelectorAll(".source-btn").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const source = btn.dataset.source;
    captureStatus.textContent = "Capturing...";
    try {
      const res = await chrome.runtime.sendMessage({ type: "SMX_CAPTURE", source });
      if (res?.ok) {
        captureStatus.innerHTML = `<span style="color:#16a34a;">✓ Captured ${res.chars} chars to dashboard</span>`;
        setTimeout(() => window.close(), 1000);
      } else {
        captureStatus.textContent = res?.error || "Nothing to capture on active page.";
      }
    } catch (e) {
      captureStatus.textContent = e?.message || "Capture failed.";
    }
  });
});

noteToSelfBtn.addEventListener("click", async () => {
  const { [APP_ORIGIN_KEY]: origin } = await chrome.storage.local.get(APP_ORIGIN_KEY);
  await chrome.tabs.create({ url: `${origin || "https://circlesapp.co"}/note` });
  window.close();
});

// 5. Settings Save
saveSettingsBtn.addEventListener("click", async () => {
  const selectedMode = document.querySelector('input[name="ai_mode"]:checked')?.value || "webchat";
  const appOrigin = appOriginInput.value.trim().replace(/\/+$/, "");
  const localEndpoint = localEndpointInput.value.trim().replace(/\/+$/, "");
  const byokKey = byokKeyInput.value.trim();
  const byokEndpoint = byokEndpointInput.value.trim().replace(/\/+$/, "");

  await chrome.storage.local.set({
    [AI_MODE_KEY]: selectedMode,
    [APP_ORIGIN_KEY]: appOrigin,
    [LOCAL_ENDPOINT_KEY]: localEndpoint,
    [BYOK_KEY_KEY]: byokKey,
    [BYOK_ENDPOINT_KEY]: byokEndpoint,
  });

  settingsStatus.innerHTML = `<span style="color:#16a34a; font-weight:600;">✓ Settings saved!</span>`;
  setTimeout(() => (settingsStatus.textContent = ""), 2500);
  checkSessionStatus();
});

init();
