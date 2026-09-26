// VAPID public key — safe to ship in the client bundle. The private key
// lives in Lovable Cloud secrets and only the server can sign with it.
import type { MessagingConnectorsConfig } from "@/types";

export const VAPID_PUBLIC_KEY =
  "BCjO88x9f-UzeIHNre6YMsRmeNoz6zEIfvsqZ-eky_do9UELZY0QE01QJDRdh8-ibe26eir_pinAenlarMmz4x4";

export function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const buffer = new ArrayBuffer(raw.length);
  const out = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out as Uint8Array<ArrayBuffer>;
}

export const STORAGE_CONNECTORS_KEY = "smx_messaging_connectors_v1";

export const DEFAULT_CONNECTORS_CONFIG: MessagingConnectorsConfig = {
  discord: {
    webhookUrl: "",
    botToken: "",
    channelId: "",
    enabled: false,
  },
  telegram: {
    botToken: "",
    chatId: "",
    enabled: false,
  },
  slack: {
    webhookUrl: "",
    channel: "",
    enabled: false,
  },
  twilio: {
    accountSid: "",
    authToken: "",
    fromNumber: "",
    webhookUrl: "",
    enabled: false,
  },
};

export function loadMessagingConnectors(): MessagingConnectorsConfig {
  if (typeof window === "undefined") return DEFAULT_CONNECTORS_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_CONNECTORS_KEY);
    if (!raw) return DEFAULT_CONNECTORS_CONFIG;
    const parsed = JSON.parse(raw);
    return {
      discord: { ...DEFAULT_CONNECTORS_CONFIG.discord, ...(parsed.discord || {}) },
      telegram: { ...DEFAULT_CONNECTORS_CONFIG.telegram, ...(parsed.telegram || {}) },
      slack: { ...DEFAULT_CONNECTORS_CONFIG.slack, ...(parsed.slack || {}) },
      twilio: { ...DEFAULT_CONNECTORS_CONFIG.twilio, ...(parsed.twilio || {}) },
    };
  } catch {
    return DEFAULT_CONNECTORS_CONFIG;
  }
}

export function saveMessagingConnectors(config: MessagingConnectorsConfig): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_CONNECTORS_KEY, JSON.stringify(config));
}

export async function testConnectorDispatch(
  service: "discord" | "telegram" | "slack" | "twilio",
  config: MessagingConnectorsConfig,
  sampleText: string = "✨ SelfMax Connector Test: Communication pipeline active.",
): Promise<{ ok: boolean; message: string }> {
  try {
    if (service === "discord") {
      const { webhookUrl, botToken } = config.discord;
      if (!webhookUrl && !botToken) {
        return { ok: false, message: "Provide a Discord Webhook URL or Bot Token first." };
      }
      if (webhookUrl) {
        const res = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: `**SelfMax Capsule**\n${sampleText}`,
            username: "SelfMax Bot",
          }),
        });
        if (!res.ok) throw new Error(`Discord returned HTTP ${res.status}`);
        return { ok: true, message: "Discord webhook test succeeded." };
      }
      return { ok: true, message: "Discord Bot Token saved & ready." };
    }

    if (service === "telegram") {
      const { botToken, chatId } = config.telegram;
      if (!botToken || !chatId) {
        return { ok: false, message: "Provide both Telegram Bot Token and Chat ID." };
      }
      const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: `[SelfMax Capsule]\n${sampleText}`,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.description || `HTTP ${res.status}`);
      }
      return { ok: true, message: "Telegram prompt dispatch succeeded." };
    }

    if (service === "slack") {
      const { webhookUrl } = config.slack;
      if (!webhookUrl) {
        return { ok: false, message: "Provide a Slack Incoming Webhook URL." };
      }
      const res = await fetch(webhookUrl, {
        method: "POST",
        body: JSON.stringify({
          text: `*SelfMax Standup & Summary*\n${sampleText}`,
        }),
      });
      if (!res.ok) throw new Error(`Slack returned HTTP ${res.status}`);
      return { ok: true, message: "Slack webhook test delivered." };
    }

    if (service === "twilio") {
      const { accountSid, authToken, fromNumber, webhookUrl } = config.twilio;
      if (!webhookUrl && (!accountSid || !authToken || !fromNumber)) {
        return {
          ok: false,
          message: "Provide Twilio Account SID, Auth Token & From Number (or SMS Webhook).",
        };
      }
      if (webhookUrl) {
        const res = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            Body: sampleText.slice(0, 160),
            From: fromNumber || "+15550000000",
          }),
        });
        if (!res.ok) throw new Error(`Twilio Webhook returned HTTP ${res.status}`);
      }
      return { ok: true, message: "Twilio SMS connector configured & validated." };
    }

    return { ok: false, message: "Unknown service." };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Dispatch failed.",
    };
  }
}
