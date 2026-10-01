import "server-only";
import { toWhatsAppId } from "./phone";

/**
 * The ONLY place in the app that talks to the Baileys gateway (openwa/index.js).
 * Server-side only — the "server-only" import makes the build fail if this is
 * ever pulled into a client component, so the gateway URL can't leak to the browser.
 */

const DEFAULT_SEND_URL = "http://localhost:3001/send";
const SEND_TIMEOUT_MS = 15_000;

export type SendTextResult =
  | { ok: true; jid: string; messageId: string | null }
  | { ok: false; error: string; jid?: string };

/** Gateway base URL, derived from BAILEYS_SEND_URL ("http://host:3001/send" → "http://host:3001"). */
function gatewayUrl(path: string): string {
  const send = process.env.BAILEYS_SEND_URL || DEFAULT_SEND_URL;
  return new URL(path, send.replace(/\/send\/?$/, "/")).toString();
}

export interface GatewayStatus {
  connected: boolean;
  loggedOut: boolean;
  phone: string | null;
  name: string | null;
  /** Raw pairing QR while waiting to be linked. */
  qr: string | null;
}

/** Current link state of the gateway, or null when it isn't running. */
export async function getGatewayStatus(): Promise<GatewayStatus | null> {
  try {
    const res = await fetch(gatewayUrl("/status"), { cache: "no-store", signal: AbortSignal.timeout(4_000) });
    return res.ok ? ((await res.json()) as GatewayStatus) : null;
  } catch {
    return null;
  }
}

/** Unlink the current phone and wipe the session so a fresh QR appears. */
export async function resetGatewaySession(): Promise<boolean> {
  try {
    const res = await fetch(gatewayUrl("/reset"), { method: "POST", cache: "no-store", signal: AbortSignal.timeout(20_000) });
    return res.ok;
  } catch {
    return false;
  }
}

/** Send a plain-text WhatsApp message. Never throws — failures come back as { ok: false }. */
export async function sendText(phone: string, message: string): Promise<SendTextResult> {
  const jid = toWhatsAppId(phone);
  if (!jid) return { ok: false, error: "invalid_phone" };
  if (!message.trim()) return { ok: false, error: "empty_message", jid };

  const url = process.env.BAILEYS_SEND_URL || DEFAULT_SEND_URL;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jid, text: message }),
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
      cache: "no-store",
    });
    const body = (await res.json().catch(() => null)) as { success?: boolean; messageId?: string | null; error?: string } | null;
    if (!res.ok || !body?.success) {
      return { ok: false, error: body?.error ?? `gateway_http_${res.status}`, jid };
    }
    return { ok: true, jid, messageId: body.messageId ?? null };
  } catch (err) {
    const error = err instanceof Error && err.name === "TimeoutError" ? "gateway_timeout" : "gateway_unreachable";
    return { ok: false, error, jid };
  }
}
