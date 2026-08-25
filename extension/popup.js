// SelfMax Capsule Assistant — Popup Script (ES Module)
import { AGENT_TEMPLATES } from "./templates.js";

const APP_ORIGIN_KEY = "smx_app_origin";
const AI_MODE_KEY = "smx_ai_mode";
const LOCAL_ENDPOINT_KEY = "smx_local_endpoint";
const BYOK_KEY_KEY = "smx_byok_key";
const BYOK_ENDPOINT_KEY = "smx_byok_endpoint";
const AUTOSAVE_DRAFT_KEY = "smx_autosave_draft_text";
const AUTOSAVE_NOTE_TITLE_KEY = "smx_autosave_note_title";
const AUTOSAVE_NOTE_BODY_KEY = "smx_autosave_note_body";
const SAVED_NOTES_KEY = "smx_saved_local_notes";
const SELECTED_TEMPLATE_ID_KEY = "smx_selected_template_id";

// DOM Elements
const sessionBadge = document.getElementById("session-badge");
const templateSelect = document.getElementById("template-select");
const templateBadge = document.getElementById("template-badge");
const draftInput = document.getElementById("draft-input");
const btnSnapActiveTab = document.getElementById("btn-snap-active-tab");
const btnPaste = document.getElementById("btn-paste");
const btnRunAgent = document.getElementById("btn-run-agent");
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

// Scraper Elements
const btnScrapeNow = document.getElementById("btn-scrape-now");
const scrapedMeta = document.getElementById("scraped-meta");
const scrapedTitle = document.getElementById("scraped-title");
const scrapedUrl = document.getElementById("scraped-url");
const scrapedContent = document.getElementById("scraped-content");
const btnCopyScraped = document.getElementById("btn-copy-scraped");
const btnAnalyzeScraped = document.getElementById("btn-analyze-scraped");
const btnExportScrapedMd = document.getElementById("btn-export-scraped-md");
const scraperStatus = document.getElementById("scraper-status");

// Notes Elements
const noteTitleInput = document.getElementById("note-title-input");
const noteBodyInput = document.getElementById("note-body-input");
const notesAutosaveIndicator = document.getElementById("notes-autosave-indicator");
const btnClearNote = document.getElementById("btn-clear-note");
const btnSaveNoteItem = document.getElementById("btn-save-note-item");
const btnExportNotesMd = document.getElementById("btn-export-notes-md");
const savedNotesCount = document.getElementById("saved-notes-count");
const savedNotesList = document.getElementById("saved-notes-list");

// Settings Elements
const saveSettingsBtn = document.getElementById("save-settings");
const settingsStatus = document.getElementById("settings-status");
const appOriginInput = document.getElementById("app-origin");
const localEndpointInput = document.getElementById("local-endpoint");
const byokKeyInput = document.getElementById("byok-key");
const byokEndpointInput = document.getElementById("byok-endpoint");
const localConfigPane = document.getElementById("local-config");
const byokConfigPane = document.getElementById("byok-config");

let activeScrapedData = {
  title: "",
  url: "",
  text: "",
};

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
async function init() {
  // Populate templates dropdown
  renderTemplateSelector();

  // Load storage
  const storage = await chrome.storage.local.get([
    APP_ORIGIN_KEY,
    AI_MODE_KEY,
    LOCAL_ENDPOINT_KEY,
    BYOK_KEY_KEY,
    BYOK_ENDPOINT_KEY,
    AUTOSAVE_DRAFT_KEY,
    AUTOSAVE_NOTE_TITLE_KEY,
    AUTOSAVE_NOTE_BODY_KEY,
    SAVED_NOTES_KEY,
    SELECTED_TEMPLATE_ID_KEY,
  ]);

  if (storage[APP_ORIGIN_KEY]) appOriginInput.value = storage[APP_ORIGIN_KEY];
  if (storage[LOCAL_ENDPOINT_KEY]) localEndpointInput.value = storage[LOCAL_ENDPOINT_KEY];
  if (storage[BYOK_KEY_KEY]) byokKeyInput.value = storage[BYOK_KEY_KEY];
  if (storage[BYOK_ENDPOINT_KEY]) byokEndpointInput.value = storage[BYOK_ENDPOINT_KEY];

  // Restore autosaved draft
  if (storage[AUTOSAVE_DRAFT_KEY]) {
    draftInput.value = storage[AUTOSAVE_DRAFT_KEY];
    updateDraftCharCount();
  }

  // Restore autosaved notes
  if (storage[AUTOSAVE_NOTE_TITLE_KEY]) noteTitleInput.value = storage[AUTOSAVE_NOTE_TITLE_KEY];
  if (storage[AUTOSAVE_NOTE_BODY_KEY]) noteBodyInput.value = storage[AUTOSAVE_NOTE_BODY_KEY];

  // Restore selected template
  if (storage[SELECTED_TEMPLATE_ID_KEY]) {
    templateSelect.value = storage[SELECTED_TEMPLATE_ID_KEY];
    updateTemplateBadge(storage[SELECTED_TEMPLATE_ID_KEY]);
  }

  // Render stored notes
  renderSavedNotes(storage[SAVED_NOTES_KEY] || []);

  const currentMode = storage[AI_MODE_KEY] || "webchat";
  const radio = document.querySelector(`input[name="ai_mode"][value="${currentMode}"]`);
  if (radio) radio.checked = true;
  updateConfigPanes(currentMode);

  // Check ChatGPT Session
  checkSessionStatus();
}

