// Self Maximizer — Persona Manager Component (ES Module)
// Allows users to save, edit, and inject their 'master persona' text into AI chat sessions
// Target AI surfaces: ChatGPT, Claude, Gemini, Google AI Studio, and arbitrary web models

export const PERSONA_STORAGE_KEYS = {
  MASTER_PERSONA: "master_persona",
  LEGACY_MASTER_PERSONA: "smx_master_persona",
  PERSONA_ENABLED: "persona_injection_enabled",
  GLOBAL_PERSONA_ENABLED: "global_persona_enabled",
  AUTO_INJECT_ENABLED: "auto_inject_enabled",
  ACTIVE_PRESET: "smx_persona_preset",
  INJECT_MODE: "smx_persona_inject_mode",
};

export const PERSONA_PRESETS = [
  {
    id: "architect",
    name: "🚀 Systems Architect (Native-First / Anti-Overkill)",
    badge: "Architect",
    text: `[SYSTEM CONTEXT & USER MASTER PERSONA]
• Identity: Principal Systems Architect & Senior Engineer
• Directives:
  - Always investigate native browser, system, and framework capabilities before proposing custom code.
  - Reject over-engineered solutions: if an OS utility, standard API, or existing open-source tool solves it, state so immediately.
  - Answer with concise, high-density bullet points and zero conversational fluff.
  - Provide copy-paste ready, complete code without ellipsis or placeholders.`,
  },
  {
    id: "researcher",
    name: "🔍 Deep Researcher (Internet-First / Verified)",
    badge: "Researcher",
    text: `[SYSTEM CONTEXT & USER MASTER PERSONA]
• Identity: Technical Researcher & Fact-Checker
• Directives:
  - Search current sources before answering; never rely on stale assumptions.
  - Verify official documentation, current release versions, and breaking changes.
  - Clearly state primary sources and provide step-by-step verification commands.
  - Highlight potential deprecation risks or ecosystem traps.`,
  },
  {
    id: "executive",
    name: "💼 Executive Lead (Actionable / Concise / ROI)",
    badge: "Executive",
    text: `[SYSTEM CONTEXT & USER MASTER PERSONA]
• Identity: Technical Product Lead
• Directives:
  - Provide executive summaries: 1. Core Takeaway, 2. Immediate Actions, 3. Blockers.
  - Focus on leverage, engineering velocity, and operational simplicity.
  - Limit explanations to 3-5 high-impact bullet points.`,
  },
  {
    id: "custom",
    name: "⚙️ Custom Persona & Context",
    badge: "Custom",
    text: `[SYSTEM CONTEXT & USER MASTER PERSONA]
• Identity: Builder & Engineer
• Master Rules:
  - Check existing native tools first.
  - Do not waste time building custom scripts if a standard tool already exists.
  - Respond with concise bulleted statements.`,
  },
];

/**
 * Loads current Master Persona settings from chrome.storage.local
 */
export async function loadMasterPersonaSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(
      [
        PERSONA_STORAGE_KEYS.MASTER_PERSONA,
        PERSONA_STORAGE_KEYS.LEGACY_MASTER_PERSONA,
        PERSONA_STORAGE_KEYS.PERSONA_ENABLED,
        PERSONA_STORAGE_KEYS.GLOBAL_PERSONA_ENABLED,
        PERSONA_STORAGE_KEYS.AUTO_INJECT_ENABLED,
        PERSONA_STORAGE_KEYS.ACTIVE_PRESET,
        PERSONA_STORAGE_KEYS.INJECT_MODE,
      ],
      (data) => {
        const personaText =
          data[PERSONA_STORAGE_KEYS.MASTER_PERSONA] ||
          data[PERSONA_STORAGE_KEYS.LEGACY_MASTER_PERSONA] ||
          PERSONA_PRESETS[0].text;

        const personaEnabled =
          data[PERSONA_STORAGE_KEYS.PERSONA_ENABLED] !== false &&
          data[PERSONA_STORAGE_KEYS.GLOBAL_PERSONA_ENABLED] !== false;

        resolve({
          personaText,
          personaEnabled,
          autoInjectEnabled: data[PERSONA_STORAGE_KEYS.AUTO_INJECT_ENABLED] !== false,
          activePreset: data[PERSONA_STORAGE_KEYS.ACTIVE_PRESET] || PERSONA_PRESETS[0].id,
          injectMode: data[PERSONA_STORAGE_KEYS.INJECT_MODE] || "prepend",
        });
      },
    );
  });
}

