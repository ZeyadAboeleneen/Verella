import "server-only";
import { desc, eq, inArray } from "drizzle-orm";
import { addresses, customers, db, orders, users } from "@verella/db";
import { jidToLocalPhone, normalizeEgyptianPhone } from "./phone";

/** Payload the Baileys gateway POSTs for every incoming 1:1 text message. */
export interface IncomingWhatsAppPayload {
  from: string; // resolved jid (phone form when the gateway could resolve an @lid)
  rawJid: string; // the jid exactly as WhatsApp delivered it
  phone: string | null; // Egyptian local form, e.g. "01012345678"
  body: string;
  text?: string;
  fromMe?: boolean;
}

export interface IncomingWhatsAppContext {
  /** Reply target — ALWAYS the original rawJid, never a resolved/inferred jid. */
  replyJid: string;
  /** Stable identity key for any future per-sender state. */
  senderKey: string;
  phone: string | null;
  body: string;
  customerId: number | null;
  latestOrderNumber: string | null;
}

/**
 * Verella has no WhatsApp chatbot — its WhatsApp use is automatic order
 * invoices. Incoming messages are only matched to a customer and logged, so
 * the plumbing is ready if a future feature needs it. Nothing is sent back.
 */
export async function handleIncomingMessage(payload: IncomingWhatsAppPayload): Promise<IncomingWhatsAppContext> {
  const phone = payload.phone ?? jidToLocalPhone(payload.from);
  const intl = normalizeEgyptianPhone(phone);
  const ctx: IncomingWhatsAppContext = {
    replyJid: payload.rawJid,
    senderKey: intl ? `${intl}@s.whatsapp.net` : payload.from,
    phone,
    body: (payload.body ?? payload.text ?? "").trim(),
    customerId: null,
    latestOrderNumber: null,
  };

  if (intl) {
    // Stored phones are free-form, so match every common spelling of the number.
    const variants = [phone!, `0${intl.slice(2)}`, intl, `+${intl}`];
    const [account] = await db
      .select({ customerId: customers.id })
      .from(users)
      .innerJoin(customers, eq(customers.userId, users.id))
      .where(inArray(users.phone, variants))
      .limit(1);
    const [viaAddress] = account
      ? []
      : await db.select({ customerId: addresses.customerId }).from(addresses).where(inArray(addresses.phone, variants)).limit(1);
    ctx.customerId = account?.customerId ?? viaAddress?.customerId ?? null;

    if (ctx.customerId) {
      const [latest] = await db
        .select({ orderNumber: orders.orderNumber })
        .from(orders)
        .where(eq(orders.customerId, ctx.customerId))
        .orderBy(desc(orders.placedAt))
        .limit(1);
      ctx.latestOrderNumber = latest?.orderNumber ?? null;
    }
  }

  console.info(
    `[whatsapp] incoming from ${ctx.senderKey}${ctx.customerId ? ` (customer #${ctx.customerId}` + (ctx.latestOrderNumber ? `, last order ${ctx.latestOrderNumber})` : ")") : ""}`,
  );
  return ctx;
}
