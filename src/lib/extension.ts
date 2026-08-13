import type { ExtensionHandshakePayload } from "@/types";

export function initExtensionHandshake(
  onDataReceived: (payload: ExtensionHandshakePayload) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleMessage = (event: MessageEvent) => {
    // Ensure origin safety
    if (event.source !== window) return;

    if (
      event.data &&
      (event.data as { type?: string }).type === "SELF_MAXIMIZER_EXTENSION_RESPONSE"
    ) {
      onDataReceived((event.data as { payload: ExtensionHandshakePayload }).payload);
    }
  };

  window.addEventListener("message", handleMessage);

  return () => {
    window.removeEventListener("message", handleMessage);
  };
}

export function requestBrowserContextSync() {
  if (typeof window === "undefined") return;
  window.postMessage({ type: "SELF_MAXIMIZER_EXTENSION_REQUEST" }, "*");
}