function renderTemplateSelector() {
  templateSelect.innerHTML = "";
  AGENT_TEMPLATES.forEach((tmpl) => {
    const opt = document.createElement("option");
    opt.value = tmpl.id;
    opt.textContent = `${tmpl.badge} ${tmpl.name}`;
    templateSelect.appendChild(opt);
  });
}

function updateTemplateBadge(tmplId) {
  const found = AGENT_TEMPLATES.find((t) => t.id === tmplId) || AGENT_TEMPLATES[0];
  templateBadge.textContent = found.badge;
  if (!draftInput.value) {
    draftInput.placeholder = found.sampleInputPlaceholder;
  }
}

templateSelect.addEventListener("change", (e) => {
  const tmplId = e.target.value;
  updateTemplateBadge(tmplId);
  chrome.storage.local.set({ [SELECTED_TEMPLATE_ID_KEY]: tmplId });
});

// Auto-save listeners with debounce
let draftSaveTimeout = null;
draftInput.addEventListener("input", () => {
  updateDraftCharCount();
  autosaveIndicator.textContent = "● Saving...";
  clearTimeout(draftSaveTimeout);
  draftSaveTimeout = setTimeout(async () => {
    await chrome.storage.local.set({ [AUTOSAVE_DRAFT_KEY]: draftInput.value });
    autosaveIndicator.textContent = "● Auto-saved locally";
  }, 400);
});

function updateDraftCharCount() {
  const len = draftInput.value.length;
  draftCharCount.textContent = `${len} chars`;
}

let notesSaveTimeout = null;
function handleNotesAutosave() {
  notesAutosaveIndicator.textContent = "● Saving...";
  clearTimeout(notesSaveTimeout);
  notesSaveTimeout = setTimeout(async () => {
    await chrome.storage.local.set({
      [AUTOSAVE_NOTE_TITLE_KEY]: noteTitleInput.value,
      [AUTOSAVE_NOTE_BODY_KEY]: noteBodyInput.value,
    });
    notesAutosaveIndicator.textContent = "● Auto-saved locally";
  }, 400);
}
noteTitleInput.addEventListener("input", handleNotesAutosave);
noteBodyInput.addEventListener("input", handleNotesAutosave);

// 3. Active Tab Context Grabber & Scraper
async function scrapeActiveTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) {
      throw new Error("No active browser tab found");
    }

    if (tab.url?.startsWith("chrome://") || tab.url?.startsWith("edge://")) {
      throw new Error("Browser internal pages cannot be scraped");
    }

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const title = document.title || "";
        const url = window.location.href || "";
        const selection = window.getSelection()?.toString()?.trim() || "";

        // Extract clean text from body, prioritizing main elements
        const mainEl = document.querySelector("main, article, #content, .content") || document.body;
        const rawText = (selection || mainEl?.innerText || document.body?.innerText || "")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 5000); // 5000 chars safe snapshot

        return { title, url, selection, text: rawText };
      },
    });

    if (results && results[0]?.result) {
      activeScrapedData = results[0].result;
      return activeScrapedData;
    }
    throw new Error("Empty scrape result");
  } catch (err) {
    throw err;
  }
}

