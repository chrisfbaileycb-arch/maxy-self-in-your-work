// SelfMax Capsule Assistant — Gmail & Outlook Content Script
(function () {
  const PROCESSED_ATTR = "data-selfmax-injected";

  // Watch DOM for compose boxes in Gmail and Outlook
  const observer = new MutationObserver(() => {
    // Gmail selectors
    const gmailBoxes = document.querySelectorAll(
      'div[aria-label="Message Body"], div[role="textbox"][g_editable="true"]',
    );
    gmailBoxes.forEach((box) => {
      if (!box.getAttribute(PROCESSED_ATTR)) {
        injectToolbar(box, "gmail");
      }
    });

    // Outlook / Webmail selectors
    const outlookBoxes = document.querySelectorAll(
      'div[aria-label="Message body"][contenteditable="true"], div[role="textbox"][aria-label="Message body"]',
    );
    outlookBoxes.forEach((box) => {
      if (!box.getAttribute(PROCESSED_ATTR)) {
        injectToolbar(box, "outlook");
      }
    });
  });

  observer.observe(document.body, { childList: true, subtree: true });

  function injectToolbar(composeBox, clientType) {
    composeBox.setAttribute(PROCESSED_ATTR, "true");

    const toolbar = document.createElement("div");
    toolbar.className = "selfmax-compose-toolbar";
    toolbar.style.cssText = `
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 6px;
      padding: 6px 10px;
      background: #fff8f4;
      border: 1px solid #fed7aa;
      border-radius: 8px;
      margin: 4px 0 6px 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 12px;
      color: #2a2320;
      z-index: 100;
    `;

    toolbar.innerHTML = `
      <div style="display:flex; align-items:center; gap:5px; font-weight:700; color:#f0806a; margin-right:4px;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
        </svg>
        <span>SelfMax</span>
      </div>
      <button type="button" class="smx-btn smx-btn-polish" style="cursor:pointer; background:#ffffff; border:1px solid #e2e8f0; border-radius:6px; padding:4px 9px; font-weight:600; font-size:11px; color:#1e293b; transition:all 0.15s ease;">
        ✨ Tighten &amp; Fix
      </button>
      <button type="button" class="smx-btn smx-btn-sms" style="cursor:pointer; background:#ffffff; border:1px solid #e2e8f0; border-radius:6px; padding:4px 9px; font-weight:600; font-size:11px; color:#1e293b; transition:all 0.15s ease;">
        💬 SMS (&lt;160 char)
      </button>
      <button type="button" class="smx-btn smx-btn-capture" style="cursor:pointer; background:#ffffff; border:1px solid #e2e8f0; border-radius:6px; padding:4px 9px; font-weight:600; font-size:11px; color:#1e293b; transition:all 0.15s ease;">
        📥 Save to SelfMax
      </button>
      <span class="smx-status" style="font-size:11px; color:#64748b; margin-left:auto; display:flex; align-items:center; gap:4px;"></span>
    `;

    // Add button hover styling
    toolbar.querySelectorAll(".smx-btn").forEach((b) => {
      b.addEventListener("mouseenter", () => {
        b.style.background = "#f1f5f9";
        b.style.borderColor = "#cbd5e1";
      });
      b.addEventListener("mouseleave", () => {
        b.style.background = "#ffffff";
        b.style.borderColor = "#e2e8f0";
      });
    });

    // Placement
    if (composeBox.parentElement) {
      composeBox.parentElement.insertBefore(toolbar, composeBox);
    }

    const polishBtn = toolbar.querySelector(".smx-btn-polish");
    const smsBtn = toolbar.querySelector(".smx-btn-sms");
    const captureBtn = toolbar.querySelector(".smx-btn-capture");
    const statusSpan = toolbar.querySelector(".smx-status");

    polishBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      handleAction(composeBox, statusSpan, "polish");
    });

    smsBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      handleAction(composeBox, statusSpan, "sms");
    });

    captureBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      handleCapture(composeBox, statusSpan);
    });
  }

  async function handleAction(composeBox, statusEl, actionType) {
    const rawText = (composeBox.innerText || composeBox.textContent || "").trim();
    if (!rawText) {
      statusEl.textContent = "⚠️ Please write some text first.";
      setTimeout(() => (statusEl.textContent = ""), 3000);
      return;
    }

    statusEl.innerHTML = `<span style="color:#f0806a;">⚡ Refining with AI...</span>`;

    let prompt = "";
    if (actionType === "polish") {
      prompt = `Refactor this email draft to be clear, professional, natural, and concise while fixing grammar, flow, and tone. Return ONLY the final draft text without commentary or preamble:\n\n${rawText}`;
    } else {
      prompt = `Convert the following message into an actionable, crystal-clear SMS text message under 160 characters. Return ONLY the SMS text without commentary or preamble:\n\n${rawText}`;
    }

    chrome.runtime.sendMessage(
      {
        action: "GENERATE_DRAFT",
        prompt: prompt,
        actionType: actionType,
      },
      (response) => {
        if (chrome.runtime.lastError) {
          statusEl.textContent = "❌ " + (chrome.runtime.lastError.message || "Connection error");
          return;
        }

        if (response && response.success && response.text) {
          replaceComposeText(composeBox, response.text);
          statusEl.innerHTML = `<span style="color:#16a34a; font-weight:600;">✓ Done!</span>`;
          setTimeout(() => (statusEl.textContent = ""), 3000);
        } else {
          const err = response?.error || "Failed to generate text";
          statusEl.innerHTML = `<span style="color:#dc2626;" title="${err}">❌ ${truncate(err, 40)}</span>`;
          if (err.toLowerCase().includes("session") || err.toLowerCase().includes("login")) {
            statusEl.style.cursor = "pointer";
            statusEl.onclick = () => window.open("https://chatgpt.com", "_blank");
          }
        }
      },
    );
  }

  function handleCapture(composeBox, statusEl) {
    const text = (composeBox.innerText || composeBox.textContent || "").trim();
    if (!text) {
      statusEl.textContent = "⚠️ Draft is empty.";
      setTimeout(() => (statusEl.textContent = ""), 2500);
      return;
    }

    statusEl.textContent = "Sending to SelfMax...";
    chrome.runtime.sendMessage(
      {
        type: "SMX_CAPTURE",
        source: "email",
        directText: text,
      },
      (res) => {
        if (res?.ok) {
          statusEl.innerHTML = `<span style="color:#16a34a; font-weight:600;">✓ Saved to SelfMax</span>`;
        } else {
          statusEl.textContent = res?.error || "Could not save.";
        }
        setTimeout(() => (statusEl.textContent = ""), 3000);
      },
    );
  }

  function replaceComposeText(element, newText) {
    element.focus();
    try {
      // Use document.execCommand to preserve Gmail / Outlook undo history
      document.execCommand("selectAll", false, null);
      document.execCommand("insertText", false, newText);
    } catch {
      // Fallback
      element.innerText = newText;
    }
  }

  function truncate(str, len) {
    return str.length > len ? str.slice(0, len) + "..." : str;
  }
})();
