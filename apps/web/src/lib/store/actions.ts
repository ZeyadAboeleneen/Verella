"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import {
  db,
  storeCategories,
  storeCategoryTranslations,
  storeProducts,
  storeProductTranslations,
  storeProductMedia,
  storeHeroImages,
} from "@verella/db";
import {
  storeCategorySchema,
  storeProductSchema,
  storeHeroImageSchema,
  type StoreCategoryInput,
  type StoreProductInput,
  type StoreHeroImageInput,
} from "@verella/core";
import { guardPermission, type ActionResult } from "@/lib/auth/rbac";
import { logActivity } from "@/lib/activity/log";
import { getSiteCurrency } from "@/lib/settings/queries";

function revalidateStore() {
  revalidatePath("/admin/store");
  revalidatePath("/admin/store/products");
  revalidatePath("/store");
  // Featured/best-seller toggles render on the homepage, not just /store —
  // without this the home page keeps serving a stale render after a toggle.
  revalidatePath("/");
}

// ── Categories ────────────────────────────────────────────────────────────

export async function createStoreCategoryAction(input: StoreCategoryInput): Promise<ActionResult<{ id: number }>> {
  const guard = await guardPermission("store.manage");
  if ("error" in guard) return guard;

  const parsed = storeCategorySchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  const data = parsed.data;

  const [existing] = await db.select({ id: storeCategories.id }).from(storeCategories).where(eq(storeCategories.slug, data.slug)).limit(1);
  if (existing) return { error: "A category with this slug already exists." };

  const id = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(storeCategories)
      .values({ slug: data.slug, imageMediaId: data.imageMediaId ?? null, sortOrder: data.sortOrder, isActive: data.isActive })
      .$returningId();
    await tx.insert(storeCategoryTranslations).values([
      { categoryId: row.id, locale: "en", name: data.name.en, description: data.description?.en || null },
      ...(data.name.ar ? [{ categoryId: row.id, locale: "ar" as const, name: data.name.ar, description: data.description?.ar || null }] : []),
    ]);
    return row.id;
  });

  await logActivity({ actorUserId: Number(guard.id), action: "store_category.created", entityType: "store_category", entityId: id });
  revalidateStore();
  return { success: true, data: { id } };
}

export async function updateStoreCategoryAction(id: number, input: StoreCategoryInput): Promise<ActionResult> {
  const guard = await guardPermission("store.manage");
  if ("error" in guard) return guard;

  const parsed = storeCategorySchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  const data = parsed.data;

  await db.transaction(async (tx) => {
    await tx
      .update(storeCategories)
      .set({ slug: data.slug, imageMediaId: data.imageMediaId ?? null, sortOrder: data.sortOrder, isActive: data.isActive })
      .where(eq(storeCategories.id, id));

    await tx.delete(storeCategoryTranslations).where(eq(storeCategoryTranslations.categoryId, id));
    await tx.insert(storeCategoryTranslations).values([
      { categoryId: id, locale: "en", name: data.name.en, description: data.description?.en || null },
      ...(data.name.ar ? [{ categoryId: id, locale: "ar" as const, name: data.name.ar, description: data.description?.ar || null }] : []),
    ]);
  });

  await logActivity({ actorUserId: Number(guard.id), action: "store_category.updated", entityType: "store_category", entityId: id });
  revalidateStore();
  return { success: true };
}

export async function deleteStoreCategoryAction(id: number): Promise<ActionResult> {
  const guard = await guardPermission("store.manage");
  if ("error" in guard) return guard;

  const [productInCategory] = await db.select({ id: storeProducts.id }).from(storeProducts).where(eq(storeProducts.categoryId, id)).limit(1);
  if (productInCategory) return { error: "Move or delete this category's products before deleting it." };

  await db.delete(storeCategories).where(eq(storeCategories.id, id));
  await logActivity({ actorUserId: Number(guard.id), action: "store_category.deleted", entityType: "store_category", entityId: id });
  revalidateStore();
  return { success: true };
}

export async function toggleStoreCategoryActiveAction(id: number, isActive: boolean): Promise<ActionResult> {
  const guard = await guardPermission("store.manage");
  if ("error" in guard) return guard;

  await db.update(storeCategories).set({ isActive }).where(eq(storeCategories.id, id));
  await logActivity({ actorUserId: Number(guard.id), action: "store_category.toggled", entityType: "store_category", entityId: id, changes: { isActive } });
  revalidateStore();
  return { success: true };
}

export async function reorderStoreCategoriesAction(orderedIds: number[]): Promise<ActionResult> {
  const guard = await guardPermission("store.manage");
  if ("error" in guard) return guard;

  await db.transaction(async (tx) => {
    for (let i = 0; i < orderedIds.length; i++) {
      await tx.update(storeCategories).set({ sortOrder: i }).where(eq(storeCategories.id, orderedIds[i]));
    }
  });
  await logActivity({ actorUserId: Number(guard.id), action: "store_category.reordered", entityType: "store_category" });
  revalidateStore();
  return { success: true };
}

// ── Products ──────────────────────────────────────────────────────────────