// Button: Grab Tab Text (in Agent Tab)
btnSnapActiveTab.addEventListener("click", async () => {
  aiStatus.textContent = "📸 Scraping active tab text...";
  try {
    const data = await scrapeActiveTab();
    draftInput.value = `[Source: ${data.title}]\nURL: ${data.url}\n\n${data.text.slice(0, 1500)}`;
    updateDraftCharCount();
    await chrome.storage.local.set({ [AUTOSAVE_DRAFT_KEY]: draftInput.value });
    aiStatus.textContent = "✓ Tab text grabbed into context.";
    setTimeout(() => (aiStatus.textContent = ""), 2000);
  } catch (err) {
    aiStatus.textContent = `⚠️ ${err.message || "Failed to grab tab"}`;
    setTimeout(() => (aiStatus.textContent = ""), 3000);
  }
});

btnPaste.addEventListener("click", async () => {
  try {
    const text = await navigator.clipboard.readText();
    if (text) {
      draftInput.value = text;
      updateDraftCharCount();
      await chrome.storage.local.set({ [AUTOSAVE_DRAFT_KEY]: draftInput.value });
    }
  } catch {
    draftInput.focus();
  }
});

// Button: Scrape Tab (in Scraper Tab)
btnScrapeNow.addEventListener("click", async () => {
  scraperStatus.textContent = "🔍 Extracting DOM & content...";
  try {
    const data = await scrapeActiveTab();
    scrapedTitle.textContent = data.title || "Untitled Page";
    scrapedUrl.textContent = data.url || "";
    scrapedMeta.classList.remove("hidden");
    scrapedContent.value = data.text;
    scraperStatus.textContent = `✓ Scraped ${data.text.length} characters cleanly.`;
    setTimeout(() => (scraperStatus.textContent = ""), 2500);
  } catch (err) {
    scraperStatus.textContent = `❌ ${err.message}`;
  }
});

btnCopyScraped.addEventListener("click", async () => {
  if (!scrapedContent.value) return;
  await navigator.clipboard.writeText(scrapedContent.value);
  btnCopyScraped.textContent = "Copied!";
  setTimeout(() => (btnCopyScraped.textContent = "Copy All"), 1500);
});

btnAnalyzeScraped.addEventListener("click", () => {
  if (!scrapedContent.value) {
    scraperStatus.textContent = "⚠️ Scrape tab first.";
    return;
  }
  // Switch to Agent tab with Anti-overkill check
  templateSelect.value = "anti_overkill";
  updateTemplateBadge("anti_overkill");
  draftInput.value = `Please analyze this page content for native tools, solved problems, and simple solutions vs over-engineering:\n\n[Page: ${activeScrapedData.title || "Untitled"}]\n${scrapedContent.value.slice(0, 2000)}`;
  updateDraftCharCount();

  document.querySelector('[data-tab="tab-agent"]').click();
  runAIAgent(false);
});

// Markdown Export for Scraped Content
btnExportScrapedMd.addEventListener("click", () => {
  if (!scrapedContent.value) {
    scraperStatus.textContent = "⚠️ Nothing to export.";
    return;
  }
  const title = activeScrapedData.title || "Web Scrape";
  const safeFilename = `${title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_scrape.md`;
  const mdContent = `# ${title}
- **Source URL**: ${activeScrapedData.url || "N/A"}
- **Captured At**: ${new Date().toISOString()}

---

## Scraped Content
\`\`\`text
${scrapedContent.value}
\`\`\`
`;
  downloadMarkdown(safeFilename, mdContent);
  scraperStatus.textContent = "✓ Exported to Markdown file!";
  setTimeout(() => (scraperStatus.textContent = ""), 2000);
});

// 4. Agent Execution with Anti-Overkill System Prompts
btnRunAgent.addEventListener("click", () => runAIAgent(false));
btnSms.addEventListener("click", () => runAIAgent(true));

