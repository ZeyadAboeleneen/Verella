/**
 * All arithmetic happens in integer cents/piastres to avoid floating-point
 * drift. Drizzle's `decimal` columns are read/written as strings — convert
 * at the boundary with toCents()/fromCents() and never do math on the string
 * or on a JS `number` derived by naive parseFloat.
 */

export function toCents(value: string | number): number {
  const num = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(num)) throw new Error(`Invalid money value: ${value}`);
  return Math.round(num * 100);
}

export function fromCents(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function formatMoney(cents: number, currency = "EGP", locale = "en"): string {
  // Whole amounts render without decimals ("250 EGP"); fractional amounts keep
  // up to 2 digits ("250.5 EGP"). Currency code always trails the number.
  // numberingSystem is forced to "latn" so Arabic locale still renders
  // Western digits (0-9), not Arabic-Indic ones (٠-٩) — prices should read the
  // same regardless of language.
  const amount = new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-EG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    numberingSystem: "latn",
  }).format(cents / 100);
  return `${amount} ${currency}`;
}

export function addCents(...values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0);
}

export function clampCents(cents: number, min = 0): number {
  return Math.max(min, Math.round(cents));
}
