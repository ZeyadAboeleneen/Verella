"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import {
  db,
  menuCategories,
  menuCategoryTranslations,
  menuItems,
  menuItemTranslations,
  menuItemSizes,
  menuHeroImages,
} from "@verella/db";
import { menuCategorySchema, menuItemSchema, menuHeroImageSchema, type MenuCategoryInput, type MenuItemInput, type MenuHeroImageInput } from "@verella/core";
import { guardPermission } from "@/lib/auth/rbac";
import type { ActionResult } from "@/lib/auth/rbac";
import { logActivity } from "@/lib/activity/log";

function revalidateMenu() {
  revalidatePath("/admin/menu");
  revalidatePath("/admin/menu/items");
  revalidatePath("/admin/menu/hero");
  revalidatePath("/menu");
}

// ── Categories ────────────────────────────────────────────────────────────

export async function createMenuCategoryAction(input: MenuCategoryInput): Promise<ActionResult<{ id: number }>> {
  const guard = await guardPermission("menu.manage");
  if ("error" in guard) return guard;

  const parsed = menuCategorySchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  const data = parsed.data;

  const [existing] = await db.select({ id: menuCategories.id }).from(menuCategories).where(eq(menuCategories.slug, data.slug)).limit(1);
  if (existing) return { error: "A category with this slug already exists." };

  const id = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(menuCategories)
      .values({ slug: data.slug, icon: data.icon, imageMediaId: data.imageMediaId ?? null, sortOrder: data.sortOrder, isActive: data.isActive })
      .$returningId();
    await tx.insert(menuCategoryTranslations).values([
      { categoryId: row.id, locale: "en", name: data.name.en, description: data.description?.en || null },
      ...(data.name.ar ? [{ categoryId: row.id, locale: "ar" as const, name: data.name.ar, description: data.description?.ar || null }] : []),
    ]);
    return row.id;
  });

  await logActivity({ actorUserId: Number(guard.id), action: "menu_category.created", entityType: "menu_category", entityId: id });
  revalidateMenu();
  return { success: true, data: { id } };
}

export async function updateMenuCategoryAction(id: number, input: MenuCategoryInput): Promise<ActionResult> {
  const guard = await guardPermission("menu.manage");
  if ("error" in guard) return guard;

  const parsed = menuCategorySchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  const data = parsed.data;

  await db.transaction(async (tx) => {
    await tx
      .update(menuCategories)
      .set({ slug: data.slug, icon: data.icon, imageMediaId: data.imageMediaId ?? null, sortOrder: data.sortOrder, isActive: data.isActive })
      .where(eq(menuCategories.id, id));

    await tx.delete(menuCategoryTranslations).where(eq(menuCategoryTranslations.categoryId, id));
    await tx.insert(menuCategoryTranslations).values([
      { categoryId: id, locale: "en", name: data.name.en, description: data.description?.en || null },
      ...(data.name.ar ? [{ categoryId: id, locale: "ar" as const, name: data.name.ar, description: data.description?.ar || null }] : []),
    ]);
  });

  await logActivity({ actorUserId: Number(guard.id), action: "menu_category.updated", entityType: "menu_category", entityId: id });
  revalidateMenu();
  return { success: true };
}

export async function deleteMenuCategoryAction(id: number): Promise<ActionResult> {
  const guard = await guardPermission("menu.manage");
  if ("error" in guard) return guard;

  const [itemInCategory] = await db.select({ id: menuItems.id }).from(menuItems).where(eq(menuItems.categoryId, id)).limit(1);
  if (itemInCategory) return { error: "Move or delete this category's items before deleting it." };

  await db.delete(menuCategories).where(eq(menuCategories.id, id));
  await logActivity({ actorUserId: Number(guard.id), action: "menu_category.deleted", entityType: "menu_category", entityId: id });
  revalidateMenu();
  return { success: true };
}

export async function toggleMenuCategoryActiveAction(id: number, isActive: boolean): Promise<ActionResult> {
  const guard = await guardPermission("menu.manage");
  if ("error" in guard) return guard;

  await db.update(menuCategories).set({ isActive }).where(eq(menuCategories.id, id));
  await logActivity({ actorUserId: Number(guard.id), action: "menu_category.toggled", entityType: "menu_category", entityId: id, changes: { isActive } });
  revalidateMenu();
  return { success: true };
}

export async function reorderMenuCategoriesAction(orderedIds: number[]): Promise<ActionResult> {
  const guard = await guardPermission("menu.manage");
  if ("error" in guard) return guard;

  await db.transaction(async (tx) => {
    for (let i = 0; i < orderedIds.length; i++) {
      await tx.update(menuCategories).set({ sortOrder: i }).where(eq(menuCategories.id, orderedIds[i]));
    }
  });
  await logActivity({ actorUserId: Number(guard.id), action: "menu_category.reordered", entityType: "menu_category" });
  revalidateMenu();
  return { success: true };
}

// ── Items ─────────────────────────────────────────────────────────────────