async function runAIAgent(isSms = false) {
  const rawText = draftInput.value.trim();
  if (!rawText) {
    aiStatus.textContent = "⚠️ Please enter your goal, question, or grab tab text.";
    setTimeout(() => (aiStatus.textContent = ""), 2500);
    return;
  }

  const selectedTmpl =
    AGENT_TEMPLATES.find((t) => t.id === templateSelect.value) || AGENT_TEMPLATES[0];

  aiStatus.innerHTML = `<span style="color:#f0806a;">⚡ Running ${selectedTmpl.badge} check...</span>`;
  resultContainer.classList.add("hidden");

  let prompt = `<system_instruction>
${selectedTmpl.systemPrompt}

STRICT CONSTRAINTS:
1. BREVITY: Keep entire output concise, formatted in bullet points (max 3-4 bullets).
2. NO FLUFF: Do not include introductory phrases (e.g. "Here is what I found:") or concluding sign-offs.
3. PREVENT OVERKILL: Clearly state if ready-made, native tools already exist (e.g., standard OS capabilities, free utilities) so user never wastes time reinventing solved wheels.
${isSms ? "4. SMS CONSTRAINT: Strictly under 160 characters. Preserving numbers/dates." : ""}
</system_instruction>

<user_query_and_context>
${rawText}
</user_query_and_context>`;

  chrome.runtime.sendMessage({ action: "GENERATE_DRAFT", prompt }, (res) => {
    if (chrome.runtime.lastError) {
      aiStatus.textContent = "❌ " + (chrome.runtime.lastError.message || "Execution error");
      return;
    }

    if (res && res.success && res.text) {
      aiStatus.innerHTML = `<span style="color:#16a34a; font-weight:600;">✓ Agent check complete!</span>`;
      resultText.value = res.text.trim();
      charCount.textContent = `${resultText.value.length} chars`;
      resultContainer.classList.remove("hidden");
    } else {
      aiStatus.textContent = `❌ ${res?.error || "AI Generation failed. Check engine settings."}`;
    }
  });
}

btnCopy.addEventListener("click", async () => {
  if (!resultText.value) return;
  await navigator.clipboard.writeText(resultText.value);
  btnCopy.textContent = "✓ Copied";
  setTimeout(() => (btnCopy.textContent = "📋 Copy"), 1500);
});

// Markdown Export for Agent Result
btnExportResultMd.addEventListener("click", () => {
  if (!resultText.value) return;
  const tmpl = AGENT_TEMPLATES.find((t) => t.id === templateSelect.value) || AGENT_TEMPLATES[0];
  const dateStr = new Date().toISOString().slice(0, 10);
  const mdContent = `# Agent Takeaway (${tmpl.name})
- **Strategy**: ${tmpl.name}
- **Date**: ${dateStr}
- **Input Query**:
> ${draftInput.value.slice(0, 200)}

---

## Direct Recommendations & Next Steps
${resultText.value}

---
*Disclaimer: AI generated guidance. Verify native tools and compatibility before implementation.*
`;
  downloadMarkdown(`agent_takeaways_${dateStr}.md`, mdContent);
  aiStatus.textContent = "✓ Exported to Markdown!";
  setTimeout(() => (aiStatus.textContent = ""), 2000);
});

// Save to Notes
btnSaveToNotes.addEventListener("click", async () => {
  if (!resultText.value) return;
  const noteTitle = `Takeaways: ${draftInput.value.slice(0, 40)}...`;
  const noteBody = resultText.value;

  const storage = await chrome.storage.local.get([SAVED_NOTES_KEY]);
  const notes = storage[SAVED_NOTES_KEY] || [];
  notes.unshift({
    id: Date.now().toString(),
    title: noteTitle,
    body: noteBody,
    createdAt: new Date().toISOString(),
  });

  await chrome.storage.local.set({ [SAVED_NOTES_KEY]: notes });
  renderSavedNotes(notes);
  btnSaveToNotes.textContent = "✓ Saved";
  setTimeout(() => (btnSaveToNotes.textContent = "💾 Save to Notes"), 1500);
});

// 5. Notes Management & Export
btnClearNote.addEventListener("click", async () => {
  noteTitleInput.value = "";
  noteBodyInput.value = "";
  await chrome.storage.local.set({
    [AUTOSAVE_NOTE_TITLE_KEY]: "",
    [AUTOSAVE_NOTE_BODY_KEY]: "",
  });
  notesAutosaveIndicator.textContent = "● Cleared";
});

