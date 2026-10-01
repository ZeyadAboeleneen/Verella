import { createHmac, timingSafeEqual } from "node:crypto";
import { handleIncomingMessage, type IncomingWhatsAppPayload } from "@/lib/whatsapp/incoming";

/**
 * Receives incoming WhatsApp messages from the Baileys gateway (openwa/index.js).
 * Only used for matching/logging today — the order invoices are sent by the
 * backend's order/payment logic, not from here.
 *
 * Optional HMAC: when OPENWA_WEBHOOK_SECRET is set (in BOTH the app and the
 * gateway), the gateway signs each body and unsigned/mis-signed requests are
 * rejected. Empty by default.
 */
export async function POST(request: Request) {
  const raw = await request.text();

  const secret = process.env.OPENWA_WEBHOOK_SECRET;
  if (secret) {
    const given = request.headers.get("x-openwa-signature") ?? "";
    const expected = createHmac("sha256", secret).update(raw).digest("hex");
    const ok = given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected));
    if (!ok) return Response.json({ ok: false, error: "bad_signature" }, { status: 401 });
  }

  let payload: Partial<IncomingWhatsAppPayload>;
  try {
    payload = JSON.parse(raw);
  } catch {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const from = typeof payload.from === "string" ? payload.from : "";
  const rawJid = typeof payload.rawJid === "string" ? payload.rawJid : "";
  const body = (typeof payload.body === "string" ? payload.body : typeof payload.text === "string" ? payload.text : "").trim();
  if (!from || !rawJid) return Response.json({ ok: false, error: "invalid_payload" }, { status: 400 });

  // The gateway already filters these; checked again so a direct call can't slip through.
  if (payload.fromMe) return Response.json({ ok: true, ignored: "from_me" });
  if (rawJid.endsWith("@g.us") || from.endsWith("@g.us")) return Response.json({ ok: true, ignored: "group" });
  if (!body) return Response.json({ ok: true, ignored: "empty" });

  await handleIncomingMessage({
    from,
    rawJid,
    phone: typeof payload.phone === "string" ? payload.phone : null,
    body,
  });
  // Deliberately says nothing about whether the sender matched a customer —
  // this route is reachable without a secret, so it mustn't confirm who's a customer.
  return Response.json({ ok: true });
}
