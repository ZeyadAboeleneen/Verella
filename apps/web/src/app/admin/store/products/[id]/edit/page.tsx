import { notFound } from "next/navigation";
import { and, asc, eq, inArray } from "drizzle-orm";
import {
  db,
  storeProducts,
  storeProductTranslations,
  storeProductMedia,
  storeProductVariants,
  storeProductVariantTranslations,
  storeCategories,
  storeCategoryTranslations,
  media,
} from "@verella/db";
import { getCatalogBrands } from "@/lib/store/admin-queries";
import { StoreProductForm } from "@/components/admin/store/product-form";

export default async function EditStoreProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const productId = Number(id);

  const [product] = await db.select().from(storeProducts).where(eq(storeProducts.id, productId)).limit(1);
  if (!product || product.deletedAt) notFound();

  const [translations, categories, productMedia, variants, brands] = await Promise.all([
    db.select().from(storeProductTranslations).where(eq(storeProductTranslations.productId, productId)),
    db
      .select({ id: storeCategories.id, name: storeCategoryTranslations.name })
      .from(storeCategories)
      .leftJoin(storeCategoryTranslations, and(eq(storeCategoryTranslations.categoryId, storeCategories.id), eq(storeCategoryTranslations.locale, "en")))
      .orderBy(asc(storeCategories.sortOrder)),
    // Ordered by sortOrder so index 0 is always the primary/cover image —
    // matches the ordering contract MediaGalleryPicker + store/actions.ts use.
    db
      .select({ mediaId: storeProductMedia.mediaId, url: media.url })
      .from(storeProductMedia)
      .innerJoin(media, eq(media.id, storeProductMedia.mediaId))
      .where(eq(storeProductMedia.productId, productId))
      .orderBy(asc(storeProductMedia.sortOrder)),
    db.select().from(storeProductVariants).where(eq(storeProductVariants.productId, productId)).orderBy(asc(storeProductVariants.sortOrder)),
    getCatalogBrands(),
  ]);
  const variantTranslations = variants.length
    ? await db
        .select()
        .from(storeProductVariantTranslations)
        .where(and(inArray(storeProductVariantTranslations.variantId, variants.map((v) => v.id)), eq(storeProductVariantTranslations.locale, "ar")))
    : [];

  const en = translations.find((t) => t.locale === "en");
  const ar = translations.find((t) => t.locale === "ar");
  const images = productMedia.map((m) => ({ id: m.mediaId, url: m.url }));

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-bold text-on-surface">Edit product</h1>
      <StoreProductForm
        productId={productId}
        brands={brands}
        categories={categories.map((c) => ({ id: c.id, name: c.name ?? `Category #${c.id}` }))}
        defaultValues={{
          categoryId: product.categoryId,
          slug: product.slug,
          sku: product.sku ?? "",
          brand: product.brand ?? "",
          variantAxis: variants[0]?.axis ?? "volume",
          variants: variants.map((v) => ({
            id: v.id,
            label: v.label,
            labelAr: variantTranslations.find((t) => t.variantId === v.id)?.label ?? "",
            sku: v.sku ?? "",
            price: v.price,
            compareAtPrice: v.compareAtPrice,
            stockQty: v.stockQty,
            isActive: v.isActive,
          })),
          price: product.price,
          compareAtPrice: product.compareAtPrice,
          isBestSeller: product.isBestSeller,
          isFeaturedHome: product.isFeaturedHome,
          isActive: product.isActive,
          sortOrder: product.sortOrder,
          stockQty: product.stockQty,
          name: { en: en?.name ?? "", ar: ar?.name ?? "" },
          description: { en: en?.description ?? "", ar: ar?.description ?? "" },
          notes: { en: en?.notes ?? "", ar: ar?.notes ?? "" },
          images,
        }}
      />
    </div>
  );
}
