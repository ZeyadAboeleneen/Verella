import { asc, eq } from "drizzle-orm";
import { db, storeHeroImages, media } from "@verella/db";
import { SectionTabs } from "@/components/admin/section-tabs";
import { HeroImagesManager } from "@/components/admin/store/hero-images-manager";

export default async function AdminStoreHeroPage() {
  const rows = await db
    .select({ id: storeHeroImages.id, isActive: storeHeroImages.isActive, sortOrder: storeHeroImages.sortOrder, mediaId: media.id, url: media.url })
    .from(storeHeroImages)
    .innerJoin(media, eq(media.id, storeHeroImages.mediaId))
    .orderBy(asc(storeHeroImages.sortOrder));

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-on-surface">Store</h1>
      <SectionTabs
        tabs={[
          { label: "Categories", href: "/admin/store" },
          { label: "Products", href: "/admin/store/products" },
          { label: "Hero Images", href: "/admin/store/hero" },
        ]}
      />
      <HeroImagesManager
        items={rows.map((r) => ({ id: r.id, isActive: r.isActive, url: r.url }))}
        nextSortOrder={rows.length}
      />
    </div>
  );
}
