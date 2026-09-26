// SelfMax Capsule Assistant — Popup Script (ES Module)
// Client-Side BYOK Engine & DOM Automation Tool-Calling
import { AGENT_TEMPLATES } from "./templates.js";
import { initProviderKeysComponent } from "./provider-keys.js";
import { initPersonaComponent } from "./persona-manager.js";

const APP_ORIGIN_KEY = "smx_app_origin";
const BYOK_PROVIDER_KEY = "smx_byok_provider";
const KEY_GEMINI = "smx_key_gemini";
const KEY_OPENAI = "smx_key_openai";
const KEY_ANTHROPIC = "smx_key_anthropic";
const KEY_OPENROUTER = "smx_key_openrouter";
const CUSTOM_ENDPOINT_KEY = "smx_custom_endpoint";
const CUSTOM_MODEL_KEY = "smx_custom_model";
const LOCAL_ENDPOINT_KEY = "smx_local_endpoint";

const AUTOSAVE_DRAFT_KEY = "smx_autosave_draft_text";
const AUTOSAVE_NOTE_TITLE_KEY = "smx_autosave_note_title";
const AUTOSAVE_NOTE_BODY_KEY = "smx_autosave_note_body";
const SAVED_NOTES_KEY = "smx_saved_local_notes";
const SELECTED_TEMPLATE_ID_KEY = "smx_selected_template_id";
const PERSONA_ENABLED_KEY = "persona_injection_enabled";
const GLOBAL_PERSONA_ENABLED_KEY = "global_persona_enabled";

// DOM Elements — Header & Global Toggle
const sessionBadge = document.getElementById("session-badge");
const globalPersonaBanner = document.getElementById("global-persona-banner");
const globalPersonaToggle = document.getElementById("global-persona-toggle");
const globalPersonaIcon = document.getElementById("global-persona-icon");
const globalPersonaPill = document.getElementById("global-persona-pill");
const globalPersonaStatus = document.getElementById("global-persona-status");

// Tab 1: Agent & DOM Tool Elements
const templateSelect = document.getElementById("template-select");
const templateBadge = document.getElementById("template-badge");
const draftInput = document.getElementById("draft-input");
const btnSnapActiveTab = document.getElementById("btn-snap-active-tab");
const btnPaste = document.getElementById("btn-paste");
const btnRunAgent = document.getElementById("btn-run-agent");
const btnRunDomAgent = document.getElementById("btn-run-dom-agent");
const btnSms = document.getElementById("btn-sms");
const autosaveIndicator = document.getElementById("autosave-indicator");
const draftCharCount = document.getElementById("draft-char-count");
const aiStatus = document.getElementById("ai-status");
const resultContainer = document.getElementById("result-container");
const resultText = document.getElementById("result-text");
const charCount = document.getElementById("char-count");
const btnCopy = document.getElementById("btn-copy");
const btnExportResultMd = document.getElementById("btn-export-result-md");
const btnSaveToNotes = document.getElementById("btn-save-to-notes");

// DOM Tool Confirmation Elements
const domToolProposal = document.getElementById("dom-tool-proposal");
const toolNameBadge = document.getElementById("tool-name-badge");
const toolRationaleText = document.getElementById("tool-rationale-text");
const toolDetailsText = document.getElementById("tool-details-text");
const btnConfirmExecuteTool = document.getElementById("btn-confirm-execute-tool");
const btnCancelTool = document.getElementById("btn-cancel-tool");

// Tab 2: Scraper Elements
const btnScrapeNow = document.getElementById("btn-scrape-now");
const scrapedMeta = document.getElementById("scraped-meta");
const scrapedTitle = document.getElementById("scraped-title");
const scrapedUrl = document.getElementById("scraped-url");
const scrapedContent = document.getElementById("scraped-content");
const btnCopyScraped = document.getElementById("btn-copy-scraped");
const btnAnalyzeScraped = document.getElementById("btn-analyze-scraped");
const btnExportScrapedMd = document.getElementById("btn-export-scraped-md");
const scraperStatus = document.getElementById("scraper-status");

