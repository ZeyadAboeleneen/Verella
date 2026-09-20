import "server-only";
import { unstable_cache } from "next/cache";
import { and, asc, eq } from "drizzle-orm";
import { db, banners, bannerTranslations, media, contentBlocks } from "@verella/db";
import type { Locale } from "@verella/core";
import { withDbTimeout } from "@/lib/db-timeout";

// Same time-based-only rationale as the catalog queries (store/queries.ts) —
// hero slides and the other content blocks below are admin-editable but
// public-facing, so a short cache avoids a fresh remote DB round-trip on
// every single homepage load while still picking up edits within a minute.
const CONTENT_REVALIDATE_SECONDS = 60;

export interface HeroSlideView {
  id: number;
  imageUrl: string;
  /** Button 1. */
  linkUrl: string | null;
  ctaText: string | null;
  /** Button 2 (optional). */
  link2Url: string | null;
  ctaText2: string | null;
  /** Makes the whole slide image clickable, independent of the buttons. */
  imageLinkUrl: string | null;
  /** Optional per-slide overrides — the dictionary copy is used when absent. */
  title: string | null;
  subtitle: string | null;
}

/**
 * Active hero slides for the homepage, managed from Admin → Home Page as
 * banners with the "home_hero" placement. Slide count is simply how many
 * active slides exist: 0 → built-in fallback, 1 → static hero, 2+ → slider.
 */
async function getHomeHeroSlidesImpl(locale: Locale): Promise<HeroSlideView[]> {
  const rows = await withDbTimeout(db
    .select({
      id: banners.id,
      imageUrl: media.url,
      linkUrl: banners.linkUrl,
      link2Url: banners.link2Url,
      imageLinkUrl: banners.imageLinkUrl,
      title: bannerTranslations.title,
      subtitle: bannerTranslations.subtitle,
      ctaText: bannerTranslations.ctaText,
      ctaText2: bannerTranslations.ctaText2,
    })
    .from(banners)
    .innerJoin(media, eq(media.id, banners.mediaId))
    .leftJoin(bannerTranslations, and(eq(bannerTranslations.bannerId, banners.id), eq(bannerTranslations.locale, locale)))
    .where(and(eq(banners.isActive, true), eq(banners.placement, "home_hero")))
    .orderBy(asc(banners.sortOrder)))
    // The hero must never take the homepage down with it — fall back to the
    // built-in slide on a transient DB failure or hang.
    .catch(() => []);

  return rows;
}
export const getHomeHeroSlides = unstable_cache(getHomeHeroSlidesImpl, ["home-hero-slides"], {
  revalidate: CONTENT_REVALIDATE_SECONDS,
});

// ─── Generic content blocks — About hero, homepage category cards, homepage
// Instagram photos. All admin-managed from Admin → Home Page / About Page,
// stored in the flexible `content_blocks` table (page + blockKey unique) so
// none of this needed a schema migration. One query per page, cached and
// filtered/typed in memory — cheap since each page only has a handful of rows.

export interface AboutHeroPayload {
  mediaId: number;
  imageUrl: string;
}

async function getAboutHeroImpl(): Promise<string | null> {
  const rows = await withDbTimeout(
    db
      .select({ payload: contentBlocks.payload })
      .from(contentBlocks)
      .where(and(eq(contentBlocks.page, "about"), eq(contentBlocks.blockKey, "hero")))
      .limit(1),
  ).catch(() => []);
  const payload = rows[0]?.payload as AboutHeroPayload | undefined;
  return payload?.imageUrl ?? null;
}
export const getAboutHero = unstable_cache(getAboutHeroImpl, ["about-hero"], {
  revalidate: CONTENT_REVALIDATE_SECONDS,
});

export interface CategoryCardPayload {
  mediaId: number;
  imageUrl: string;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  linkUrl: string;
}

export const CATEGORY_CARD_KEYS = ["category_1", "category_2", "category_3"] as const;
export type CategoryCardKey = (typeof CATEGORY_CARD_KEYS)[number];

async function getHomeCategoryCardsImpl(): Promise<Record<string, CategoryCardPayload>> {
  const rows = await withDbTimeout(
    db
      .select({ blockKey: contentBlocks.blockKey, payload: contentBlocks.payload })
      .from(contentBlocks)
      .where(and(eq(contentBlocks.page, "home"), eq(contentBlocks.type, "category_card"))),
  ).catch(() => []);
  return Object.fromEntries(rows.map((r) => [r.blockKey, r.payload as CategoryCardPayload]));
}
export const getHomeCategoryCards = unstable_cache(getHomeCategoryCardsImpl, ["home-category-cards"], {
  revalidate: CONTENT_REVALIDATE_SECONDS,
});

export interface InstagramPhotoPayload {
  mediaId: number;
  imageUrl: string;
  linkUrl: string;
}

export const INSTAGRAM_PHOTO_KEYS = ["instagram_1", "instagram_2", "instagram_3", "instagram_4"] as const;
export type InstagramPhotoKey = (typeof INSTAGRAM_PHOTO_KEYS)[number];

async function getInstagramPhotosImpl(): Promise<Record<string, InstagramPhotoPayload>> {
  const rows = await withDbTimeout(
    db
      .select({ blockKey: contentBlocks.blockKey, payload: contentBlocks.payload })
      .from(contentBlocks)
      .where(and(eq(contentBlocks.page, "home"), eq(contentBlocks.type, "instagram_photo"))),
  ).catch(() => []);
  return Object.fromEntries(rows.map((r) => [r.blockKey, r.payload as InstagramPhotoPayload]));
}
export const getInstagramPhotos = unstable_cache(getInstagramPhotosImpl, ["home-instagram-photos"], {
  revalidate: CONTENT_REVALIDATE_SECONDS,
});