export async function createMenuItemAction(input: MenuItemInput): Promise<ActionResult<{ id: number }>> {
  const guard = await guardPermission("menu.manage");
  if ("error" in guard) return guard;

  const parsed = menuItemSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  const data = parsed.data;

  const [existing] = await db.select({ id: menuItems.id }).from(menuItems).where(eq(menuItems.slug, data.slug)).limit(1);
  if (existing) return { error: "An item with this slug already exists." };

  const id = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(menuItems)
      .values({
        categoryId: data.categoryId,
        slug: data.slug,
        imageMediaId: data.imageMediaId ?? null,
        badge: data.badge,
        isFeatured: data.isFeatured,
        isNew: data.isNew,
        isActive: data.isActive,
        sortOrder: data.sortOrder,
      })
      .$returningId();
    await tx.insert(menuItemTranslations).values([
      { itemId: row.id, locale: "en", name: data.name.en, description: data.description?.en || null, notes: data.notes?.en || null },
      ...(data.name.ar
        ? [{ itemId: row.id, locale: "ar" as const, name: data.name.ar, description: data.description?.ar || null, notes: data.notes?.ar || null }]
        : []),
    ]);
    await tx.insert(menuItemSizes).values(
      data.sizes.map((s, i) => ({ itemId: row.id, size: s.size, price: s.price, sortOrder: s.sortOrder ?? i })),
    );
    return row.id;
  });

  await logActivity({ actorUserId: Number(guard.id), action: "menu_item.created", entityType: "menu_item", entityId: id });
  revalidateMenu();
  return { success: true, data: { id } };
}

export async function updateMenuItemAction(id: number, input: MenuItemInput): Promise<ActionResult> {
  const guard = await guardPermission("menu.manage");
  if ("error" in guard) return guard;

  const parsed = menuItemSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  const data = parsed.data;

  await db.transaction(async (tx) => {
    await tx
      .update(menuItems)
      .set({
        categoryId: data.categoryId,
        slug: data.slug,
        imageMediaId: data.imageMediaId ?? null,
        badge: data.badge,
        isFeatured: data.isFeatured,
        isNew: data.isNew,
        isActive: data.isActive,
        sortOrder: data.sortOrder,
      })
      .where(eq(menuItems.id, id));

    await tx.delete(menuItemTranslations).where(eq(menuItemTranslations.itemId, id));
    await tx.insert(menuItemTranslations).values([
      { itemId: id, locale: "en", name: data.name.en, description: data.description?.en || null, notes: data.notes?.en || null },
      ...(data.name.ar
        ? [{ itemId: id, locale: "ar" as const, name: data.name.ar, description: data.description?.ar || null, notes: data.notes?.ar || null }]
        : []),
    ]);

    // Replace-all: simplest way to reconcile added/removed/reordered size
    // rows without diffing — matches the translations pattern above.
    await tx.delete(menuItemSizes).where(eq(menuItemSizes.itemId, id));
    await tx.insert(menuItemSizes).values(
      data.sizes.map((s, i) => ({ itemId: id, size: s.size, price: s.price, sortOrder: s.sortOrder ?? i })),
    );
  });

  await logActivity({ actorUserId: Number(guard.id), action: "menu_item.updated", entityType: "menu_item", entityId: id });
  revalidateMenu();
  return { success: true };
}

export async function deleteMenuItemAction(id: number): Promise<ActionResult> {
  const guard = await guardPermission("menu.manage");
  if ("error" in guard) return guard;

  // Soft delete — see deleteStoreProductAction for why this isn't a hard delete,
  // and why the slug is renamed (frees it up for reuse under the unique constraint).
  const [existingItem] = await db.select({ slug: menuItems.slug }).from(menuItems).where(eq(menuItems.id, id)).limit(1);
  await db
    .update(menuItems)
    .set({ deletedAt: new Date(), isActive: false, slug: `${existingItem?.slug ?? "item"}-deleted-${id}` })
    .where(eq(menuItems.id, id));
  await logActivity({ actorUserId: Number(guard.id), action: "menu_item.deleted", entityType: "menu_item", entityId: id });
  revalidateMenu();
  return { success: true };
}

// ── Hero images ───────────────────────────────────────────────────────────

export async function createMenuHeroImageAction(input: MenuHeroImageInput): Promise<ActionResult<{ id: number }>> {
  const guard = await guardPermission("menu.manage");
  if ("error" in guard) return guard;

  const parsed = menuHeroImageSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const [row] = await db.insert(menuHeroImages).values(parsed.data).$returningId();
  await logActivity({ actorUserId: Number(guard.id), action: "menu_hero_image.created", entityType: "menu_hero_image", entityId: row.id });
  revalidateMenu();
  return { success: true, data: { id: row.id } };
}

export async function toggleMenuHeroImageAction(id: number, isActive: boolean): Promise<ActionResult> {
  const guard = await guardPermission("menu.manage");
  if ("error" in guard) return guard;

  await db.update(menuHeroImages).set({ isActive }).where(eq(menuHeroImages.id, id));
  await logActivity({ actorUserId: Number(guard.id), action: "menu_hero_image.toggled", entityType: "menu_hero_image", entityId: id, changes: { isActive } });
  revalidateMenu();
  return { success: true };
}

export async function deleteMenuHeroImageAction(id: number): Promise<ActionResult> {
  const guard = await guardPermission("menu.manage");
  if ("error" in guard) return guard;

  await db.delete(menuHeroImages).where(eq(menuHeroImages.id, id));
  await logActivity({ actorUserId: Number(guard.id), action: "menu_hero_image.deleted", entityType: "menu_hero_image", entityId: id });
  revalidateMenu();
  return { success: true };
}