// Tab 3: Notes Elements
const noteTitleInput = document.getElementById("note-title-input");
const noteBodyInput = document.getElementById("note-body-input");
const notesAutosaveIndicator = document.getElementById("notes-autosave-indicator");
const btnClearNote = document.getElementById("btn-clear-note");
const btnSaveNoteItem = document.getElementById("btn-save-note-item");
const btnExportNotesMd = document.getElementById("btn-export-notes-md");
const savedNotesCount = document.getElementById("saved-notes-count");
const savedNotesList = document.getElementById("saved-notes-list");

// Tab 5: Settings Elements
const saveSettingsBtn = document.getElementById("save-settings");
const settingsStatus = document.getElementById("settings-status");
const appOriginInput = document.getElementById("app-origin");

// Active In-Memory State
let activeProposedTool = null;
let activeScrapedData = { title: "", url: "", text: "" };

// 1. Tab Navigation
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach((c) => c.classList.remove("active"));

    btn.classList.add("active");
    const target = document.getElementById(btn.dataset.tab);
    if (target) target.classList.add("active");
  });
});

// Helper: Download text as Markdown (.md)
function downloadMarkdown(filename, content) {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// 2. Initialize
function updateGlobalPersonaToggleUI(isEnabled) {
  if (globalPersonaToggle) {
    globalPersonaToggle.checked = Boolean(isEnabled);
  }
  if (globalPersonaBanner) {
    if (isEnabled) {
      globalPersonaBanner.classList.remove("disabled");
      if (globalPersonaIcon) globalPersonaIcon.textContent = "⚡";
      if (globalPersonaPill) {
        globalPersonaPill.textContent = "ACTIVE";
        globalPersonaPill.className = "badge-mini badge-active";
      }
      if (globalPersonaStatus) {
        globalPersonaStatus.textContent = "Injects into ChatGPT, Claude, Gemini & AI Studio";
      }
    } else {
      globalPersonaBanner.classList.add("disabled");
      if (globalPersonaIcon) globalPersonaIcon.textContent = "⏸️";
      if (globalPersonaPill) {
        globalPersonaPill.textContent = "PAUSED";
        globalPersonaPill.className = "badge-mini badge-disabled";
      }
      if (globalPersonaStatus) {
        globalPersonaStatus.textContent = "Disabled (Saved persona text preserved)";
      }
    }
  }
}

async function initGlobalPersonaToggle() {
  const store = await chrome.storage.local.get([PERSONA_ENABLED_KEY, GLOBAL_PERSONA_ENABLED_KEY]);
  const isEnabled =
    store[PERSONA_ENABLED_KEY] !== false && store[GLOBAL_PERSONA_ENABLED_KEY] !== false;
  updateGlobalPersonaToggleUI(isEnabled);

  globalPersonaToggle?.addEventListener("change", (e) => {
    const checked = e.target.checked;
    chrome.storage.local.set(
      {
        [PERSONA_ENABLED_KEY]: checked,
        [GLOBAL_PERSONA_ENABLED_KEY]: checked,
      },
      () => {
        updateGlobalPersonaToggleUI(checked);
      },
    );
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && (changes[PERSONA_ENABLED_KEY] || changes[GLOBAL_PERSONA_ENABLED_KEY])) {
      const newVal =
        changes[PERSONA_ENABLED_KEY]?.newValue ?? changes[GLOBAL_PERSONA_ENABLED_KEY]?.newValue;
      if (typeof newVal === "boolean") {
        updateGlobalPersonaToggleUI(newVal);
      }
    }
  });
}

