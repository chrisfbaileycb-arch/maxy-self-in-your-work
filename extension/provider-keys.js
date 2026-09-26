// SelfMax Capsule Assistant — Provider Keys Settings Component (ES Module)
// Manages pure client-side Bring-Your-Own-Key (BYOK) storage and validation
// Supported Providers: Google Gemini, OpenAI, Anthropic

export const STORAGE_KEYS = {
  BYOK_PROVIDER: "smx_byok_provider",
  KEY_GEMINI: "smx_key_gemini",
  KEY_OPENAI: "smx_key_openai",
  KEY_ANTHROPIC: "smx_key_anthropic",
  MODEL_GEMINI: "smx_model_gemini",
  MODEL_OPENAI: "smx_model_openai",
  MODEL_ANTHROPIC: "smx_model_anthropic",
  CUSTOM_MODEL: "smx_custom_model",
};

export const PROVIDER_CONFIG = {
  gemini: {
    id: "gemini",
    name: "Google Gemini",
    icon: "✨",
    keyStorageKey: STORAGE_KEYS.KEY_GEMINI,
    modelStorageKey: STORAGE_KEYS.MODEL_GEMINI,
    defaultModel: "gemini-1.5-flash",
    models: [
      { id: "gemini-1.5-flash", label: "gemini-1.5-flash (Fast & lightweight)" },
      { id: "gemini-2.0-flash", label: "gemini-2.0-flash (Newest multimodal)" },
      { id: "gemini-1.5-pro", label: "gemini-1.5-pro (Deep reasoning & code)" },
    ],
    placeholder: "AIzaSy...",
    docsUrl: "https://aistudio.google.com/app/apikey",
    docsLabel: "Get Gemini Key (Google AI Studio)",
    validate: (key) => {
      const trimmed = (key || "").trim();
      if (!trimmed) return { valid: true, empty: true, message: "" };
      if (!trimmed.startsWith("AIza")) {
        return {
          valid: false,
          empty: false,
          message: "Google Gemini API key must start with 'AIza'.",
        };
      }
      if (trimmed.length < 25) {
        return {
          valid: false,
          empty: false,
          message: "Google Gemini API key is too short (min 25 characters).",
        };
      }
      if (/\s/.test(trimmed)) {
        return {
          valid: false,
          empty: false,
          message: "API key cannot contain whitespace or line breaks.",
        };
      }
      return { valid: true, empty: false, message: "" };
    },
  },
  openai: {
    id: "openai",
    name: "OpenAI",
    icon: "🧠",
    keyStorageKey: STORAGE_KEYS.KEY_OPENAI,
    modelStorageKey: STORAGE_KEYS.MODEL_OPENAI,
    defaultModel: "gpt-4o-mini",
    models: [
      { id: "gpt-4o-mini", label: "gpt-4o-mini (Fast & cost-effective)" },
      { id: "gpt-4o", label: "gpt-4o (High reasoning capability)" },
    ],
    placeholder: "sk-...",
    docsUrl: "https://platform.openai.com/api-keys",
    docsLabel: "Get OpenAI Key (OpenAI Platform)",
    validate: (key) => {
      const trimmed = (key || "").trim();
      if (!trimmed) return { valid: true, empty: true, message: "" };
      if (!trimmed.startsWith("sk-")) {
        return {
          valid: false,
          empty: false,
          message: "OpenAI API key must start with 'sk-'.",
        };
      }
      if (trimmed.length < 20) {
        return {
          valid: false,
          empty: false,
          message: "OpenAI API key is too short (min 20 characters).",
        };
      }
      if (/\s/.test(trimmed)) {
        return {
          valid: false,
          empty: false,
          message: "API key cannot contain whitespace or line breaks.",
        };
      }
      return { valid: true, empty: false, message: "" };
    },
  },
  anthropic: {
    id: "anthropic",
    name: "Anthropic",
    icon: "⚡",
    keyStorageKey: STORAGE_KEYS.KEY_ANTHROPIC,
    modelStorageKey: STORAGE_KEYS.MODEL_ANTHROPIC,
    defaultModel: "claude-3-5-sonnet-20241022",
    models: [
      { id: "claude-3-5-sonnet-20241022", label: "claude-3-5-sonnet (Recommended)" },
      { id: "claude-3-5-haiku-20241022", label: "claude-3-5-haiku (Fast & concise)" },
    ],
    placeholder: "sk-ant-...",
    docsUrl: "https://console.anthropic.com/settings/keys",
    docsLabel: "Get Claude Key (Anthropic Console)",
    validate: (key) => {
      const trimmed = (key || "").trim();
      if (!trimmed) return { valid: true, empty: true, message: "" };
      if (!trimmed.startsWith("sk-ant-")) {
        return {
          valid: false,
          empty: false,
          message: "Anthropic API key must start with 'sk-ant-'.",
        };
      }
      if (trimmed.length < 20) {
        return {
          valid: false,
          empty: false,
          message: "Anthropic API key is too short (min 20 characters).",
        };
      }
      if (/\s/.test(trimmed)) {
        return {
          valid: false,
          empty: false,
          message: "API key cannot contain whitespace or line breaks.",
        };
      }
      return { valid: true, empty: false, message: "" };
    },
  },
};