export async function createStoreProductAction(input: StoreProductInput): Promise<ActionResult<{ id: number }>> {
  const guard = await guardPermission("store.manage");
  if ("error" in guard) return guard;

  const parsed = storeProductSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  const data = parsed.data;

  const [existing] = await db.select({ id: storeProducts.id }).from(storeProducts).where(eq(storeProducts.slug, data.slug)).limit(1);
  if (existing) return { error: "A product with this slug already exists." };

  const currency = await getSiteCurrency();

  const id = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(storeProducts)
      .values({
        categoryId: data.categoryId,
        slug: data.slug,
        sku: data.sku || null,
        price: data.price,
        currency,
        compareAtPrice: data.compareAtPrice ?? null,
        isBestSeller: data.isBestSeller,
        isFeaturedHome: data.isFeaturedHome,
        isActive: data.isActive,
        sortOrder: data.sortOrder,
        stockQty: data.stockQty,
      })
      .$returningId();
    await tx.insert(storeProductTranslations).values([
      { productId: row.id, locale: "en", name: data.name.en, description: data.description?.en || null, notes: data.notes?.en || null },
      ...(data.name.ar
        ? [{ productId: row.id, locale: "ar" as const, name: data.name.ar, description: data.description?.ar || null, notes: data.notes?.ar || null }]
        : []),
    ]);
    if (data.mediaIds.length > 0) {
      await tx.insert(storeProductMedia).values(
        data.mediaIds.map((mediaId, i) => ({ productId: row.id, mediaId, sortOrder: i, isPrimary: i === 0 })),
      );
    }
    return row.id;
  });

  await logActivity({ actorUserId: Number(guard.id), action: "store_product.created", entityType: "store_product", entityId: id });
  revalidateStore();
  return { success: true, data: { id } };
}

export async function updateStoreProductAction(id: number, input: StoreProductInput): Promise<ActionResult> {
  const guard = await guardPermission("store.manage");
  if ("error" in guard) return guard;

  const parsed = storeProductSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  const data = parsed.data;

  await db.transaction(async (tx) => {
    await tx
      .update(storeProducts)
      .set({
        categoryId: data.categoryId,
        slug: data.slug,
        sku: data.sku || null,
        price: data.price,
        compareAtPrice: data.compareAtPrice ?? null,
        isBestSeller: data.isBestSeller,
        isFeaturedHome: data.isFeaturedHome,
        isActive: data.isActive,
        sortOrder: data.sortOrder,
        stockQty: data.stockQty,
      })
      .where(eq(storeProducts.id, id));

    await tx.delete(storeProductTranslations).where(eq(storeProductTranslations.productId, id));
    await tx.insert(storeProductTranslations).values([
      { productId: id, locale: "en", name: data.name.en, description: data.description?.en || null, notes: data.notes?.en || null },
      ...(data.name.ar
        ? [{ productId: id, locale: "ar" as const, name: data.name.ar, description: data.description?.ar || null, notes: data.notes?.ar || null }]
        : []),
    ]);

    await tx.delete(storeProductMedia).where(eq(storeProductMedia.productId, id));
    if (data.mediaIds.length > 0) {
      await tx.insert(storeProductMedia).values(
        data.mediaIds.map((mediaId, i) => ({ productId: id, mediaId, sortOrder: i, isPrimary: i === 0 })),
      );
    }
  });

  await logActivity({ actorUserId: Number(guard.id), action: "store_product.updated", entityType: "store_product", entityId: id });
  revalidateStore();
  return { success: true };
}

export async function deleteStoreProductAction(id: number): Promise<ActionResult> {
  const guard = await guardPermission("store.manage");
  if ("error" in guard) return guard;

  // Soft delete: past orders reference this product (orderItems.storeProductId
  // is ON DELETE SET NULL, not cascade), and a hard delete would make it
  // unrecoverable and break the admin's ability to look back at what was sold.
  // The slug is freed up (renamed) so a new product can reuse it — `slug` has
  // a DB-level unique constraint that a soft-deleted row would otherwise still hold.
  const [existingProduct] = await db.select({ slug: storeProducts.slug }).from(storeProducts).where(eq(storeProducts.id, id)).limit(1);
  await db
    .update(storeProducts)
    .set({ deletedAt: new Date(), isActive: false, slug: `${existingProduct?.slug ?? "product"}-deleted-${id}` })
    .where(eq(storeProducts.id, id));
  await logActivity({ actorUserId: Number(guard.id), action: "store_product.deleted", entityType: "store_product", entityId: id });
  revalidateStore();
  return { success: true };
}

// ── Hero images ───────────────────────────────────────────────────────────

export async function createStoreHeroImageAction(input: StoreHeroImageInput): Promise<ActionResult<{ id: number }>> {
  const guard = await guardPermission("store.manage");
  if ("error" in guard) return guard;

  const parsed = storeHeroImageSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const [row] = await db.insert(storeHeroImages).values(parsed.data).$returningId();
  await logActivity({ actorUserId: Number(guard.id), action: "store_hero_image.created", entityType: "store_hero_image", entityId: row.id });
  revalidateStore();
  return { success: true, data: { id: row.id } };
}

export async function toggleStoreHeroImageAction(id: number, isActive: boolean): Promise<ActionResult> {
  const guard = await guardPermission("store.manage");
  if ("error" in guard) return guard;

  await db.update(storeHeroImages).set({ isActive }).where(eq(storeHeroImages.id, id));
  await logActivity({ actorUserId: Number(guard.id), action: "store_hero_image.toggled", entityType: "store_hero_image", entityId: id, changes: { isActive } });
  revalidateStore();
  return { success: true };
}

export async function deleteStoreHeroImageAction(id: number): Promise<ActionResult> {
  const guard = await guardPermission("store.manage");
  if ("error" in guard) return guard;

  await db.delete(storeHeroImages).where(eq(storeHeroImages.id, id));
  await logActivity({ actorUserId: Number(guard.id), action: "store_hero_image.deleted", entityType: "store_hero_image", entityId: id });
  revalidateStore();
  return { success: true };
}