async function init() {
  await initGlobalPersonaToggle();
  renderTemplateSelector();
  const personaContainer = document.getElementById("persona-manager-container");
  if (personaContainer) {
    initPersonaComponent(personaContainer);
  }
  const providerKeysContainer = document.getElementById("provider-keys-container");
  if (providerKeysContainer) {
    initProviderKeysComponent(providerKeysContainer, () => checkSessionStatus());
  }
  await checkSessionStatus();
  await restoreAutoSavedDraft();
  await restoreAutoSavedNote();
  await renderSavedNotesList();
  await loadAppSettings();
  setupEventHandlers();
}

// 3. BYOK Session Status Check
async function checkSessionStatus() {
  chrome.runtime.sendMessage({ action: "CHECK_SESSION" }, (res) => {
    if (!sessionBadge) return;
    if (res?.ready) {
      sessionBadge.textContent = `● ${res.name}`;
      sessionBadge.className = "badge online";
    } else {
      sessionBadge.textContent = "○ Add API Key";
      sessionBadge.className = "badge offline";
      sessionBadge.onclick = () => {
        document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
        document.querySelectorAll(".tab-content").forEach((c) => c.classList.remove("active"));
        const tabBtn = document.querySelector('[data-tab="tab-byok"]');
        const tabPane = document.getElementById("tab-byok");
        if (tabBtn) tabBtn.classList.add("active");
        if (tabPane) tabPane.classList.add("active");
      };
    }
  });
}

// 4. Template Selector
function renderTemplateSelector() {
  if (!templateSelect) return;
  templateSelect.innerHTML = "";
  AGENT_TEMPLATES.forEach((tpl) => {
    const opt = document.createElement("option");
    opt.value = tpl.id;
    opt.textContent = `${tpl.icon} ${tpl.name}`;
    templateSelect.appendChild(opt);
  });

  chrome.storage.local.get([SELECTED_TEMPLATE_ID_KEY], (res) => {
    const savedId = res[SELECTED_TEMPLATE_ID_KEY];
    if (savedId && AGENT_TEMPLATES.some((t) => t.id === savedId)) {
      templateSelect.value = savedId;
      updateTemplateBadge(savedId);
    } else {
      updateTemplateBadge(AGENT_TEMPLATES[0].id);
    }
  });

  templateSelect.addEventListener("change", (e) => {
    const tplId = e.target.value;
    chrome.storage.local.set({ [SELECTED_TEMPLATE_ID_KEY]: tplId });
    updateTemplateBadge(tplId);
  });
}

function updateTemplateBadge(tplId) {
  const tpl = AGENT_TEMPLATES.find((t) => t.id === tplId);
  if (tpl && templateBadge) {
    templateBadge.textContent = tpl.strategyBadge || "⚡ Check";
    if (!draftInput.value.trim() && tpl.defaultPlaceholder) {
      draftInput.placeholder = tpl.defaultPlaceholder;
    }
  }
}

// 5. DOM Tool-Calling Agent Loop
async function runDomAgentCheck() {
  const goal = draftInput?.value?.trim();
  if (!goal) {
    showStatus(aiStatus, "Please enter a context or goal first.", "error");
    return;
  }

  showStatus(aiStatus, "🤖 Analyzing active page context & interactive DOM...", "info");
  domToolProposal?.classList.add("hidden");

  chrome.runtime.sendMessage({ action: "RUN_PAGE_AGENT", goal }, (res) => {
    if (chrome.runtime.lastError) {
      showStatus(aiStatus, `Agent error: ${chrome.runtime.lastError.message}`, "error");
      return;
    }

    if (!res?.success) {
      showStatus(aiStatus, `Agent failed: ${res?.error || "Unknown error"}`, "error");
      return;
    }

    // Display model explanation/takeaways
    if (resultText) resultText.value = res.rawOutput;
    resultContainer?.classList.remove("hidden");
    updateCharCount(resultText, charCount);

    if (res.parsedTool && res.parsedTool.tool && res.parsedTool.tool !== "none") {
      activeProposedTool = res.parsedTool;
      if (toolNameBadge) toolNameBadge.textContent = res.parsedTool.tool;
      if (toolRationaleText)
        toolRationaleText.textContent =
          res.parsedTool.rationale || "Automated interaction on active webpage.";
      if (toolDetailsText) {
        toolDetailsText.textContent = JSON.stringify(res.parsedTool.params, null, 2);
      }
      domToolProposal?.classList.remove("hidden");
      showStatus(aiStatus, "✓ Page action proposed — confirm execution below.", "success");
    } else {
      activeProposedTool = null;
      domToolProposal?.classList.add("hidden");
      showStatus(aiStatus, "✓ Analysis complete (no DOM action needed).", "success");
    }
  });
}