/**
 * Validates a single key for a given provider.
 * @param {'gemini' | 'openai' | 'anthropic'} provider
 * @param {string} key
 * @returns {{ valid: boolean, empty: boolean, message: string }}
 */
export function validateProviderKey(provider, key) {
  const cfg = PROVIDER_CONFIG[provider];
  if (!cfg) return { valid: false, empty: false, message: `Unknown provider: ${provider}` };
  return cfg.validate(key);
}

/**
 * Loads current BYOK keys and settings from chrome.storage.local
 */
export async function loadStoredProviderKeys() {
  const keysToQuery = [
    STORAGE_KEYS.BYOK_PROVIDER,
    STORAGE_KEYS.KEY_GEMINI,
    STORAGE_KEYS.KEY_OPENAI,
    STORAGE_KEYS.KEY_ANTHROPIC,
    STORAGE_KEYS.MODEL_GEMINI,
    STORAGE_KEYS.MODEL_OPENAI,
    STORAGE_KEYS.MODEL_ANTHROPIC,
    STORAGE_KEYS.CUSTOM_MODEL,
  ];

  return new Promise((resolve) => {
    chrome.storage.local.get(keysToQuery, (items) => {
      resolve({
        activeProvider: items[STORAGE_KEYS.BYOK_PROVIDER] || "gemini",
        geminiKey: items[STORAGE_KEYS.KEY_GEMINI] || "",
        openaiKey: items[STORAGE_KEYS.KEY_OPENAI] || "",
        anthropicKey: items[STORAGE_KEYS.KEY_ANTHROPIC] || "",
        geminiModel: items[STORAGE_KEYS.MODEL_GEMINI] || "gemini-1.5-flash",
        openaiModel: items[STORAGE_KEYS.MODEL_OPENAI] || "gpt-4o-mini",
        anthropicModel: items[STORAGE_KEYS.MODEL_ANTHROPIC] || "claude-3-5-sonnet-20241022",
      });
    });
  });
}

/**
 * Validates and saves provider keys into chrome.storage.local
 * @param {Object} formData
 * @returns {Promise<{ success: boolean, errors: Record<string, string>, message: string }>}
 */
export async function saveProviderKeysWithValidation({
  activeProvider,
  geminiKey,
  openaiKey,
  anthropicKey,
  geminiModel,
  openaiModel,
  anthropicModel,
}) {
  const errors = {};

  const vGemini = validateProviderKey("gemini", geminiKey);
  if (!vGemini.valid) errors.gemini = vGemini.message;

  const vOpenai = validateProviderKey("openai", openaiKey);
  if (!vOpenai.valid) errors.openai = vOpenai.message;

  const vAnthropic = validateProviderKey("anthropic", anthropicKey);
  if (!vAnthropic.valid) errors.anthropic = vAnthropic.message;

  const hasAnyKey =
    Boolean(geminiKey?.trim()) || Boolean(openaiKey?.trim()) || Boolean(anthropicKey?.trim());

  if (!hasAnyKey) {
    errors.general = "Please provide at least one API key (Google Gemini, OpenAI, or Anthropic).";
  }

  // Active provider check: ensure user didn't select an active provider with no key while other keys exist
  if (hasAnyKey && activeProvider) {
    const activeKeyMap = {
      gemini: geminiKey,
      openai: openaiKey,
      anthropic: anthropicKey,
    };
    const activeKeyVal = activeKeyMap[activeProvider]?.trim();
    if (!activeKeyVal) {
      errors.active = `Notice: Active provider is set to ${PROVIDER_CONFIG[activeProvider]?.name || activeProvider}, but its key is empty.`;
    }
  }

  if (
    Object.keys(errors).length > 0 &&
    (errors.gemini || errors.openai || errors.anthropic || errors.general)
  ) {
    return {
      success: false,
      errors,
      message: errors.general || "Please fix validation errors before saving.",
    };
  }

  // Determine active model to keep background.js synchronized
  let activeCustomModel = geminiModel;
  if (activeProvider === "openai") activeCustomModel = openaiModel;
  if (activeProvider === "anthropic") activeCustomModel = anthropicModel;

  const payload = {
    [STORAGE_KEYS.BYOK_PROVIDER]: activeProvider || "gemini",
    [STORAGE_KEYS.KEY_GEMINI]: (geminiKey || "").trim(),
    [STORAGE_KEYS.KEY_OPENAI]: (openaiKey || "").trim(),
    [STORAGE_KEYS.KEY_ANTHROPIC]: (anthropicKey || "").trim(),
    [STORAGE_KEYS.MODEL_GEMINI]: geminiModel || "gemini-1.5-flash",
    [STORAGE_KEYS.MODEL_OPENAI]: openaiModel || "gpt-4o-mini",
    [STORAGE_KEYS.MODEL_ANTHROPIC]: anthropicModel || "claude-3-5-sonnet-20241022",
    [STORAGE_KEYS.CUSTOM_MODEL]: activeCustomModel,
  };

  return new Promise((resolve) => {
    chrome.storage.local.set(payload, () => {
      resolve({
        success: true,
        errors,
        message: errors.active
          ? `✓ Keys saved! (${errors.active})`
          : "✓ Provider API keys validated & securely saved in chrome.storage.local.",
      });
    });
  });
}

