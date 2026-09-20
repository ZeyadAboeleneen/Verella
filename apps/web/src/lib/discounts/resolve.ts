import "server-only";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { db, discounts, discountProducts, discountCategories } from "@verella/db";
import type { DiscountLike } from "@verella/core";

async function toDiscountLike(rows: (typeof discounts.$inferSelect)[]): Promise<DiscountLike[]> {
  const ids = rows.map((r) => r.id);
  const [prodLinks, catLinks] = await Promise.all([
    ids.length ? db.select().from(discountProducts).where(inArray(discountProducts.discountId, ids)) : Promise.resolve([]),
    ids.length ? db.select().from(discountCategories).where(inArray(discountCategories.discountId, ids)) : Promise.resolve([]),
  ]);

  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    value: r.value,
    scope: r.scope,
    code: r.code,
    minOrderTotal: r.minOrderTotal,
    maxUses: r.maxUses,
    perUserLimit: r.perUserLimit,
    usedCount: r.usedCount,
    startsAt: r.startsAt,
    endsAt: r.endsAt,
    isActive: r.isActive,
    productIds: prodLinks.filter((l) => l.discountId === r.id).map((l) => l.storeProductId),
    categoryIds: catLinks.filter((l) => l.discountId === r.id).map((l) => l.storeCategoryId),
  }));
}

/** Codeless discounts apply automatically to every matching cart. */
export async function getAutoDiscounts(): Promise<DiscountLike[]> {
  const rows = await db.select().from(discounts).where(and(eq(discounts.isActive, true), isNull(discounts.code)));
  return toDiscountLike(rows);
}

export async function getDiscountByCode(code: string): Promise<DiscountLike | null> {
  // Codes are stored uppercase (admin auto-uppercases on save) — normalize
  // the lookup so a customer typing lowercase still matches.
  const [row] = await db.select().from(discounts).where(eq(discounts.code, code.trim().toUpperCase())).limit(1);
  if (!row) return null;
  const [result] = await toDiscountLike([row]);
  return result;
}