/**
 * Saves Master Persona settings into chrome.storage.local
 */
export async function saveMasterPersonaSettings({
  personaText,
  personaEnabled = true,
  autoInjectEnabled,
  activePreset,
  injectMode,
}) {
  const cleanText = (personaText || "").trim();
  const payload = {
    [PERSONA_STORAGE_KEYS.MASTER_PERSONA]: cleanText,
    [PERSONA_STORAGE_KEYS.LEGACY_MASTER_PERSONA]: cleanText,
    [PERSONA_STORAGE_KEYS.PERSONA_ENABLED]: personaEnabled !== false,
    [PERSONA_STORAGE_KEYS.GLOBAL_PERSONA_ENABLED]: personaEnabled !== false,
    [PERSONA_STORAGE_KEYS.AUTO_INJECT_ENABLED]: Boolean(autoInjectEnabled),
    [PERSONA_STORAGE_KEYS.ACTIVE_PRESET]: activePreset || "custom",
    [PERSONA_STORAGE_KEYS.INJECT_MODE]: injectMode || "prepend",
  };

  return new Promise((resolve) => {
    chrome.storage.local.set(payload, () => {
      resolve({ success: true, message: "✓ Master Persona saved & synced locally." });
    });
  });
}

/**
 * Injects the persona directly into the active browser tab
 */
export async function injectPersonaIntoActiveTab(customMode) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    return { success: false, error: "No active browser tab found." };
  }

  const { personaText, injectMode, personaEnabled } = await loadMasterPersonaSettings();
  if (!personaEnabled) {
    return {
      success: false,
      error: "Persona injection is currently toggled OFF in popup. Turn it ON to inject.",
    };
  }

  const mode = customMode || injectMode || "prepend";

  const url = tab.url || "";
  const isAiPage =
    url.includes("chatgpt.com") ||
    url.includes("claude.ai") ||
    url.includes("gemini.google.com") ||
    url.includes("aistudio.google.com");

  try {
    const res = await new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(
        tab.id,
        { action: "INJECT_PERSONA", mode, personaText },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        },
      );
    });
    return { success: Boolean(res?.success), isAiPage: true };
  } catch {
    // If content script was not already active, attempt programmatic injection
    if (isAiPage || url.startsWith("http")) {
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ["content-ai.js"],
        });

        // Retry sending message after script injection
        const retryRes = await new Promise((resolve) => {
          setTimeout(() => {
            chrome.tabs.sendMessage(tab.id, { action: "INJECT_PERSONA", mode, personaText }, (r) =>
              resolve(r),
            );
          }, 150);
        });

        return { success: Boolean(retryRes?.success), isAiPage: true };
      } catch (err) {
        return { success: false, isAiPage: true, error: err.message };
      }
    }

    return {
      success: false,
      isAiPage: false,
      error:
        "Active tab is not a supported AI model. Navigate to ChatGPT, Claude, Gemini, or AI Studio.",
    };
  }
}

/**
 * Inspects active tab to detect current AI surface
 */
export async function checkActiveTabAiStatus() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) return { isAiPage: false, label: "Unknown Tab" };

  const url = tab.url;
  if (url.includes("chatgpt.com")) {
    return { isAiPage: true, platform: "chatgpt", label: "ChatGPT" };
  }
  if (url.includes("claude.ai")) {
    return { isAiPage: true, platform: "claude", label: "Claude" };
  }
  if (url.includes("gemini.google.com")) {
    return { isAiPage: true, platform: "gemini", label: "Google Gemini" };
  }
  if (url.includes("aistudio.google.com")) {
    return { isAiPage: true, platform: "aistudio", label: "Google AI Studio" };
  }

  try {
    const host = new URL(url).hostname;
    return { isAiPage: false, label: host || "Webpage" };
  } catch {
    return { isAiPage: false, label: "Webpage" };
  }
}

/**
 * Mounts and initializes the Persona Manager component into a container DOM element.
 */
