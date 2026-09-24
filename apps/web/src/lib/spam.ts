/**
 * Honeypot: a field real visitors never see or fill (see components/Honeypot).
 * Form-filling bots tend to complete every input, so a value here marks the
 * submission as automated. Pairs with the per-IP limits in lib/rate-limit.ts.
 */
export const HONEYPOT_FIELD = "company_website";

export function isHoneypotFilled(formData: FormData): boolean {
  const value = formData.get(HONEYPOT_FIELD);
  return typeof value === "string" && value.trim() !== "";
}
