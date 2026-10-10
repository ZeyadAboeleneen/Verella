import { and, asc, eq } from "drizzle-orm";
import { db, storeCategories, storeCategoryTranslations, media } from "@verella/db";
import { getHomeFeatures } from "@/lib/home-sections/queries";
import { HomeSectionsForm } from "@/components/admin/home-sections/home-sections-form";
import { getOfferLinkTargets } from "@/lib/offers/link-targets";

export default async function AdminHomeSectionsPage() {
  const [features, categories, linkTargets] = await Promise.all([
    getHomeFeatures(),
    db
      .select({ slug: storeCategories.slug, name: storeCategoryTranslations.name, isActive: storeCategories.isActive, image: media.url })
      .from(storeCategories)
      .leftJoin(storeCategoryTranslations, and(eq(storeCategoryTranslations.categoryId, storeCategories.id), eq(storeCategoryTranslations.locale, "en")))
      .leftJoin(media, eq(media.id, storeCategories.imageMediaId))
      .orderBy(asc(storeCategories.sortOrder)),
    getOfferLinkTargets(),
  ]);

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-on-surface">Home sections</h1>
      <p className="mt-1 text-sm text-on-surface-variant">
        The large picture + text sections on the home page. The first one also appears on the About page.
      </p>
      <div className="mt-6">
        <HomeSectionsForm
          initial={features}
          linkTargets={linkTargets}
          categories={categories.map((c) => ({ slug: c.slug, label: `${c.name ?? c.slug}${c.isActive ? "" : " (hidden)"}`, image: c.image }))}
        />
      </div>
    </div>
  );
}