async function executeProposedDomTool() {
  if (!activeProposedTool) return;
  showStatus(aiStatus, `Executing ${activeProposedTool.tool} on active page...`, "info");

  chrome.runtime.sendMessage(
    {
      action: "EXECUTE_DOM_TOOL",
      tool: activeProposedTool.tool,
      params: activeProposedTool.params,
    },
    (res) => {
      if (chrome.runtime.lastError || !res?.success) {
        showStatus(
          aiStatus,
          `DOM tool error: ${res?.error || chrome.runtime.lastError?.message}`,
          "error",
        );
      } else {
        showStatus(aiStatus, `✓ Executed ${activeProposedTool.tool} successfully!`, "success");
        domToolProposal?.classList.add("hidden");
        activeProposedTool = null;
      }
    },
  );
}

// 6. Standard Agent Check & SMS
async function runAgentCheck() {
  const userText = draftInput?.value?.trim();
  if (!userText) {
    showStatus(aiStatus, "Enter context or click 'Grab Tab Text' first.", "error");
    return;
  }

  const selectedTplId = templateSelect?.value;
  const tpl = AGENT_TEMPLATES.find((t) => t.id === selectedTplId) || AGENT_TEMPLATES[0];
  const fullPrompt = `${tpl.systemPrompt}\n\nUSER INPUT / CONTEXT:\n${userText}`;

  showStatus(aiStatus, "Running BYOK check...", "info");
  chrome.runtime.sendMessage({ action: "GENERATE_DRAFT", prompt: fullPrompt }, (res) => {
    if (chrome.runtime.lastError || !res?.success) {
      showStatus(aiStatus, `Error: ${res?.error || chrome.runtime.lastError?.message}`, "error");
      return;
    }

    if (resultText) resultText.value = res.text;
    resultContainer?.classList.remove("hidden");
    updateCharCount(resultText, charCount);
    showStatus(aiStatus, "✓ Check complete.", "success");
  });
}

async function runSmsConversion() {
  const userText = draftInput?.value?.trim();
  if (!userText) {
    showStatus(aiStatus, "Enter context or draft text first.", "error");
    return;
  }

  const prompt = `Condense the following text into an actionable SMS text under 160 characters. Do not wrap in quotes or add preamble:\n\n${userText}`;
  showStatus(aiStatus, "Generating 160-char SMS...", "info");

  chrome.runtime.sendMessage({ action: "GENERATE_DRAFT", prompt }, (res) => {
    if (chrome.runtime.lastError || !res?.success) {
      showStatus(aiStatus, `Error: ${res?.error || chrome.runtime.lastError?.message}`, "error");
      return;
    }

    if (resultText) resultText.value = res.text;
    resultContainer?.classList.remove("hidden");
    updateCharCount(resultText, charCount);
    showStatus(aiStatus, "✓ SMS generated under 160 chars.", "success");
  });
}

// 7. Active Tab Snap & Scraper
async function snapActiveTabText() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    showStatus(aiStatus, "No active tab found.", "error");
    return;
  }

  chrome.scripting.executeScript(
    {
      target: { tabId: tab.id },
      func: () =>
        window.getSelection()?.toString() || (document.body?.innerText || "").slice(0, 15000),
    },
    ([{ result } = {}]) => {
      if (result) {
        draftInput.value = result;
        updateCharCount(draftInput, draftCharCount);
        saveDraftDebounced();
        showStatus(aiStatus, `Snapped ${result.length} characters from tab.`, "success");
      } else {
        showStatus(aiStatus, "No readable text on this tab.", "error");
      }
    },
  );
}

