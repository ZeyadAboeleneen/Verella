"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db, discounts, discountProducts, discountCategories } from "@verella/db";
import { discountSchema, type DiscountInput } from "@verella/core";
import { guardPermission, type ActionResult } from "@/lib/auth/rbac";
import { logActivity } from "@/lib/activity/log";

function revalidateDiscounts() {
  revalidatePath("/admin/discounts");
  revalidatePath("/store");
}

export async function createDiscountAction(input: DiscountInput): Promise<ActionResult<{ id: number }>> {
  const guard = await guardPermission("discounts.manage");
  if ("error" in guard) return guard;

  const parsed = discountSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  const data = parsed.data;

  if (data.code) {
    const [existing] = await db.select({ id: discounts.id }).from(discounts).where(eq(discounts.code, data.code)).limit(1);
    if (existing) return { error: "This discount code is already in use." };
  }

  const id = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(discounts)
      .values({
        name: data.name,
        type: data.type,
        value: data.value,
        scope: data.scope,
        code: data.code || null,
        minOrderTotal: data.minOrderTotal ?? null,
        maxUses: data.maxUses ?? null,
        perUserLimit: data.perUserLimit ?? null,
        startsAt: data.startsAt,
        endsAt: data.endsAt,
        isActive: data.isActive,
      })
      .$returningId();

    if (data.scope === "product" && data.productIds.length > 0) {
      await tx.insert(discountProducts).values(data.productIds.map((storeProductId) => ({ discountId: row.id, storeProductId })));
    }
    if (data.scope === "category" && data.categoryIds.length > 0) {
      await tx.insert(discountCategories).values(data.categoryIds.map((storeCategoryId) => ({ discountId: row.id, storeCategoryId })));
    }
    return row.id;
  });

  await logActivity({ actorUserId: Number(guard.id), action: "discount.created", entityType: "discount", entityId: id });
  revalidateDiscounts();
  return { success: true, data: { id } };
}

export async function updateDiscountAction(id: number, input: DiscountInput): Promise<ActionResult> {
  const guard = await guardPermission("discounts.manage");
  if ("error" in guard) return guard;

  const parsed = discountSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  const data = parsed.data;

  if (data.code) {
    const [existing] = await db.select({ id: discounts.id }).from(discounts).where(eq(discounts.code, data.code)).limit(1);
    if (existing && existing.id !== id) return { error: "This discount code is already in use." };
  }

  await db.transaction(async (tx) => {
    await tx
      .update(discounts)
      .set({
        name: data.name,
        type: data.type,
        value: data.value,
        scope: data.scope,
        code: data.code || null,
        minOrderTotal: data.minOrderTotal ?? null,
        maxUses: data.maxUses ?? null,
        perUserLimit: data.perUserLimit ?? null,
        startsAt: data.startsAt,
        endsAt: data.endsAt,
        isActive: data.isActive,
      })
      .where(eq(discounts.id, id));

    await tx.delete(discountProducts).where(eq(discountProducts.discountId, id));
    await tx.delete(discountCategories).where(eq(discountCategories.discountId, id));

    if (data.scope === "product" && data.productIds.length > 0) {
      await tx.insert(discountProducts).values(data.productIds.map((storeProductId) => ({ discountId: id, storeProductId })));
    }
    if (data.scope === "category" && data.categoryIds.length > 0) {
      await tx.insert(discountCategories).values(data.categoryIds.map((storeCategoryId) => ({ discountId: id, storeCategoryId })));
    }
  });

  await logActivity({ actorUserId: Number(guard.id), action: "discount.updated", entityType: "discount", entityId: id });
  revalidateDiscounts();
  return { success: true };
}

export async function deleteDiscountAction(id: number): Promise<ActionResult> {
  const guard = await guardPermission("discounts.manage");
  if ("error" in guard) return guard;

  await db.delete(discounts).where(eq(discounts.id, id));
  await logActivity({ actorUserId: Number(guard.id), action: "discount.deleted", entityType: "discount", entityId: id });
  revalidateDiscounts();
  return { success: true };
}

export async function toggleDiscountActiveAction(id: number, isActive: boolean): Promise<ActionResult> {
  const guard = await guardPermission("discounts.manage");
  if ("error" in guard) return guard;

  await db.update(discounts).set({ isActive }).where(eq(discounts.id, id));
  await logActivity({ actorUserId: Number(guard.id), action: "discount.toggled", entityType: "discount", entityId: id, changes: { isActive } });
  revalidateDiscounts();
  return { success: true };
}
