import { and, asc, eq, isNull } from "drizzle-orm";
import { db, storeProducts, storeProductTranslations, storeCategories, storeCategoryTranslations } from "@verella/db";
import { DiscountForm } from "@/components/admin/discounts/discount-form";

export default async function NewDiscountPage() {
  const [products, categories] = await Promise.all([
    db
      .select({ id: storeProducts.id, name: storeProductTranslations.name })
      .from(storeProducts)
      .leftJoin(storeProductTranslations, and(eq(storeProductTranslations.productId, storeProducts.id), eq(storeProductTranslations.locale, "en")))
      .where(isNull(storeProducts.deletedAt))
      .orderBy(asc(storeProducts.sortOrder)),
    db
      .select({ id: storeCategories.id, name: storeCategoryTranslations.name })
      .from(storeCategories)
      .leftJoin(storeCategoryTranslations, and(eq(storeCategoryTranslations.categoryId, storeCategories.id), eq(storeCategoryTranslations.locale, "en")))
      .orderBy(asc(storeCategories.sortOrder)),
  ]);

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-bold text-on-surface">New Discount</h1>
      <DiscountForm
        products={products.map((p) => ({ id: p.id, name: p.name ?? `Product #${p.id}` }))}
        categories={categories.map((c) => ({ id: c.id, name: c.name ?? `Category #${c.id}` }))}
      />
    </div>
  );
}
