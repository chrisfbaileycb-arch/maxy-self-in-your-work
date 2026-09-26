import React, { useEffect, useRef, useState } from "react";
import {
  Sparkles,
  Copy,
  Download,
  Upload,
  FileJson,
  FileText,
  Save,
  RotateCcw,
  CheckCircle2,
  ExternalLink,
  Bot,
  Zap,
  ArrowRightLeft,
  Power,
  PowerOff,
} from "lucide-react";
import { toast } from "sonner";

interface PersonaPreset {
  id: string;
  name: string;
  badge: string;
  description: string;
  text: string;
}

const MASTER_PERSONA_PRESETS: PersonaPreset[] = [
  {
    id: "architect",
    name: "Systems Architect",
    badge: "Native-First",
    description: "Prioritizes built-in OS & browser tools; eliminates over-engineered scripts.",
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
    name: "Deep Researcher",
    badge: "Internet-First",
    description: "Fact-checks against primary documentation and recent releases.",
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
    name: "Executive Lead",
    badge: "Actionable ROI",
    description: "Delivers 3-bullet executive briefs, blocker identification, and velocity focus.",
    text: `[SYSTEM CONTEXT & USER MASTER PERSONA]
• Identity: Technical Product Lead
• Directives:
  - Provide executive summaries: 1. Core Takeaway, 2. Immediate Actions, 3. Blockers.
  - Focus on leverage, engineering velocity, and operational simplicity.
  - Limit explanations to 3-5 high-impact bullet points.`,
  },
  {
    id: "custom",
    name: "Custom Persona",
    badge: "Custom Rules",
    description: "Your personalized rules, constraints, and domain requirements.",
    text: `[SYSTEM CONTEXT & USER MASTER PERSONA]
• Identity: Builder & Engineer
• Master Rules:
  - Check existing native tools first.
  - Do not waste time building custom scripts if a standard tool already exists.
  - Respond with concise bulleted statements.`,
  },
];

const LOCAL_STORAGE_KEY = "smx_master_persona";
const LEGACY_STORAGE_KEY = "master_persona";
const PERSONA_ENABLED_KEY = "smx_persona_injection_enabled";
const AUTO_INJECT_KEY = "smx_auto_inject_enabled";
const INJECT_MODE_KEY = "smx_persona_inject_mode";
const PRESET_KEY = "smx_persona_preset";

interface PersonaConfigFile {
  $schema?: string;
  format: "selfmax-persona-config";
  version: string;
  exported_at: string;
  persona: {
    id: string;
    name: string;
    badge?: string;
    description?: string;
    master_persona: string;
    persona_injection_enabled?: boolean;
    auto_inject_enabled: boolean;
    inject_mode: "prepend" | "append" | "replace";
  };
  compatibility?: {
    target_models: string[];
    keyboard_shortcut: string;
    extension_version?: string;
  };
}

