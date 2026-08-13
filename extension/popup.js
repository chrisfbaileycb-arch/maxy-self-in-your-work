const APP_ORIGIN_KEY = "smx_app_origin";
const statusEl = document.getElementById("status");
const originInput = document.getElementById("origin");

async function init() {
  const { [APP_ORIGIN_KEY]: origin } = await chrome.storage.local.get(APP_ORIGIN_KEY);
  if (origin) originInput.value = origin;
}
init();

document.querySelectorAll("button[data-source]").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const source = btn.dataset.source;
    statusEl.textContent = "Capturing…";
    try {
      const res = await chrome.runtime.sendMessage({ type: "SMX_CAPTURE", source });
      if (res?.ok) {
        statusEl.textContent = `Sent ${res.chars.toLocaleString()} chars → dashboard`;
        setTimeout(() => window.close(), 700);
      } else {
        statusEl.textContent = res?.error || "Nothing to capture on this page.";
      }
    } catch (e) {
      statusEl.textContent = e?.message || "Failed to capture.";
    }
  });
});

document.getElementById("note-to-self").addEventListener("click", async () => {
  const { [APP_ORIGIN_KEY]: origin } = await chrome.storage.local.get(APP_ORIGIN_KEY);
  await chrome.tabs.create({ url: `${origin || "https://circlesapp.co"}/note` });
  window.close();
});

document.getElementById("save-origin").addEventListener("click", async () => {
  const value = originInput.value.trim().replace(/\/$/, "");
  await chrome.storage.local.set({ [APP_ORIGIN_KEY]: value });
  // Ask for access to this one app origin so captures can be handed to the tab.
  try {
    if (value) await chrome.permissions.request({ origins: [`${value}/*`] });
  } catch {
    // Non-fatal: the user can still paste manually.
  }
  statusEl.textContent = "Saved app URL.";
});