btnSaveNoteItem.addEventListener("click", async () => {
  const title = noteTitleInput.value.trim() || "Untitled Note";
  const body = noteBodyInput.value.trim();
  if (!body) {
    notesAutosaveIndicator.textContent = "⚠️ Enter note body first";
    return;
  }

  const storage = await chrome.storage.local.get([SAVED_NOTES_KEY]);
  const notes = storage[SAVED_NOTES_KEY] || [];
  notes.unshift({
    id: Date.now().toString(),
    title,
    body,
    createdAt: new Date().toISOString(),
  });

  await chrome.storage.local.set({ [SAVED_NOTES_KEY]: notes });
  renderSavedNotes(notes);
  btnSaveNoteItem.textContent = "✓ Saved!";
  setTimeout(() => (btnSaveNoteItem.textContent = "💾 Save Note"), 1500);
});

function renderSavedNotes(notes) {
  savedNotesCount.textContent = notes.length.toString();
  if (!notes.length) {
    savedNotesList.innerHTML = `<div class="empty-notes-hint">No saved notes yet. Notes auto-save locally.</div>`;
    return;
  }

  savedNotesList.innerHTML = "";
  notes.forEach((n) => {
    const item = document.createElement("div");
    item.className = "note-item";
    item.innerHTML = `
      <div class="note-item-text" title="${n.title}">📌 ${n.title}</div>
      <button class="note-item-del" title="Delete note" data-id="${n.id}">✕</button>
    `;
    item.querySelector(".note-item-text").addEventListener("click", () => {
      noteTitleInput.value = n.title;
      noteBodyInput.value = n.body;
      handleNotesAutosave();
    });
    item.querySelector(".note-item-del").addEventListener("click", async (e) => {
      e.stopPropagation();
      const updated = notes.filter((item) => item.id !== n.id);
      await chrome.storage.local.set({ [SAVED_NOTES_KEY]: updated });
      renderSavedNotes(updated);
    });
    savedNotesList.appendChild(item);
  });
}

// Markdown Export for All Notes
btnExportNotesMd.addEventListener("click", async () => {
  const storage = await chrome.storage.local.get([
    SAVED_NOTES_KEY,
    AUTOSAVE_NOTE_TITLE_KEY,
    AUTOSAVE_NOTE_BODY_KEY,
  ]);
  const notes = storage[SAVED_NOTES_KEY] || [];

  let mdContent = `# SelfMax Capsule — Stored Notes & Action Items
*Exported on ${new Date().toLocaleString()}*

---

`;

  if (storage[AUTOSAVE_NOTE_BODY_KEY]) {
    mdContent += `## Current Draft: ${storage[AUTOSAVE_NOTE_TITLE_KEY] || "Untitled Draft"}
${storage[AUTOSAVE_NOTE_BODY_KEY]}

---

`;
  }

  if (notes.length) {
    notes.forEach((n, idx) => {
      mdContent += `### ${idx + 1}. ${n.title}
*Created: ${new Date(n.createdAt).toLocaleString()}*

${n.body}

---
`;
    });
  } else if (!storage[AUTOSAVE_NOTE_BODY_KEY]) {
    mdContent += `*(No notes stored)*\n`;
  }

  downloadMarkdown(`selfmax_notes_${new Date().toISOString().slice(0, 10)}.md`, mdContent);
  notesAutosaveIndicator.textContent = "✓ Notes exported to Markdown!";
  setTimeout(() => (notesAutosaveIndicator.textContent = "● Auto-saved locally"), 2000);
});

// 6. Settings & Session Management
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

saveSettingsBtn.addEventListener("click", async () => {
  const selectedMode = document.querySelector('input[name="ai_mode"]:checked')?.value || "webchat";
  const appOrigin = appOriginInput.value.trim() || "https://circlesapp.co";
  const localEndpoint = localEndpointInput.value.trim() || "http://localhost:1234/v1";
  const byokKey = byokKeyInput.value.trim();
  const byokEndpoint = byokEndpointInput.value.trim() || "https://api.openai.com/v1";

  await chrome.storage.local.set({
    [AI_MODE_KEY]: selectedMode,
    [APP_ORIGIN_KEY]: appOrigin,
    [LOCAL_ENDPOINT_KEY]: localEndpoint,
    [BYOK_KEY_KEY]: byokKey,
    [BYOK_ENDPOINT_KEY]: byokEndpoint,
  });

  settingsStatus.textContent = "✓ Settings saved!";
  setTimeout(() => (settingsStatus.textContent = ""), 2000);
  checkSessionStatus();
});

init();
