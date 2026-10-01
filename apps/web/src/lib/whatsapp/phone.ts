/**
 * Phone ⇄ WhatsApp id helpers. Pure functions — no I/O, safe to import from
 * the offline test script.
 *
 * Checkout only requires a phone of 6+ characters, so stored numbers come in
 * every shape ("010 1234 5678", "+20 10…", "0020…", Arabic-Indic digits…).
 * Everything is normalised to Egyptian mobile form before use, and anything
 * that isn't a valid Egyptian mobile is rejected rather than guessed at.
 */

const ARABIC_INDIC = "٠١٢٣٤٥٦٧٨٩";
const EXTENDED_ARABIC_INDIC = "۰۱۲۳۴۵۶۷۸۹";

/** Egyptian mobile operators: 010 Vodafone, 011 Etisalat/e&, 012 Orange, 015 WE. */
const EG_MOBILE_INTL = /^201[0125]\d{8}$/;

/** A value containing "@" is already a WhatsApp jid — Baileys routes it. */
export function isJid(value: string): boolean {
  return value.includes("@");
}

function toAsciiDigits(value: string): string {
  return value.replace(/[٠-٩۰-۹]/g, (d) => {
    const i = ARABIC_INDIC.indexOf(d);
    return String(i >= 0 ? i : EXTENDED_ARABIC_INDIC.indexOf(d));
  });
}

/**
 * Any Egyptian mobile format → international digits ("201012345678"), or null.
 * Accepts 01012345678, 1012345678, 201012345678, +201012345678, 00201012345678,
 * with spaces/dashes/brackets and Arabic-Indic digits.
 */
export function normalizeEgyptianPhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let digits = toAsciiDigits(String(raw)).replace(/[\s\-().]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  if (!/^\d+$/.test(digits)) return null;
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = `2${digits}`; // 010… → 2010…
  else if (/^1[0125]\d{8}$/.test(digits)) digits = `20${digits}`; // 10… (dropped leading 0)
  return EG_MOBILE_INTL.test(digits) ? digits : null;
}

/** JIDs are always valid (Baileys routes them); local numbers must be Egyptian mobiles. */
export function isValidEgyptianPhone(value: string | null | undefined): boolean {
  if (!value) return false;
  return isJid(value) ? true : normalizeEgyptianPhone(value) !== null;
}

/** "01012345678" → "201012345678@s.whatsapp.net"; jids are returned unchanged. Null if invalid. */
export function toWhatsAppId(value: string | null | undefined): string | null {
  if (!value) return null;
  if (isJid(value)) return value.trim();
  const intl = normalizeEgyptianPhone(value);
  return intl ? `${intl}@s.whatsapp.net` : null;
}

/** "201012345678@s.whatsapp.net" → "01012345678". Null for @lid and non-Egyptian ids. */
export function jidToLocalPhone(jid: string | null | undefined): string | null {
  if (!jid) return null;
  const [user, server] = jid.split("@");
  if (server !== "s.whatsapp.net" || !user) return null;
  const bare = user.split(":")[0]; // drop any device suffix
  return EG_MOBILE_INTL.test(bare) ? `0${bare.slice(2)}` : null;
}
