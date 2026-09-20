import { and, asc, eq } from "drizzle-orm";
import { db, storeCategories, storeCategoryTranslations } from "@verella/db";
import { StoreProductForm } from "@/components/admin/store/product-form";

export default async function NewStoreProductPage() {
  const categories = await db
    .select({ id: storeCategories.id, name: storeCategoryTranslations.name })
    .from(storeCategories)
    .leftJoin(storeCategoryTranslations, and(eq(storeCategoryTranslations.categoryId, storeCategories.id), eq(storeCategoryTranslations.locale, "en")))
    .orderBy(asc(storeCategories.sortOrder));

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-bold text-on-surface">New Store Product</h1>
      <StoreProductForm categories={categories.map((c) => ({ id: c.id, name: c.name ?? `Category #${c.id}` }))} />
    </div>
  );
}