export function initPersonaComponent(container) {
  if (!container) return;

  container.innerHTML = `
    <div class="persona-card">
      <div class="persona-header-row">
        <div>
          <h3 class="persona-title">🎭 Persona Manager</h3>
          <p class="persona-subtitle">
            Configure your master persona &amp; system directives to inject into AI chat sessions.
          </p>
        </div>
      </div>

      <!-- AI Models Target Badges -->
      <div class="persona-target-row">
        <span class="persona-target-badge">ChatGPT</span>
        <span class="persona-target-badge">Claude</span>
        <span class="persona-target-badge">Gemini</span>
        <span class="persona-target-badge">AI Studio</span>
      </div>

      <!-- Active Tab Detection Pill -->
      <div class="persona-tab-status" id="persona-tab-status">
        <span class="status-dot">●</span>
        <span id="persona-tab-text">Detecting active AI page...</span>
      </div>

      <!-- Global Toggle Sync Indicator -->
      <div class="persona-global-sync-box active mt-1" id="persona-global-sync-box">
        <div class="sync-box-content">
          <span class="sync-icon" id="persona-sync-icon">⚡</span>
          <span id="persona-sync-text">Global Persona Injection: <strong>ACTIVE</strong></span>
        </div>
        <button type="button" class="text-link" id="btn-toggle-persona-sync">Disable</button>
      </div>

      <!-- Quick Action: Direct Inject -->
      <div class="actions-row mt-1">
        <button id="btn-inject-persona" class="primary-btn full-width inject-main-btn">
          ⚡ Inject Master Persona (Alt+P)
        </button>
      </div>
      <div id="persona-inject-status" class="status-msg"></div>

      <!-- Auto-Inject Toggle -->
      <div class="persona-autoinject-row">
        <label class="persona-checkbox-label">
          <input type="checkbox" id="persona-autoinject-checkbox" checked />
          <span>Auto-inject when new empty chat opens</span>
        </label>
      </div>

      <!-- Preset Selector -->
      <div class="field-header mt-2">
        <label for="persona-preset-select">Persona Preset Template:</label>
        <span class="badge-mini" id="persona-preset-badge">Architect</span>
      </div>
      <select id="persona-preset-select" class="dropdown-select">
        ${PERSONA_PRESETS.map((p) => `<option value="${p.id}">${p.name}</option>`).join("")}
      </select>

      <!-- Master Persona Text Area with Character & Token Count -->
      <div class="field-header mt-2">
        <label for="persona-text-input">Master Persona &amp; Rules Context:</label>
        <div class="header-actions">
          <button id="btn-import-persona-json" class="text-link" title="Import from JSON file">📥 Import JSON</button>
          <span class="divider">|</span>
          <button id="btn-export-persona-json" class="text-link" title="Export as JSON file">📤 Export JSON</button>
          <span class="divider">|</span>
          <button id="btn-copy-persona" class="text-link">Copy</button>
          <span class="divider">|</span>
          <button id="btn-reset-persona" class="text-link">Reset</button>
        </div>
      </div>
      <input type="file" id="persona-file-input" accept=".json,application/json" style="display: none;" />
      <textarea
        id="persona-text-input"
        rows="8"
        class="persona-textarea"
        placeholder="Define your master persona, principles, and rules to preload into web models... (Drop a .json file here to import)"
        spellcheck="false"
      ></textarea>

      <!-- Char count pill -->
      <div class="flex-between mt-1 text-xs text-muted">
        <span id="persona-char-count">0 characters (~0 tokens)</span>
        <span id="persona-autosave-indicator" class="autosave-text">● Ready to save</span>
      </div>

      <!-- Injection Mode & Save Button -->
      <div class="persona-options-row mt-2">
        <label class="persona-mode-label">
          Mode:
          <select id="persona-mode-select" class="dropdown-select compact-select">
            <option value="prepend">Prepend before prompt</option>
            <option value="append">Append after prompt</option>
            <option value="replace">Replace prompt</option>
          </select>
        </label>
        <button id="btn-save-persona" class="primary-btn save-persona-btn">
          💾 Save Persona
        </button>
      </div>

      <!-- Model Fast Launcher Links -->
      <div class="ai-launcher-row mt-2">
        <span class="launcher-title">Open AI Surface:</span>
        <a href="https://chatgpt.com" target="_blank" rel="noreferrer" class="ai-link">ChatGPT ↗</a>
        <a href="https://claude.ai" target="_blank" rel="noreferrer" class="ai-link">Claude ↗</a>
        <a href="https://gemini.google.com" target="_blank" rel="noreferrer" class="ai-link">Gemini ↗</a>
        <a href="https://aistudio.google.com" target="_blank" rel="noreferrer" class="ai-link">AI Studio ↗</a>
      </div>
    </div>
  `;

  // Grab elements
  const tabStatusEl = container.querySelector("#persona-tab-status");
  const tabTextEl = container.querySelector("#persona-tab-text");
  const syncBox = container.querySelector("#persona-global-sync-box");
  const syncIcon = container.querySelector("#persona-sync-icon");
  const syncText = container.querySelector("#persona-sync-text");
  const btnToggleSync = container.querySelector("#btn-toggle-persona-sync");
  const btnInject = container.querySelector("#btn-inject-persona");
  const injectStatus = container.querySelector("#persona-inject-status");
  const autoInjectCheckbox = container.querySelector("#persona-autoinject-checkbox");
  const presetSelect = container.querySelector("#persona-preset-select");
  const presetBadge = container.querySelector("#persona-preset-badge");
  const personaInput = container.querySelector("#persona-text-input");
  const charCountEl = container.querySelector("#persona-char-count");
  const btnCopy = container.querySelector("#btn-copy-persona");
  const btnReset = container.querySelector("#btn-reset-persona");
  const btnImportJson = container.querySelector("#btn-import-persona-json");
  const btnExportJson = container.querySelector("#btn-export-persona-json");
  const fileInput = container.querySelector("#persona-file-input");
  const modeSelect = container.querySelector("#persona-mode-select");
  const btnSave = container.querySelector("#btn-save-persona");

  let currentPersonaEnabled = true;

  function updatePersonaSyncBox(enabled) {
    currentPersonaEnabled = Boolean(enabled);
    if (!syncBox) return;
    if (currentPersonaEnabled) {
      syncBox.className = "persona-global-sync-box active mt-1";
      if (syncIcon) syncIcon.textContent = "⚡";
      if (syncText) syncText.innerHTML = "Global Persona Injection: <strong>ACTIVE</strong>";
      if (btnToggleSync) {
        btnToggleSync.textContent = "Disable";
        btnToggleSync.style.color = "var(--muted)";
      }
      if (btnInject) {
        btnInject.style.opacity = "1";
        btnInject.title = "Inject your master persona into the active AI model";
      }
    } else {
      syncBox.className = "persona-global-sync-box disabled mt-1";
      if (syncIcon) syncIcon.textContent = "⏸️";
      if (syncText) {
        syncText.innerHTML = "Global Persona Injection: <strong>PAUSED</strong> (text preserved)";
      }
      if (btnToggleSync) {
        btnToggleSync.textContent = "Enable";
        btnToggleSync.style.color = "var(--coral)";
      }
      if (btnInject) {
        btnInject.style.opacity = "0.75";
        btnInject.title = "Global toggle is currently OFF. Click to re-enable.";
      }
    }
  }

  // Toggle sync button inside Persona Manager tab
  btnToggleSync?.addEventListener("click", async () => {
    const nextState = !currentPersonaEnabled;
    await chrome.storage.local.set({
      [PERSONA_STORAGE_KEYS.PERSONA_ENABLED]: nextState,
      [PERSONA_STORAGE_KEYS.GLOBAL_PERSONA_ENABLED]: nextState,
    });
    updatePersonaSyncBox(nextState);
    showStatus(
      nextState
        ? "✓ Global persona injection enabled."
        : "⏸️ Persona injection paused. Your saved text is safely preserved.",
      nextState ? "success" : "info",
    );
  });

  // Storage listener to keep sync box in sync with global header toggle
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local") {
      if (
        changes[PERSONA_STORAGE_KEYS.PERSONA_ENABLED] ||
        changes[PERSONA_STORAGE_KEYS.GLOBAL_PERSONA_ENABLED]
      ) {
        const newVal =
          changes[PERSONA_STORAGE_KEYS.PERSONA_ENABLED]?.newValue ??
          changes[PERSONA_STORAGE_KEYS.GLOBAL_PERSONA_ENABLED]?.newValue;
        if (typeof newVal === "boolean") {
          updatePersonaSyncBox(newVal);
        }
      }
    }
  });

  function updateCharCount(text) {
    if (!charCountEl) return;
    const len = (text || "").length;
    const tokens = Math.ceil(len / 4);
    charCountEl.textContent = `${len} characters (~${tokens} tokens)`;
  }

  function showStatus(msg, type = "info") {
    if (!injectStatus) return;
    injectStatus.textContent = msg;
    injectStatus.className = `status-msg show ${type}`;
    if (type === "success") {
      setTimeout(() => injectStatus?.classList.remove("show"), 4000);
    }
  }

  // Check tab status
  checkActiveTabAiStatus().then((status) => {
    if (!tabStatusEl || !tabTextEl || !btnInject) return;
    if (status.isAiPage) {
      tabStatusEl.classList.add("ai-active");
      tabTextEl.textContent = `🟢 Active Tab: ${status.label} detected`;
      btnInject.textContent = `⚡ Inject Persona into ${status.label} (Alt+P)`;
    } else {
      tabStatusEl.classList.remove("ai-active");
      tabTextEl.textContent = `⚪ Active: ${status.label} (Open an AI tab to inject)`;
    }
  });

  // Load stored persona settings
  loadMasterPersonaSettings().then((settings) => {
    updatePersonaSyncBox(settings.personaEnabled);
    if (personaInput) {
      personaInput.value = settings.personaText;
      updateCharCount(settings.personaText);
    }
    if (autoInjectCheckbox) {
      autoInjectCheckbox.checked = settings.autoInjectEnabled;
    }
    if (presetSelect) {
      presetSelect.value = settings.activePreset;
    }
    if (modeSelect) {
      modeSelect.value = settings.injectMode;
    }

    const preset = PERSONA_PRESETS.find((p) => p.id === settings.activePreset);
    if (presetBadge && preset) {
      presetBadge.textContent = preset.badge;
    }
  });

  // Input listener for char count
  personaInput?.addEventListener("input", (e) => {
    updateCharCount(e.target.value);
  });

  // Preset switch
  presetSelect?.addEventListener("change", (e) => {
    const pId = e.target.value;
    const preset = PERSONA_PRESETS.find((p) => p.id === pId);
    if (preset && preset.id !== "custom") {
      personaInput.value = preset.text;
      updateCharCount(preset.text);
      if (presetBadge) presetBadge.textContent = preset.badge;
    } else if (presetBadge) {
      presetBadge.textContent = "Custom";
    }
  });

  // Reset to default
  btnReset?.addEventListener("click", () => {
    personaInput.value = PERSONA_PRESETS[0].text;
    presetSelect.value = PERSONA_PRESETS[0].id;
    if (presetBadge) presetBadge.textContent = PERSONA_PRESETS[0].badge;
    updateCharCount(personaInput.value);
    showStatus("Reset to default Systems Architect persona.", "info");
  });

  // Direct Inject Action
  btnInject?.addEventListener("click", async () => {
    if (!currentPersonaEnabled) {
      showStatus(
        "Persona injection is currently toggled OFF. Enable it via the switch above to inject.",
        "error",
      );
      return;
    }

    btnInject.disabled = true;
    showStatus("Injecting Master Persona into active AI tab...", "info");

    const result = await injectPersonaIntoActiveTab(modeSelect?.value);
    btnInject.disabled = false;

    if (result.success) {
      showStatus("✓ Injected Master Persona into active AI prompt!", "success");
    } else {
      showStatus(result.error || "Could not inject. Ensure you are on an active AI tab.", "error");
    }
  });

  // Copy Action
  btnCopy?.addEventListener("click", () => {
    navigator.clipboard.writeText(personaInput?.value || "");
    showStatus("✓ Persona context copied to clipboard.", "success");
  });

  // Export Persona as JSON File
  btnExportJson?.addEventListener("click", () => {
    const personaText = personaInput?.value || "";
    const activePreset = presetSelect?.value || "custom";
    const activePresetObj = PERSONA_PRESETS.find((p) => p.id === activePreset);
    const autoInjectEnabled = Boolean(autoInjectCheckbox?.checked);
    const injectMode = modeSelect?.value || "prepend";

    const configData = {
      $schema: "https://selfmaximizer.internal/schemas/persona-v1.json",
      format: "selfmax-persona-config",
      version: "1.0",
      exported_at: new Date().toISOString(),
      persona: {
        id: activePreset,
        name: activePresetObj ? activePresetObj.name : "Custom Persona",
        badge: activePresetObj?.badge || "Custom",
        master_persona: personaText,
        persona_injection_enabled: currentPersonaEnabled,
        auto_inject_enabled: autoInjectEnabled,
        inject_mode: injectMode,
      },
      compatibility: {
        target_models: ["ChatGPT", "Claude", "Gemini", "AI Studio"],
        keyboard_shortcut: "Alt+P",
        extension_version: "1.2.2",
      },
    };

    const blob = new Blob([JSON.stringify(configData, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `selfmax-persona-${activePreset || "config"}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showStatus("✓ Exported persona configuration as JSON.", "success");
  });

  // Import Persona from JSON helper
  async function handleJsonImport(jsonString, sourceName) {
    try {
      const data = JSON.parse(jsonString);

      let extractedText = "";
      if (typeof data.persona === "string" && data.persona.trim()) {
        extractedText = data.persona.trim();
      } else if (data.persona && typeof data.persona === "object") {
        extractedText =
          data.persona.master_persona ||
          data.persona.text ||
          data.persona.content ||
          data.persona.personaText ||
          "";
      }

      if (!extractedText) {
        extractedText =
          data.master_persona ||
          data.smx_master_persona ||
          data.personaText ||
          data.text ||
          data.content ||
          "";
      }

      if (!extractedText || typeof extractedText !== "string" || !extractedText.trim()) {
        showStatus("Invalid JSON: Missing 'master_persona' or 'text' property.", "error");
        return;
      }

      const cleanText = extractedText.trim();
      if (personaInput) {
        personaInput.value = cleanText;
        updateCharCount(cleanText);
      }

      let personaEnabled = currentPersonaEnabled;
      if (typeof data.persona?.persona_injection_enabled === "boolean") {
        personaEnabled = data.persona.persona_injection_enabled;
      } else if (typeof data.persona_injection_enabled === "boolean") {
        personaEnabled = data.persona_injection_enabled;
      } else if (typeof data.global_persona_enabled === "boolean") {
        personaEnabled = data.global_persona_enabled;
      }
      updatePersonaSyncBox(personaEnabled);

      let autoInject = true;
      if (typeof data.persona?.auto_inject_enabled === "boolean") {
        autoInject = data.persona.auto_inject_enabled;
      } else if (typeof data.auto_inject_enabled === "boolean") {
        autoInject = data.auto_inject_enabled;
      } else if (typeof data.auto_inject === "boolean") {
        autoInject = data.auto_inject;
      }
      if (autoInjectCheckbox) autoInjectCheckbox.checked = autoInject;

      let injectMode = "prepend";
      const rawMode = data.persona?.inject_mode || data.inject_mode;
      if (rawMode === "prepend" || rawMode === "append" || rawMode === "replace") {
        injectMode = rawMode;
        if (modeSelect) modeSelect.value = injectMode;
      }

      const importedPresetId = data.persona?.id || data.preset || data.id;
      const matchedPreset = PERSONA_PRESETS.find((p) => p.id === importedPresetId);
      const nextPresetId = matchedPreset ? matchedPreset.id : "custom";
      if (presetSelect) presetSelect.value = nextPresetId;
      if (presetBadge) presetBadge.textContent = matchedPreset ? matchedPreset.badge : "Custom";

      // Save immediately to local storage
      await saveMasterPersonaSettings({
        personaText: cleanText,
        personaEnabled,
        autoInjectEnabled: autoInject,
        activePreset: nextPresetId,
        injectMode,
      });

      showStatus(`✓ Imported "${sourceName}" and saved to storage.`, "success");
    } catch (err) {
      showStatus(`Import failed: ${err.message}`, "error");
    }
  }

  // Import Action Trigger
  btnImportJson?.addEventListener("click", () => {
    fileInput?.click();
  });

  fileInput?.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === "string") {
        handleJsonImport(content, file.name);
      }
    };
    reader.onerror = () => {
      showStatus("Error reading JSON file.", "error");
    };
    reader.readAsText(file);
    fileInput.value = "";
  });

  // Drag and Drop onto Persona Textarea
  personaInput?.addEventListener("dragover", (e) => {
    e.preventDefault();
    personaInput.style.borderColor = "var(--coral)";
  });

  personaInput?.addEventListener("dragleave", () => {
    personaInput.style.borderColor = "";
  });

  personaInput?.addEventListener("drop", (e) => {
    e.preventDefault();
    personaInput.style.borderColor = "";
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === "string") {
        handleJsonImport(content, file.name);
      }
    };
    reader.readAsText(file);
  });

  // Save Action
  btnSave?.addEventListener("click", async () => {
    btnSave.disabled = true;
    btnSave.textContent = "Saving...";

    const personaText = personaInput?.value || "";
    const autoInjectEnabled = Boolean(autoInjectCheckbox?.checked);
    const activePreset = presetSelect?.value || "custom";
    const injectMode = modeSelect?.value || "prepend";

    const res = await saveMasterPersonaSettings({
      personaText,
      personaEnabled: currentPersonaEnabled,
      autoInjectEnabled,
      activePreset,
      injectMode,
    });

    btnSave.disabled = false;
    btnSave.textContent = "💾 Save Persona";
    showStatus(res.message, "success");
  });
}
