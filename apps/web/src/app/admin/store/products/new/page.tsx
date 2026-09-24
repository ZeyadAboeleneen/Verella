import { and, asc, eq } from "drizzle-orm";
import { db, storeCategories, storeCategoryTranslations } from "@verella/db";
import { StoreProductForm } from "@/components/admin/store/product-form";
import { getCatalogBrands } from "@/lib/store/admin-queries";

export default async function NewStoreProductPage() {
  const [categories, brands] = await Promise.all([
    db
      .select({ id: storeCategories.id, name: storeCategoryTranslations.name })
      .from(storeCategories)
      .leftJoin(storeCategoryTranslations, and(eq(storeCategoryTranslations.categoryId, storeCategories.id), eq(storeCategoryTranslations.locale, "en")))
      .orderBy(asc(storeCategories.sortOrder)),
    getCatalogBrands(),
  ]);

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-bold text-on-surface">New product</h1>
      <StoreProductForm brands={brands} categories={categories.map((c) => ({ id: c.id, name: c.name ?? `Category #${c.id}` }))} />
    </div>
  );
}
