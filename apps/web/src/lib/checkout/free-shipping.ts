import "server-only";
import { and, eq } from "drizzle-orm";
import { db, settings } from "@verella/db";
import { toCents } from "@verella/core";

/** Admin → Settings "Free delivery from" amount in cents; 0 = off. */
export async function getFreeShippingThresholdCents(): Promise<number> {
  const [row] = await db
    .select()
    .from(settings)
    .where(and(eq(settings.group, "checkout"), eq(settings.key, "free_shipping_threshold")))
    .limit(1);
  const v = row?.value as string | undefined;
  return v && Number(v) > 0 ? toCents(v) : 0;
}
