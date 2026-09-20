import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { db, menuItems, menuItemTranslations, menuItemSizes, menuCategories, menuCategoryTranslations, media } from "@verella/db";
import { MenuItemForm } from "@/components/admin/menu/item-form";

export default async function EditMenuItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const itemId = Number(id);

  const [item] = await db.select().from(menuItems).where(eq(menuItems.id, itemId)).limit(1);
  if (!item || item.deletedAt) notFound();

  const [translations, categories, sizes] = await Promise.all([
    db.select().from(menuItemTranslations).where(eq(menuItemTranslations.itemId, itemId)),
    db
      .select({ id: menuCategories.id, name: menuCategoryTranslations.name })
      .from(menuCategories)
      .leftJoin(menuCategoryTranslations, and(eq(menuCategoryTranslations.categoryId, menuCategories.id), eq(menuCategoryTranslations.locale, "en")))
      .orderBy(asc(menuCategories.sortOrder)),
    db.select().from(menuItemSizes).where(eq(menuItemSizes.itemId, itemId)).orderBy(asc(menuItemSizes.sortOrder)),
  ]);

  const en = translations.find((t) => t.locale === "en");
  const ar = translations.find((t) => t.locale === "ar");

  let image: { id: number; url: string } | null = null;
  if (item.imageMediaId) {
    const [row] = await db.select({ id: media.id, url: media.url }).from(media).where(eq(media.id, item.imageMediaId)).limit(1);
    if (row) image = row;
  }

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-bold text-on-surface">Edit Menu Item</h1>
      <MenuItemForm
        itemId={itemId}
        categories={categories.map((c) => ({ id: c.id, name: c.name ?? `Category #${c.id}` }))}
        defaultValues={{
          categoryId: item.categoryId,
          slug: item.slug,
          sizes: sizes.map((s) => ({ id: s.id, size: s.size, price: s.price, sortOrder: s.sortOrder })),
          badge: item.badge ?? "",
          isFeatured: item.isFeatured,
          isNew: item.isNew,
          isActive: item.isActive,
          sortOrder: item.sortOrder,
          name: { en: en?.name ?? "", ar: ar?.name ?? "" },
          description: { en: en?.description ?? "", ar: ar?.description ?? "" },
          notes: { en: en?.notes ?? "", ar: ar?.notes ?? "" },
          image,
        }}
      />
    </div>
  );
}
