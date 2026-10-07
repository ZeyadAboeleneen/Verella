import "server-only";
import { and, asc, eq, isNull } from "drizzle-orm";
import { db, storeCategories, storeCategoryTranslations, storeProducts, storeProductTranslations } from "@verella/db";
import type { LinkTarget } from "@/components/admin/offers/offer-form";

/** Everything an offer's button can link to: main pages, categories, products. */
export async function getOfferLinkTargets(): Promise<LinkTarget[]> {
  const [categories, products] = await Promise.all([
    db
      .select({ slug: storeCategories.slug, name: storeCategoryTranslations.name, isActive: storeCategories.isActive })
      .from(storeCategories)
      .leftJoin(storeCategoryTranslations, and(eq(storeCategoryTranslations.categoryId, storeCategories.id), eq(storeCategoryTranslations.locale, "en")))
      .orderBy(asc(storeCategories.sortOrder)),
    db
      .select({ slug: storeProducts.slug, name: storeProductTranslations.name, brand: storeProducts.brand })
      .from(storeProducts)
      .leftJoin(storeProductTranslations, and(eq(storeProductTranslations.productId, storeProducts.id), eq(storeProductTranslations.locale, "en")))
      .where(and(isNull(storeProducts.deletedAt), eq(storeProducts.isActive, true)))
      .orderBy(asc(storeProductTranslations.name)),
  ]);

  return [
    { group: "Pages", label: "Home page", href: "/" },
    { group: "Pages", label: "Store — all products", href: "/store" },
    { group: "Pages", label: "About", href: "/about" },
    ...categories.map((c) => ({
      group: "Categories" as const,
      label: `${c.name ?? c.slug}${c.isActive ? "" : " (hidden)"}`,
      href: `/store?category=${c.slug}`,
    })),
    ...products.map((p) => ({
      group: "Products" as const,
      label: p.brand ? `${p.name ?? p.slug} — ${p.brand}` : (p.name ?? p.slug),
      href: `/store/${p.slug}`,
    })),
  ];
}
