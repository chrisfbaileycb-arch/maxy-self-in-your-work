// VAPID public key — safe to ship in the client bundle. The private key
// lives in Lovable Cloud secrets and only the server can sign with it.
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