export function PersonaManager({ className = "" }: { className?: string }) {
  const [personaText, setPersonaText] = useState(MASTER_PERSONA_PRESETS[0].text);
  const [activePreset, setActivePreset] = useState("architect");
  const [personaEnabled, setPersonaEnabled] = useState(true);
  const [autoInject, setAutoInject] = useState(true);
  const [injectMode, setInjectMode] = useState<"prepend" | "append" | "replace">("prepend");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize from storage
  useEffect(() => {
    try {
      const stored =
        localStorage.getItem(LOCAL_STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
      if (stored && stored.trim()) {
        setPersonaText(stored);
      }
      const storedEnabled = localStorage.getItem(PERSONA_ENABLED_KEY);
      if (storedEnabled !== null) {
        setPersonaEnabled(storedEnabled === "true");
      }
      const storedAuto = localStorage.getItem(AUTO_INJECT_KEY);
      if (storedAuto !== null) {
        setAutoInject(storedAuto === "true");
      }
      const storedMode = localStorage.getItem(INJECT_MODE_KEY);
      if (storedMode === "prepend" || storedMode === "append" || storedMode === "replace") {
        setInjectMode(storedMode);
      }
      const storedPreset = localStorage.getItem(PRESET_KEY);
      if (storedPreset) {
        setActivePreset(storedPreset);
      }
    } catch {
      // LocalStorage fallback
    }
  }, []);

  const handlePresetSelect = (presetId: string) => {
    setActivePreset(presetId);
    const preset = MASTER_PERSONA_PRESETS.find((p) => p.id === presetId);
    if (preset && preset.id !== "custom") {
      setPersonaText(preset.text);
      toast.info(`Loaded ${preset.name} template`);
    }
  };

  const persistToStorage = (
    text: string,
    enabled: boolean,
    auto: boolean,
    mode: "prepend" | "append" | "replace",
    preset: string,
  ) => {
    localStorage.setItem(LOCAL_STORAGE_KEY, text);
    localStorage.setItem(LEGACY_STORAGE_KEY, text);
    localStorage.setItem(PERSONA_ENABLED_KEY, String(enabled));
    localStorage.setItem(AUTO_INJECT_KEY, String(auto));
    localStorage.setItem(INJECT_MODE_KEY, mode);
    localStorage.setItem(PRESET_KEY, preset);
    setSavedAt(new Date());
  };

  const handleSave = () => {
    try {
      persistToStorage(personaText, personaEnabled, autoInject, injectMode, activePreset);
      toast.success("Master Persona configuration saved locally!");
    } catch {
      toast.error("Failed to save to local storage.");
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(personaText);
    toast.success("Master Persona copied to clipboard!");
  };

  const handleReset = () => {
    const defaultPreset = MASTER_PERSONA_PRESETS[0];
    setPersonaText(defaultPreset.text);
    setActivePreset(defaultPreset.id);
    setPersonaEnabled(true);
    setInjectMode("prepend");
    setAutoInject(true);
    persistToStorage(defaultPreset.text, true, true, "prepend", defaultPreset.id);
    toast.info("Reset to default Systems Architect persona.");
  };

  // Export as portable JSON file
  const handleExportJson = () => {
    const activePresetObj = MASTER_PERSONA_PRESETS.find((p) => p.id === activePreset);
    const configData: PersonaConfigFile = {
      $schema: "https://selfmaximizer.internal/schemas/persona-v1.json",
      format: "selfmax-persona-config",
      version: "1.0",
      exported_at: new Date().toISOString(),
      persona: {
        id: activePreset,
        name: activePresetObj ? activePresetObj.name : "Custom Persona",
        badge: activePresetObj?.badge || "Custom",
        description: activePresetObj?.description || "User defined master persona",
        master_persona: personaText,
        persona_injection_enabled: personaEnabled,
        auto_inject_enabled: autoInject,
        inject_mode: injectMode,
      },
      compatibility: {
        target_models: ["ChatGPT", "Claude", "Gemini", "AI Studio"],
        keyboard_shortcut: "Alt+P",
        extension_version: "1.2.2",
      },
    };

    const jsonString = JSON.stringify(configData, null, 2);
    const blob = new Blob([jsonString], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const filename = `selfmax-persona-${activePreset || "config"}.json`;
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Exported persona configuration as ${filename}`);
  };

  // Export as Markdown format
  const handleExportMarkdown = () => {
    const markdownContent = `# Self Maximizer — Master Persona Configuration
**Preset**: ${activePreset}
**Global Persona Injection**: ${personaEnabled ? "Enabled" : "Disabled (Paused)"}
**Auto-Inject**: ${autoInject ? "Enabled" : "Disabled"}
**Mode**: ${injectMode}
**Exported**: ${new Date().toLocaleString()}

---

\`\`\`markdown
${personaText}
\`\`\`
`;
    const blob = new Blob([markdownContent], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "master-persona.md";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Exported master-persona.md");
  };

  // Process raw imported JSON text
  const processImportedJsonText = (jsonString: string, sourceFileName: string) => {
    try {
      const data = JSON.parse(jsonString);

      // Support multiple JSON schemas:
      // 1. Full schema: data.persona.master_persona
      // 2. Flat schema: data.master_persona / data.smx_master_persona
      // 3. Simple text: data.personaText / data.text / data.content / data.persona (string)
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
        toast.error(
          "Invalid configuration: No valid 'master_persona' or 'text' field found in the JSON file.",
        );
        return;
      }

      const cleanText = extractedText.trim();
      setPersonaText(cleanText);

      // Extract persona injection enabled setting if provided
      let nextPersonaEnabled = personaEnabled;
      if (typeof data.persona?.persona_injection_enabled === "boolean") {
        nextPersonaEnabled = data.persona.persona_injection_enabled;
      } else if (typeof data.persona_injection_enabled === "boolean") {
        nextPersonaEnabled = data.persona_injection_enabled;
      } else if (typeof data.global_persona_enabled === "boolean") {
        nextPersonaEnabled = data.global_persona_enabled;
      }
      setPersonaEnabled(nextPersonaEnabled);

      // Extract auto-inject setting if provided
      let nextAutoInject = autoInject;
      if (typeof data.persona?.auto_inject_enabled === "boolean") {
        nextAutoInject = data.persona.auto_inject_enabled;
      } else if (typeof data.auto_inject_enabled === "boolean") {
        nextAutoInject = data.auto_inject_enabled;
      } else if (typeof data.auto_inject === "boolean") {
        nextAutoInject = data.auto_inject;
      }
      setAutoInject(nextAutoInject);

      // Extract inject mode if provided
      let nextMode = injectMode;
      const rawMode = data.persona?.inject_mode || data.inject_mode;
      if (rawMode === "prepend" || rawMode === "append" || rawMode === "replace") {
        nextMode = rawMode;
        setInjectMode(nextMode);
      }

      // Check preset matching
      const importedPresetId = data.persona?.id || data.preset || data.id;
      const matchedPreset = MASTER_PERSONA_PRESETS.find((p) => p.id === importedPresetId);
      const nextPresetId = matchedPreset ? matchedPreset.id : "custom";
      setActivePreset(nextPresetId);

      // Persist immediately to prevent state loss
      persistToStorage(cleanText, nextPersonaEnabled, nextAutoInject, nextMode, nextPresetId);

      toast.success(`Successfully imported "${sourceFileName}"! Persona updated and saved.`);
    } catch (err) {
      toast.error(
        `Failed to parse JSON file: ${err instanceof Error ? err.message : "Malformed JSON syntax"}`,
      );
    }
  };

  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        processImportedJsonText(content, file.name);
      }
    };
    reader.onerror = () => {
      toast.error("Error reading JSON file.");
    };
    reader.readAsText(file);

    // Reset input value so re-importing the same file triggers change
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Handle Drag & Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".json") && file.type !== "application/json") {
      toast.error("Please drop a valid .json file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        processImportedJsonText(content, file.name);
      }
    };
    reader.onerror = () => {
      toast.error("Error reading dropped JSON file.");
    };
    reader.readAsText(file);
  };

  const charCount = personaText.length;
  const tokenEstimate = Math.ceil(charCount / 4);

  return (
    <section
      className={`rounded-2xl border border-border bg-card p-6 shadow-xs space-y-6 ${className}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Hidden File Input for JSON Import */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".json,application/json"
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold">Persona Manager</h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Save, edit, import, and export your master persona and rules context to inject into
            ChatGPT, Claude, Gemini, and Google AI Studio sessions.
          </p>
        </div>

        {/* Target Model Pills & Portability Indicator */}
        <div className="flex flex-wrap items-center gap-1.5">
          {["ChatGPT", "Claude", "Gemini", "AI Studio"].map((model) => (
            <span
              key={model}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground"
            >
              <Bot className="h-3 w-3 text-primary" />
              {model}
            </span>
          ))}
        </div>
      </div>

      {/* Global Toggle Switch Banner */}
      <div
        className={`flex items-center justify-between rounded-xl border p-4 transition-all duration-200 ${
          personaEnabled ? "border-primary/30 bg-primary/5 shadow-xs" : "border-border bg-muted/40"
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border transition ${
              personaEnabled
                ? "border-primary/30 bg-primary/10 text-primary"
                : "border-border bg-muted text-muted-foreground"
            }`}
          >
            {personaEnabled ? <Zap className="h-5 w-5" /> : <PowerOff className="h-5 w-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold">Global Persona Injection</span>
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide border ${
                  personaEnabled
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 bg-slate-100 text-slate-600"
                }`}
              >
                {personaEnabled ? "ACTIVE" : "PAUSED"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {personaEnabled
                ? "Injects your saved master persona into AI chats (ChatGPT, Claude, Gemini, AI Studio)."
                : "Persona injection is paused globally. Your saved persona text and rules are safely kept."}
            </p>
          </div>
        </div>

        <label
          className="relative inline-flex items-center cursor-pointer shrink-0 ml-4"
          title="Quickly enable or disable persona injection without removing saved text"
        >
          <input
            type="checkbox"
            checked={personaEnabled}
            onChange={(e) => {
              const next = e.target.checked;
              setPersonaEnabled(next);
              persistToStorage(personaText, next, autoInject, injectMode, activePreset);
              toast[next ? "success" : "info"](
                next
                  ? "Global persona injection ENABLED"
                  : "Global persona injection PAUSED (saved text preserved)",
              );
            }}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
        </label>
      </div>

      {/* Preset Selector Tabs */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Select Master Persona Preset
          </label>
          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
            <ArrowRightLeft className="h-3 w-3" /> Compatible with Chrome Extension
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
          {MASTER_PERSONA_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => handlePresetSelect(preset.id)}
              className={`flex flex-col text-left p-3 rounded-xl border transition ${
                activePreset === preset.id
                  ? "border-primary bg-primary/5 ring-1 ring-primary/40"
                  : "border-border bg-background hover:bg-accent/40"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">{preset.name}</span>
                <span className="rounded-sm bg-muted px-1.5 py-0.5 text-[9.5px] font-bold text-muted-foreground">
                  {preset.badge}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground line-clamp-2">
                {preset.description}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Textarea Editor with Drag & Drop Overlay */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor="master-persona-textarea" className="text-sm font-semibold">
            Master Persona &amp; System Directives
          </label>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>
              {charCount} chars (~{tokenEstimate} tokens)
            </span>
            {savedAt && (
              <span className="text-emerald-500 font-medium flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Saved{" "}
                {savedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </div>
        </div>

        <div className="relative">
          <textarea
            id="master-persona-textarea"
            value={personaText}
            onChange={(e) => {
              setPersonaText(e.target.value);
              if (activePreset !== "custom") setActivePreset("custom");
            }}
            rows={9}
            className={`w-full rounded-xl border bg-background p-3.5 font-mono text-xs leading-relaxed text-foreground shadow-xs focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition ${
              isDragging ? "border-primary ring-2 ring-primary/30 bg-primary/5" : "border-input"
            }`}
            placeholder="Define your master persona, rules, and constraints... (or drag & drop a persona .json file here)"
            spellCheck={false}
          />

          {isDragging && (
            <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-primary/10 backdrop-blur-xs border-2 border-dashed border-primary text-primary font-bold text-sm pointer-events-none">
              <Upload className="h-5 w-5 mr-2 animate-bounce" />
              Drop Persona .JSON configuration file to import
            </div>
          )}
        </div>
      </div>

      {/* Extension Sync & Auto-Inject & Mode Configuration */}
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-xs">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500 shrink-0" />
            <label className="flex items-center gap-2 font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={autoInject}
                onChange={(e) => setAutoInject(e.target.checked)}
                className="rounded border-input text-primary focus:ring-primary/30"
              />
              <span>
                Auto-inject persona when empty AI conversations open (Alt+P to manually trigger)
              </span>
            </label>
          </div>

          <div className="flex items-center gap-2 pl-6">
            <span className="text-muted-foreground">Injection Strategy:</span>
            <select
              value={injectMode}
              onChange={(e) => setInjectMode(e.target.value as "prepend" | "append" | "replace")}
              className="rounded-md border border-input bg-background px-2 py-1 text-xs text-foreground focus:border-primary focus:outline-none"
            >
              <option value="prepend">Prepend before prompt (Recommended)</option>
              <option value="append">Append after prompt</option>
              <option value="replace">Replace prompt</option>
            </select>
          </div>

          {!personaEnabled && (
            <div className="pl-6 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
              ⏸️ Persona injection is currently disabled globally. Flip the toggle switch above to
              re-enable.
            </div>
          )}
        </div>

        <a
          href="/extension"
          className="inline-flex items-center gap-1 font-semibold text-primary hover:underline shrink-0"
        >
          Extension Guide <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {/* Footer Actions: Import, Export JSON, Export MD, Copy, Reset, Save */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-border/60">
        <div className="flex flex-wrap items-center gap-2">
          {/* Import JSON */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-input bg-background px-3 py-2 text-xs font-semibold hover:bg-accent transition"
            title="Import persona configuration from a JSON file"
          >
            <Upload className="h-3.5 w-3.5 text-primary" />
            Import JSON
          </button>

          {/* Export JSON */}
          <button
            type="button"
            onClick={handleExportJson}
            className="inline-flex items-center gap-1.5 rounded-lg border border-input bg-background px-3 py-2 text-xs font-semibold hover:bg-accent transition"
            title="Export complete persona configuration as portable JSON backup"
          >
            <FileJson className="h-3.5 w-3.5 text-primary" />
            Export JSON
          </button>

          {/* Export Markdown */}
          <button
            type="button"
            onClick={handleExportMarkdown}
            className="inline-flex items-center gap-1.5 rounded-lg border border-input bg-background px-3 py-2 text-xs font-semibold hover:bg-accent transition"
            title="Export persona as Markdown file"
          >
            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
            Export (.md)
          </button>

          {/* Copy Prompt */}
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-input bg-background px-3 py-2 text-xs font-semibold hover:bg-accent transition"
          >
            <Copy className="h-3.5 w-3.5 text-muted-foreground" />
            Copy Persona
          </button>

          {/* Reset */}
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 rounded-lg border border-input bg-background px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-accent transition"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </button>
        </div>

        {/* Save Master Persona */}
        <button
          type="button"
          onClick={handleSave}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 shadow-xs transition"
        >
          <Save className="h-3.5 w-3.5" />
          Save Master Persona
        </button>
      </div>
    </section>
  );
}
