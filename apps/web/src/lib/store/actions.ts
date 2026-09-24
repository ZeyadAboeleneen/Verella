"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray, notInArray } from "drizzle-orm";
import {
  db,
  storeCategories,
  storeCategoryTranslations,
  storeProducts,
  storeProductTranslations,
  storeProductMedia,
  storeProductVariants,
  storeProductVariantTranslations,
} from "@verella/db";
import {
  storeCategorySchema,
  storeProductSchema,
  type StoreCategoryInput,
  type StoreProductInput,
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

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * With variants, price and stock live on each variant: the product row keeps
 * the cheapest variant as its "from" price and holds no stock of its own.
 */
function productPricing(data: StoreProductInput) {
  if (data.variants.length === 0) {
    return { price: data.price, compareAtPrice: data.compareAtPrice ?? null, stockQty: data.stockQty };
  }
  const cheapest = data.variants.reduce((min, v) => (Number(v.price) < Number(min.price) ? v : min), data.variants[0]);
  return { price: cheapest.price, compareAtPrice: cheapest.compareAtPrice ?? null, stockQty: 0 };
}

/** Make the product's variants match the submitted list: update, insert, and drop the rest. */
async function syncVariants(tx: Tx, productId: number, data: StoreProductInput) {
  const existing = await tx
    .select({ id: storeProductVariants.id })
    .from(storeProductVariants)
    .where(eq(storeProductVariants.productId, productId));
  const existingIds = new Set(existing.map((v) => v.id));
  const keptIds = data.variants.map((v) => v.id).filter((id): id is number => !!id && existingIds.has(id));

  // Removed variants: order history keeps its own label snapshot, so deleting is safe.
  await tx
    .delete(storeProductVariants)
    .where(
      keptIds.length
        ? and(eq(storeProductVariants.productId, productId), notInArray(storeProductVariants.id, keptIds))
        : eq(storeProductVariants.productId, productId),
    );

  for (const [i, v] of data.variants.entries()) {
    const values = {
      axis: data.variantAxis,
      label: v.label,
      sku: v.sku || null,
      price: v.price,
      compareAtPrice: v.compareAtPrice ?? null,
      stockQty: v.stockQty,
      isActive: v.isActive,
      sortOrder: i,
    };
    let variantId: number;
    if (v.id && existingIds.has(v.id)) {
      variantId = v.id;
      await tx.update(storeProductVariants).set(values).where(eq(storeProductVariants.id, variantId));
    } else {
      const [row] = await tx.insert(storeProductVariants).values({ productId, ...values }).$returningId();
      variantId = row.id;
    }
    await tx.delete(storeProductVariantTranslations).where(eq(storeProductVariantTranslations.variantId, variantId));
    if (v.labelAr) {
      await tx.insert(storeProductVariantTranslations).values([
        { variantId, locale: "en", label: v.label },
        { variantId, locale: "ar", label: v.labelAr },
      ]);
    }
  }
}

/** Variant SKUs are globally unique — surface a clash as a readable error, not a DB exception. */
async function findSkuClash(data: StoreProductInput, productId?: number): Promise<string | null> {
  const skus = data.variants.map((v) => v.sku?.trim()).filter((s): s is string => !!s);
  if (new Set(skus).size !== skus.length) return "Two variants share the same SKU.";
  if (skus.length === 0) return null;
  const clashes = await db
    .select({ sku: storeProductVariants.sku, productId: storeProductVariants.productId })
    .from(storeProductVariants)
    .where(inArray(storeProductVariants.sku, skus));
  const foreign = clashes.find((c) => c.productId !== productId);
  return foreign ? `SKU "${foreign.sku}" is already used by another product.` : null;
}

export async function createStoreProductAction(input: StoreProductInput): Promise<ActionResult<{ id: number }>> {
  const guard = await guardPermission("store.manage");
  if ("error" in guard) return guard;

  const parsed = storeProductSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  const data = parsed.data;

  const [existing] = await db.select({ id: storeProducts.id }).from(storeProducts).where(eq(storeProducts.slug, data.slug)).limit(1);
  if (existing) return { error: "A product with this slug already exists." };
  const skuError = await findSkuClash(data);
  if (skuError) return { error: skuError };

  const currency = await getSiteCurrency();

  const id = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(storeProducts)
      .values({
        categoryId: data.categoryId,
        slug: data.slug,
        sku: data.sku || null,
        brand: data.brand || null,
        ...productPricing(data),
        currency,
        isBestSeller: data.isBestSeller,
        isFeaturedHome: data.isFeaturedHome,
        isActive: data.isActive,
        sortOrder: data.sortOrder,
      })
      .$returningId();
    await syncVariants(tx, row.id, data);
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

  const [slugOwner] = await db.select({ id: storeProducts.id }).from(storeProducts).where(eq(storeProducts.slug, data.slug)).limit(1);
  if (slugOwner && slugOwner.id !== id) return { error: "A product with this slug already exists." };
  const skuError = await findSkuClash(data, id);
  if (skuError) return { error: skuError };

  await db.transaction(async (tx) => {
    await tx
      .update(storeProducts)
      .set({
        categoryId: data.categoryId,
        slug: data.slug,
        sku: data.sku || null,
        brand: data.brand || null,
        ...productPricing(data),
        isBestSeller: data.isBestSeller,
        isFeaturedHome: data.isFeaturedHome,
        isActive: data.isActive,
        sortOrder: data.sortOrder,
      })
      .where(eq(storeProducts.id, id));
    await syncVariants(tx, id, data);

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