/**
 * Mounts and initializes the Provider Keys settings component into a container DOM element.
 * @param {HTMLElement} container
 * @param {Function} onSessionChange
 */
export function initProviderKeysComponent(container, onSessionChange) {
  if (!container) return;

  // Render Component Template
  container.innerHTML = `
    <div class="byok-settings-card">
      <div class="byok-component-header">
        <div>
          <h3 class="byok-title">🔑 Provider Keys</h3>
          <p class="byok-subtitle">
            Securely store your personal API keys in browser storage (<code>chrome.storage.local</code>).
            Direct client-side requests with zero server intermediaries.
          </p>
        </div>
      </div>

      <!-- Active Provider Selector -->
      <div class="byok-active-section">
        <label for="pk-active-provider" class="byok-label">Primary Agent Provider:</label>
        <select id="pk-active-provider" class="dropdown-select pk-select">
          <option value="gemini">Google Gemini (Recommended / Fast)</option>
          <option value="openai">OpenAI (GPT-4o / GPT-4o-mini)</option>
          <option value="anthropic">Anthropic (Claude 3.5 Sonnet / Haiku)</option>
        </select>
      </div>

      <!-- Provider 1: Google Gemini -->
      <div class="provider-key-group" id="group-gemini">
        <div class="pkg-header">
          <div class="pkg-title-wrap">
            <span class="pkg-icon">✨</span>
            <strong class="pkg-name">Google Gemini</strong>
          </div>
          <span class="pkg-badge badge-missing" id="badge-gemini">○ Not Set</span>
        </div>
        <div class="pkg-input-wrap">
          <input
            id="pk-key-gemini"
            type="password"
            placeholder="AIzaSy..."
            class="single-input pk-key-input"
            autocomplete="off"
            spellcheck="false"
          />
          <button type="button" class="pk-eye-btn" data-target="pk-key-gemini" title="Show/Hide Key">
            👁️
          </button>
        </div>
        <div class="pk-field-error hidden" id="err-gemini"></div>
        <div class="pkg-meta-row">
          <label class="pkg-model-label">
            Model:
            <select id="pk-model-gemini" class="dropdown-select pk-model-select">
              <option value="gemini-1.5-flash">gemini-1.5-flash (Fastest)</option>
              <option value="gemini-2.0-flash">gemini-2.0-flash (Newest)</option>
              <option value="gemini-1.5-pro">gemini-1.5-pro (Reasoning)</option>
            </select>
          </label>
          <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" class="pk-docs-link">
            Get Key ↗
          </a>
        </div>
      </div>

      <!-- Provider 2: OpenAI -->
      <div class="provider-key-group" id="group-openai">
        <div class="pkg-header">
          <div class="pkg-title-wrap">
            <span class="pkg-icon">🧠</span>
            <strong class="pkg-name">OpenAI</strong>
          </div>
          <span class="pkg-badge badge-missing" id="badge-openai">○ Not Set</span>
        </div>
        <div class="pkg-input-wrap">
          <input
            id="pk-key-openai"
            type="password"
            placeholder="sk-..."
            class="single-input pk-key-input"
            autocomplete="off"
            spellcheck="false"
          />
          <button type="button" class="pk-eye-btn" data-target="pk-key-openai" title="Show/Hide Key">
            👁️
          </button>
        </div>
        <div class="pk-field-error hidden" id="err-openai"></div>
        <div class="pkg-meta-row">
          <label class="pkg-model-label">
            Model:
            <select id="pk-model-openai" class="dropdown-select pk-model-select">
              <option value="gpt-4o-mini">gpt-4o-mini (Cost-effective)</option>
              <option value="gpt-4o">gpt-4o (High capability)</option>
            </select>
          </label>
          <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer" class="pk-docs-link">
            Get Key ↗
          </a>
        </div>
      </div>

      <!-- Provider 3: Anthropic -->
      <div class="provider-key-group" id="group-anthropic">
        <div class="pkg-header">
          <div class="pkg-title-wrap">
            <span class="pkg-icon">⚡</span>
            <strong class="pkg-name">Anthropic</strong>
          </div>
          <span class="pkg-badge badge-missing" id="badge-anthropic">○ Not Set</span>
        </div>
        <div class="pkg-input-wrap">
          <input
            id="pk-key-anthropic"
            type="password"
            placeholder="sk-ant-..."
            class="single-input pk-key-input"
            autocomplete="off"
            spellcheck="false"
          />
          <button type="button" class="pk-eye-btn" data-target="pk-key-anthropic" title="Show/Hide Key">
            👁️
          </button>
        </div>
        <div class="pk-field-error hidden" id="err-anthropic"></div>
        <div class="pkg-meta-row">
          <label class="pkg-model-label">
            Model:
            <select id="pk-model-anthropic" class="dropdown-select pk-model-select">
              <option value="claude-3-5-sonnet-20241022">claude-3-5-sonnet (Recommended)</option>
              <option value="claude-3-5-haiku-20241022">claude-3-5-haiku (Fast)</option>
            </select>
          </label>
          <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer" class="pk-docs-link">
            Get Key ↗
          </a>
        </div>
      </div>

      <!-- Action Buttons Row -->
      <div class="pk-actions-row">
        <button id="pk-btn-save" class="primary-btn pk-save-btn">
          💾 Save Provider Keys
        </button>
        <button id="pk-btn-test" class="secondary-btn pk-test-btn" title="Send a test ping using the selected provider">
          🧪 Test Connection
        </button>
      </div>

      <!-- Feedback status message container -->
      <div id="pk-status" class="status-msg"></div>

      <!-- Security / Architecture pill -->
      <div class="pk-security-banner">
        <span class="pk-lock-icon">🔒</span>
        <div class="pk-security-text">
          <strong>Direct Browser BYOK:</strong> Keys are never forwarded to any intermediary backend.
          Network requests connect directly to Google, OpenAI, or Anthropic.
        </div>
      </div>
    </div>
  `;

  // Grab element references
  const selActiveProvider = container.querySelector("#pk-active-provider");
  const inputGemini = container.querySelector("#pk-key-gemini");
  const selModelGemini = container.querySelector("#pk-model-gemini");
  const badgeGemini = container.querySelector("#badge-gemini");
  const errGemini = container.querySelector("#err-gemini");

  const inputOpenai = container.querySelector("#pk-key-openai");
  const selModelOpenai = container.querySelector("#pk-model-openai");
  const badgeOpenai = container.querySelector("#badge-openai");
  const errOpenai = container.querySelector("#err-openai");

  const inputAnthropic = container.querySelector("#pk-key-anthropic");
  const selModelAnthropic = container.querySelector("#pk-model-anthropic");
  const badgeAnthropic = container.querySelector("#badge-anthropic");
  const errAnthropic = container.querySelector("#err-anthropic");

  const btnSave = container.querySelector("#pk-btn-save");
  const btnTest = container.querySelector("#pk-btn-test");
  const statusBox = container.querySelector("#pk-status");

  // Helper: update badge appearance
  function updateBadge(badgeEl, hasKey) {
    if (!badgeEl) return;
    if (hasKey) {
      badgeEl.textContent = "● Saved";
      badgeEl.className = "pkg-badge badge-configured";
    } else {
      badgeEl.textContent = "○ Not Set";
      badgeEl.className = "pkg-badge badge-missing";
    }
  }

  // Helper: display status banner
  function showStatus(text, type = "info") {
    if (!statusBox) return;
    statusBox.textContent = text;
    statusBox.className = `status-msg show ${type}`;
    if (type === "success") {
      setTimeout(() => {
        statusBox.classList.remove("show");
      }, 5000);
    }
  }

  // Password Show / Hide Handlers
  container.querySelectorAll(".pk-eye-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-target");
      const targetInput = container.querySelector(`#${targetId}`);
      if (!targetInput) return;
      if (targetInput.type === "password") {
        targetInput.type = "text";
        btn.textContent = "🙈";
      } else {
        targetInput.type = "password";
        btn.textContent = "👁️";
      }
    });
  });

  // Inline Validation Helpers
  function validateField(provider, inputEl, errEl) {
    const val = inputEl?.value || "";
    const res = validateProviderKey(provider, val);
    if (!res.valid) {
      inputEl.classList.add("input-invalid");
      inputEl.classList.remove("input-valid");
      errEl.textContent = res.message;
      errEl.classList.remove("hidden");
    } else {
      inputEl.classList.remove("input-invalid");
      if (val.trim()) {
        inputEl.classList.add("input-valid");
      } else {
        inputEl.classList.remove("input-valid");
      }
      errEl.textContent = "";
      errEl.classList.add("hidden");
    }
    return res.valid;
  }

  inputGemini?.addEventListener("input", () => validateField("gemini", inputGemini, errGemini));
  inputOpenai?.addEventListener("input", () => validateField("openai", inputOpenai, errOpenai));
  inputAnthropic?.addEventListener("input", () =>
    validateField("anthropic", inputAnthropic, errAnthropic),
  );

  // Load Initial Stored State
  loadStoredProviderKeys().then((stored) => {
    if (selActiveProvider) selActiveProvider.value = stored.activeProvider || "gemini";
    if (inputGemini) inputGemini.value = stored.geminiKey || "";
    if (inputOpenai) inputOpenai.value = stored.openaiKey || "";
    if (inputAnthropic) inputAnthropic.value = stored.anthropicKey || "";

    if (selModelGemini) selModelGemini.value = stored.geminiModel || "gemini-1.5-flash";
    if (selModelOpenai) selModelOpenai.value = stored.openaiModel || "gpt-4o-mini";
    if (selModelAnthropic)
      selModelAnthropic.value = stored.anthropicModel || "claude-3-5-sonnet-20241022";

    updateBadge(badgeGemini, Boolean(stored.geminiKey?.trim()));
    updateBadge(badgeOpenai, Boolean(stored.openaiKey?.trim()));
    updateBadge(badgeAnthropic, Boolean(stored.anthropicKey?.trim()));
  });

  // Save Handler with Validation
  btnSave?.addEventListener("click", async () => {
    btnSave.disabled = true;
    btnSave.textContent = "Validating...";

    const formData = {
      activeProvider: selActiveProvider?.value || "gemini",
      geminiKey: inputGemini?.value || "",
      openaiKey: inputOpenai?.value || "",
      anthropicKey: inputAnthropic?.value || "",
      geminiModel: selModelGemini?.value || "gemini-1.5-flash",
      openaiModel: selModelOpenai?.value || "gpt-4o-mini",
      anthropicModel: selModelAnthropic?.value || "claude-3-5-sonnet-20241022",
    };

    // Run field validations
    validateField("gemini", inputGemini, errGemini);
    validateField("openai", inputOpenai, errOpenai);
    validateField("anthropic", inputAnthropic, errAnthropic);

    const result = await saveProviderKeysWithValidation(formData);
    btnSave.disabled = false;
    btnSave.textContent = "💾 Save Provider Keys";

    if (result.success) {
      updateBadge(badgeGemini, Boolean(formData.geminiKey?.trim()));
      updateBadge(badgeOpenai, Boolean(formData.openaiKey?.trim()));
      updateBadge(badgeAnthropic, Boolean(formData.anthropicKey?.trim()));
      showStatus(result.message, "success");
      if (typeof onSessionChange === "function") {
        onSessionChange();
      }
    } else {
      showStatus(result.message, "error");
    }
  });

  // Test Active Provider Connection Handler
  btnTest?.addEventListener("click", async () => {
    const activeProvider = selActiveProvider?.value || "gemini";
    const providerName = PROVIDER_CONFIG[activeProvider]?.name || activeProvider;
    showStatus(`Testing connection to ${providerName}...`, "info");
    btnTest.disabled = true;

    chrome.runtime.sendMessage({ action: "TEST_PROVIDER_KEY", provider: activeProvider }, (res) => {
      btnTest.disabled = false;
      if (chrome.runtime.lastError) {
        showStatus(`Test failed: ${chrome.runtime.lastError.message}`, "error");
        return;
      }
      if (res?.success) {
        showStatus(`✓ ${providerName} connection verified successfully!`, "success");
      } else {
        showStatus(
          `✗ ${providerName} verification failed: ${res?.error || "Invalid response"}`,
          "error",
        );
      }
    });
  });
}
