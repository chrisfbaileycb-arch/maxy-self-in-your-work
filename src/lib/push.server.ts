// Server-only helper: signs VAPID JWTs and POSTs encrypted Web Push payloads.
// Uses @block65/webcrypto-web-push so it runs on Cloudflare Workers (no Node crypto).

import {
  buildPushPayload,
  type PushSubscription,
  type VapidKeys,
} from "@block65/webcrypto-web-push";

export type PushTarget = { endpoint: string; p256dh: string; auth: string };

export type PushMessage = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

function readVapidKeys(): VapidKeys {
  const subject = process.env.VAPID_SUBJECT;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!subject || !publicKey || !privateKey) {
    throw new Error(
      "Missing VAPID configuration. Set VAPID_SUBJECT, VAPID_PUBLIC_KEY, and VAPID_PRIVATE_KEY.",
    );
  }
  return { subject, publicKey, privateKey };
}

export async function sendPushToDevices(
  targets: PushTarget[],
  message: PushMessage,
): Promise<{ sent: number; removed: number; failed: number }> {
  const vapid = readVapidKeys();
  const payloadJson = JSON.stringify(message);

  let sent = 0;
  let removed = 0;
  let failed = 0;

  for (const target of targets) {
    const subscription: PushSubscription = {
      endpoint: target.endpoint,
      keys: { p256dh: target.p256dh, auth: target.auth },
      // Some libraries expect expirationTime — null is the standard "no expiry" value.
      expirationTime: null,
    };

    try {
      const request = await buildPushPayload(
        { data: payloadJson, options: { ttl: 60 * 60 * 24, urgency: "normal" } },
        subscription,
        vapid,
      );
      const response = await fetch(target.endpoint, request as RequestInit);
      if (response.status === 404 || response.status === 410) {
        // Subscription is gone — clean it up.
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await supabaseAdmin.from("push_subscriptions").delete().eq("endpoint", target.endpoint);
        removed++;
        continue;
      }
      if (!response.ok) {
        failed++;
        console.error(
          "[push] delivery failed",
          response.status,
          await response.text().catch(() => ""),
        );
        continue;
      }
      sent++;
    } catch (err) {
      failed++;
      console.error("[push] error sending to", target.endpoint, err);
    }
  }

  return { sent, removed, failed };
}