async function scrapeTab() {
  showStatus(scraperStatus, "Scraping active tab DOM...", "info");
  chrome.runtime.sendMessage({ action: "EXECUTE_DOM_TOOL", tool: "extract_context" }, (res) => {
    if (chrome.runtime.lastError || !res?.success) {
      showStatus(
        scraperStatus,
        `Scrape error: ${res?.error || chrome.runtime.lastError?.message}`,
        "error",
      );
      return;
    }

    const data = res.result;
    activeScrapedData = {
      title: data.title,
      url: data.url,
      text: data.bodySnippet,
    };

    if (scrapedTitle) scrapedTitle.textContent = data.title || "Untitled Webpage";
    if (scrapedUrl) scrapedUrl.textContent = data.url;
    scrapedMeta?.classList.remove("hidden");

    let formatted = `# ${data.title}\nSource: ${data.url}\n\n## Headings\n${data.headings.join("\n")}\n\n## Body Content\n${data.bodySnippet}`;
    if (scrapedContent) scrapedContent.value = formatted;
    showStatus(scraperStatus, "✓ Page content extracted successfully.", "success");
  });
}

// 8. Auto-Save & Notes Manager
let draftTimeout = null;
function saveDraftDebounced() {
  clearTimeout(draftTimeout);
  if (autosaveIndicator) autosaveIndicator.textContent = "● Saving...";
  draftTimeout = setTimeout(() => {
    chrome.storage.local.set({ [AUTOSAVE_DRAFT_KEY]: draftInput.value }, () => {
      if (autosaveIndicator) autosaveIndicator.textContent = "● Auto-saved locally";
    });
  }, 400);
}

let noteTimeout = null;
function saveNoteDraftDebounced() {
  clearTimeout(noteTimeout);
  if (notesAutosaveIndicator) notesAutosaveIndicator.textContent = "● Saving...";
  noteTimeout = setTimeout(() => {
    chrome.storage.local.set(
      {
        [AUTOSAVE_NOTE_TITLE_KEY]: noteTitleInput.value,
        [AUTOSAVE_NOTE_BODY_KEY]: noteBodyInput.value,
      },
      () => {
        if (notesAutosaveIndicator) notesAutosaveIndicator.textContent = "● Auto-saved locally";
      },
    );
  }, 400);
}

async function restoreAutoSavedDraft() {
  const store = await chrome.storage.local.get([AUTOSAVE_DRAFT_KEY]);
  if (store[AUTOSAVE_DRAFT_KEY] && draftInput) {
    draftInput.value = store[AUTOSAVE_DRAFT_KEY];
    updateCharCount(draftInput, draftCharCount);
  }
}

async function restoreAutoSavedNote() {
  const store = await chrome.storage.local.get([AUTOSAVE_NOTE_TITLE_KEY, AUTOSAVE_NOTE_BODY_KEY]);
  if (store[AUTOSAVE_NOTE_TITLE_KEY] && noteTitleInput) {
    noteTitleInput.value = store[AUTOSAVE_NOTE_TITLE_KEY];
  }
  if (store[AUTOSAVE_NOTE_BODY_KEY] && noteBodyInput) {
    noteBodyInput.value = store[AUTOSAVE_NOTE_BODY_KEY];
  }
}

async function saveNoteItem() {
  const title = noteTitleInput?.value?.trim() || "Untitled Note";
  const body = noteBodyInput?.value?.trim();
  if (!body) return;

  const store = await chrome.storage.local.get([SAVED_NOTES_KEY]);
  const notes = store[SAVED_NOTES_KEY] || [];
  const newNote = {
    id: `note-${Date.now()}`,
    title,
    body,
    createdAt: new Date().toISOString(),
  };

  notes.unshift(newNote);
  await chrome.storage.local.set({ [SAVED_NOTES_KEY]: notes });
  await renderSavedNotesList();

  noteTitleInput.value = "";
  noteBodyInput.value = "";
  chrome.storage.local.remove([AUTOSAVE_NOTE_TITLE_KEY, AUTOSAVE_NOTE_BODY_KEY]);
}

