import { toCents } from "@verella/core";

/** Pure deposit maths — shared by the server (order) and the checkout page (preview). */
export type CodDepositType = "off" | "percent" | "fixed";
export interface CodDepositSetting {
  type: CodDepositType;
  /** Percent (e.g. "20") or a fixed EGP amount (e.g. "100.00"). */
  value: string;
}

/**
 * Deposit for a cash-on-delivery order, in cents (0 = none). A percentage is
 * of the order without delivery (e.g. 200 + 80 delivery, 10% → 20), rounded
 * up to whole pounds; never more than the order total.
 */
export function codDepositCents(setting: CodDepositSetting, grandTotalCents: number, deliveryFeeCents = 0): number {
  const n = Number(setting.value);
  if (setting.type === "off" || !Number.isFinite(n) || n <= 0 || grandTotalCents <= 0) return 0;
  const cents = setting.type === "percent" ? Math.ceil((Math.max(0, grandTotalCents - deliveryFeeCents) * Math.min(n, 100)) / 100 / 100) * 100 : toCents(setting.value);
  return Math.min(cents, grandTotalCents);
}
