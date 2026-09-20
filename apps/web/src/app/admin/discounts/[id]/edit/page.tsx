import { notFound } from "next/navigation";
import { and, asc, eq, isNull } from "drizzle-orm";
import {
  db,
  discounts,
  discountProducts,
  discountCategories,
  storeProducts,
  storeProductTranslations,
  storeCategories,
  storeCategoryTranslations,
} from "@verella/db";
import { DiscountForm } from "@/components/admin/discounts/discount-form";

export default async function EditDiscountPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const discountId = Number(id);

  const [discount] = await db.select().from(discounts).where(eq(discounts.id, discountId)).limit(1);
  if (!discount) notFound();

  const [products, categories, linkedProducts, linkedCategories] = await Promise.all([
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
    db.select({ id: discountProducts.storeProductId }).from(discountProducts).where(eq(discountProducts.discountId, discountId)),
    db.select({ id: discountCategories.storeCategoryId }).from(discountCategories).where(eq(discountCategories.discountId, discountId)),
  ]);

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-bold text-on-surface">Edit Discount</h1>
      <DiscountForm
        discountId={discountId}
        products={products.map((p) => ({ id: p.id, name: p.name ?? `Product #${p.id}` }))}
        categories={categories.map((c) => ({ id: c.id, name: c.name ?? `Category #${c.id}` }))}
        defaultValues={{
          name: discount.name,
          type: discount.type,
          value: discount.value,
          scope: discount.scope,
          code: discount.code ?? "",
          minOrderTotal: discount.minOrderTotal,
          maxUses: discount.maxUses,
          perUserLimit: discount.perUserLimit,
          startsAt: discount.startsAt,
          endsAt: discount.endsAt,
          isActive: discount.isActive,
          productIds: linkedProducts.map((p) => p.id),
          categoryIds: linkedCategories.map((c) => c.id),
        }}
      />
    </div>
  );
}