async function renderSavedNotesList() {
  const store = await chrome.storage.local.get([SAVED_NOTES_KEY]);
  const notes = store[SAVED_NOTES_KEY] || [];

  if (savedNotesCount) savedNotesCount.textContent = notes.length;
  if (!savedNotesList) return;

  if (notes.length === 0) {
    savedNotesList.innerHTML = `<div class="empty-notes-hint">No saved notes yet. Notes auto-save locally.</div>`;
    return;
  }

  savedNotesList.innerHTML = "";
  notes.forEach((note) => {
    const card = document.createElement("div");
    card.className = "note-item-card";
    card.innerHTML = `
      <div class="note-item-header">
        <strong>${escapeHtml(note.title)}</strong>
        <span class="note-time">${new Date(note.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
      </div>
      <div class="note-item-body">${escapeHtml(note.body.slice(0, 120))}${note.body.length > 120 ? "..." : ""}</div>
      <div class="note-item-footer">
        <button class="text-link btn-export-single-md" data-id="${note.id}">📥 .md</button>
        <button class="text-link btn-copy-single" data-id="${note.id}">📋 Copy</button>
        <button class="text-link btn-delete-single text-error" data-id="${note.id}">🗑 Delete</button>
      </div>
    `;
    savedNotesList.appendChild(card);
  });

  savedNotesList.querySelectorAll(".btn-export-single-md").forEach((btn) => {
    btn.addEventListener("click", () => {
      const note = notes.find((n) => n.id === btn.dataset.id);
      if (note)
        downloadMarkdown(`${sanitizeFilename(note.title)}.md`, `# ${note.title}\n\n${note.body}`);
    });
  });

  savedNotesList.querySelectorAll(".btn-copy-single").forEach((btn) => {
    btn.addEventListener("click", () => {
      const note = notes.find((n) => n.id === btn.dataset.id);
      if (note) navigator.clipboard.writeText(`${note.title}\n\n${note.body}`);
    });
  });

  savedNotesList.querySelectorAll(".btn-delete-single").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const updated = notes.filter((n) => n.id !== btn.dataset.id);
      await chrome.storage.local.set({ [SAVED_NOTES_KEY]: updated });
      renderSavedNotesList();
    });
  });
}

// 9. App Settings
async function loadAppSettings() {
  const store = await chrome.storage.local.get([APP_ORIGIN_KEY]);
  if (appOriginInput) appOriginInput.value = store[APP_ORIGIN_KEY] || "https://circlesapp.co";
}

async function saveAppSettings() {
  const origin = appOriginInput?.value?.trim() || "https://circlesapp.co";
  await chrome.storage.local.set({ [APP_ORIGIN_KEY]: origin });
  showStatus(settingsStatus, "✓ Settings saved.", "success");
}

// Helpers
function showStatus(el, text, type) {
  if (!el) return;
  el.textContent = text;
  el.className = `status-msg ${type}`;
  if (type === "success" || type === "error") {
    setTimeout(() => {
      if (el.textContent === text) el.textContent = "";
    }, 4000);
  }
}

function updateCharCount(input, countEl) {
  if (!countEl || !input) return;
  countEl.textContent = `${input.value.length} chars`;
}

function sanitizeFilename(name) {
  return name
    .replace(/[^a-z0-9_-]/gi, "_")
    .toLowerCase()
    .slice(0, 30);
}

