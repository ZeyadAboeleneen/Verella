import { asc, and, eq } from "drizzle-orm";
import { db, menuCategories, menuCategoryTranslations } from "@verella/db";
import { MenuItemForm } from "@/components/admin/menu/item-form";

export default async function NewMenuItemPage() {
  const categories = await db
    .select({ id: menuCategories.id, name: menuCategoryTranslations.name })
    .from(menuCategories)
    .leftJoin(menuCategoryTranslations, and(eq(menuCategoryTranslations.categoryId, menuCategories.id), eq(menuCategoryTranslations.locale, "en")))
    .orderBy(asc(menuCategories.sortOrder));

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-bold text-on-surface">New Menu Item</h1>
      <MenuItemForm categories={categories.map((c) => ({ id: c.id, name: c.name ?? `Category #${c.id}` }))} />
    </div>
  );
}
