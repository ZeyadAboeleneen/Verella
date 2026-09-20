import { and, asc, eq } from "drizzle-orm";
import { db, banners, bannerTranslations, media, contentBlocks } from "@verella/db";
import { withDbTimeout } from "@/lib/db-timeout";
import { getStoreProducts } from "@/lib/store/queries";
import { HeroSlidesManager } from "@/components/admin/content/hero-slides-manager";
import { CategoryCardsManager, type CategoryCardItem } from "@/components/admin/content/category-cards-manager";
import { InstagramPhotosManager, type InstagramPhotoItem } from "@/components/admin/content/instagram-photos-manager";
import {
  CATEGORY_CARD_KEYS,
  INSTAGRAM_PHOTO_KEYS,
  type CategoryCardPayload,
  type InstagramPhotoPayload,
} from "@/lib/content/queries";
import { DEFAULT_CATEGORY_CARDS, DEFAULT_INSTAGRAM_PHOTOS } from "@/lib/content/defaults";

const CATEGORY_LABELS: Record<(typeof CATEGORY_CARD_KEYS)[number], string> = {
  category_1: "Card 1 — large feature",
  category_2: "Card 2",
  category_3: "Card 3",
};

const INSTAGRAM_LABELS: Record<(typeof INSTAGRAM_PHOTO_KEYS)[number], string> = {
  instagram_1: "Photo 1",
  instagram_2: "Photo 2",
  instagram_3: "Photo 3",
  instagram_4: "Photo 4",
};

export default async function AdminContentPage() {
  // Queried directly (not through the public getHomeCategoryCards/
  // getInstagramPhotos accessors, which are cached for 60s) so the editor
  // always reflects the admin's own most recent save on refresh.
  const [heroRows, homeBlockRows, storeProducts] = await Promise.all([
    withDbTimeout(
      db
        .select({ id: banners.id, url: media.url, isActive: banners.isActive, title: bannerTranslations.title })
        .from(banners)
        .innerJoin(media, eq(media.id, banners.mediaId))
        .leftJoin(bannerTranslations, and(eq(bannerTranslations.bannerId, banners.id), eq(bannerTranslations.locale, "en")))
        .where(eq(banners.placement, "home_hero"))
        .orderBy(asc(banners.sortOrder)),
    ).catch(() => null),
    withDbTimeout(
      db.select({ blockKey: contentBlocks.blockKey, type: contentBlocks.type, payload: contentBlocks.payload }).from(contentBlocks).where(eq(contentBlocks.page, "home")),
    ).catch(() => []),
    getStoreProducts("en").catch(() => []),
  ]);
  const productLinkOptions = storeProducts.map((p) => ({ id: p.id, slug: p.slug, name: p.name }));

  const savedCategoryCards = Object.fromEntries(
    homeBlockRows.filter((r) => r.type === "category_card").map((r) => [r.blockKey, r.payload as CategoryCardPayload]),
  );
  const savedInstagramPhotos = Object.fromEntries(
    homeBlockRows.filter((r) => r.type === "instagram_photo").map((r) => [r.blockKey, r.payload as InstagramPhotoPayload]),
  );

  const categoryCardItems: CategoryCardItem[] = CATEGORY_CARD_KEYS.map((key) => ({
    key,
    label: CATEGORY_LABELS[key],
    current: savedCategoryCards[key] ?? DEFAULT_CATEGORY_CARDS[key],
  }));
  const instagramPhotoItems: InstagramPhotoItem[] = INSTAGRAM_PHOTO_KEYS.map((key) => ({
    key,
    label: INSTAGRAM_LABELS[key],
    current: savedInstagramPhotos[key] ?? DEFAULT_INSTAGRAM_PHOTOS[key],
  }));

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-display text-2xl font-bold text-on-surface">Home Page</h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          Manage everything shown on the homepage — the hero slider, the Shop by Category cards, and the Instagram
          gallery.
        </p>
      </div>

      <section>
        <h2 className="mb-1 font-display text-lg font-bold text-on-surface">Hero slider</h2>
        <p className="mb-4 text-sm text-on-surface-variant">The full-width banner at the very top of the homepage.</p>
        {heroRows === null ? (
          <p className="rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-6 text-sm text-on-surface-variant">
            Couldn&apos;t reach the database — refresh the page to try again.
          </p>
        ) : (
          <HeroSlidesManager
            items={heroRows.map((r) => ({ id: r.id, url: r.url, title: r.title, isActive: r.isActive }))}
            products={productLinkOptions}
          />
        )}
      </section>

      <section>
        <h2 className="mb-1 font-display text-lg font-bold text-on-surface">Shop by Category</h2>
        <p className="mb-4 text-sm text-on-surface-variant">
          The three cards on the homepage — each is its own image, title, description, and destination link.
        </p>
        <CategoryCardsManager items={categoryCardItems} />
      </section>

      <section>
        <h2 className="mb-1 font-display text-lg font-bold text-on-surface">From Our Instagram</h2>
        <p className="mb-4 text-sm text-on-surface-variant">
          The four photos in the homepage&apos;s Instagram gallery. Give a photo a link to make it open that page when
          clicked.
        </p>
        <InstagramPhotosManager items={instagramPhotoItems} />
      </section>
    </div>
  );
}