function escapeHtml(str) {
  return str.replace(
    /[&<>"']/g,
    (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[m],
  );
}

function setupEventHandlers() {
  draftInput?.addEventListener("input", () => {
    updateCharCount(draftInput, draftCharCount);
    saveDraftDebounced();
  });

  noteTitleInput?.addEventListener("input", saveNoteDraftDebounced);
  noteBodyInput?.addEventListener("input", saveNoteDraftDebounced);

  btnSnapActiveTab?.addEventListener("click", snapActiveTabText);
  btnPaste?.addEventListener("click", async () => {
    const text = await navigator.clipboard.readText();
    if (text) {
      draftInput.value = text;
      updateCharCount(draftInput, draftCharCount);
      saveDraftDebounced();
    }
  });

  btnRunAgent?.addEventListener("click", runAgentCheck);
  btnRunDomAgent?.addEventListener("click", runDomAgentCheck);
  btnConfirmExecuteTool?.addEventListener("click", executeProposedDomTool);
  btnCancelTool?.addEventListener("click", () => {
    activeProposedTool = null;
    domToolProposal?.classList.add("hidden");
  });

  btnSms?.addEventListener("click", runSmsConversion);

  btnCopy?.addEventListener("click", () => {
    navigator.clipboard.writeText(resultText?.value || "");
    showStatus(aiStatus, "✓ Copied to clipboard.", "success");
  });

  btnExportResultMd?.addEventListener("click", () => {
    const text = resultText?.value || "";
    downloadMarkdown("agent-check.md", text);
  });

  btnSaveToNotes?.addEventListener("click", async () => {
    const text = resultText?.value || "";
    if (!text) return;
    const store = await chrome.storage.local.get([SAVED_NOTES_KEY]);
    const notes = store[SAVED_NOTES_KEY] || [];
    notes.unshift({
      id: `note-${Date.now()}`,
      title: "Agent Takeaways",
      body: text,
      createdAt: new Date().toISOString(),
    });
    await chrome.storage.local.set({ [SAVED_NOTES_KEY]: notes });
    renderSavedNotesList();
    showStatus(aiStatus, "✓ Saved directly into Notes tab.", "success");
  });

  // Scraper Actions
  btnScrapeNow?.addEventListener("click", scrapeTab);
  btnCopyScraped?.addEventListener("click", () => {
    navigator.clipboard.writeText(scrapedContent?.value || "");
    showStatus(scraperStatus, "✓ Copied scraped text.", "success");
  });
  btnAnalyzeScraped?.addEventListener("click", () => {
    if (scrapedContent?.value && draftInput) {
      draftInput.value = scrapedContent.value;
      updateCharCount(draftInput, draftCharCount);
      saveDraftDebounced();
      document.querySelector('[data-tab="tab-agent"]')?.click();
      runAgentCheck();
    }
  });
  btnExportScrapedMd?.addEventListener("click", () => {
    const content = scrapedContent?.value || "";
    downloadMarkdown(`${sanitizeFilename(activeScrapedData.title || "scraped-page")}.md`, content);
  });

  // Notes Actions
  btnClearNote?.addEventListener("click", () => {
    noteTitleInput.value = "";
    noteBodyInput.value = "";
    chrome.storage.local.remove([AUTOSAVE_NOTE_TITLE_KEY, AUTOSAVE_NOTE_BODY_KEY]);
  });
  btnSaveNoteItem?.addEventListener("click", saveNoteItem);
  btnExportNotesMd?.addEventListener("click", async () => {
    const store = await chrome.storage.local.get([SAVED_NOTES_KEY]);
    const notes = store[SAVED_NOTES_KEY] || [];
    const md = notes
      .map((n) => `## ${n.title}\n*Saved: ${n.createdAt}*\n\n${n.body}`)
      .join("\n\n---\n\n");
    downloadMarkdown("selfmax-all-notes.md", md || "# SelfMax Notes\n(No saved notes)");
  });

  // Settings Actions
  saveSettingsBtn?.addEventListener("click", saveAppSettings);
}

// Start
document.addEventListener("DOMContentLoaded", init);
