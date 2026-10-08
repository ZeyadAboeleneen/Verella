import "server-only";
import { and, eq } from "drizzle-orm";
import { db, settings } from "@verella/db";

import type { CodDepositSetting, CodDepositType } from "./cod-deposit-calc";

export { codDepositCents, type CodDepositSetting, type CodDepositType } from "./cod-deposit-calc";

/** Admin → Settings "Cash on delivery deposit". */
export async function getCodDepositSetting(): Promise<CodDepositSetting> {
  const [row] = await db
    .select()
    .from(settings)
    .where(and(eq(settings.group, "checkout"), eq(settings.key, "cod_deposit")))
    .limit(1);
  const v = (row?.value ?? null) as Partial<CodDepositSetting> | null;
  const type: CodDepositType = v?.type === "percent" || v?.type === "fixed" ? v.type : "off";
  return { type, value: typeof v?.value === "string" ? v.value : "" };
}

