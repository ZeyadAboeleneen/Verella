import "server-only";
import { unstable_cache } from "next/cache";
import { and, asc, desc, eq, gt, isNull, lte, or } from "drizzle-orm";
import { db, media, offers } from "@verella/db";
import type { Locale } from "@/lib/i18n";

/** Busted by updateTag() whenever an offer is saved, so changes show up immediately. */
export const OFFERS_CACHE_TAG = "offers";

/** What the storefront needs for one offer, already in the visitor's language. */
export interface OfferView {
  id: number;
  title: string;
  body: string | null;
  highlight: string | null;
  ctaLabel: string | null;
  href: string | null;
  code: string | null;
  image: string | null;
  endsAt: string | null;
  showInBar: boolean;
  showInCards: boolean;
}

async function getLiveOffersImpl(): Promise<(typeof offers.$inferSelect & { image: string | null })[]> {
  const now = new Date();
  const rows = await db
    .select({ offer: offers, image: media.url })
    .from(offers)
    .leftJoin(media, eq(media.id, offers.imageMediaId))
    .where(
      and(
        eq(offers.isActive, true),
        or(isNull(offers.startsAt), lte(offers.startsAt, now)),
        or(isNull(offers.endsAt), gt(offers.endsAt, now)),
      ),
    )
    .orderBy(asc(offers.sortOrder), desc(offers.createdAt));
  return rows.map((r) => ({ ...r.offer, image: r.image }));
}

// Short revalidate so a start/end date passing takes effect within a minute
// without anyone saving anything.
const getLiveOffers = unstable_cache(getLiveOffersImpl, ["offers-live"], { revalidate: 60, tags: [OFFERS_CACHE_TAG] });

/** Live offers (active, inside their date window), in the visitor's language. */
export async function getActiveOffers(locale: Locale): Promise<OfferView[]> {
  const rows = await getLiveOffers();
  const now = Date.now();
  const ar = locale === "ar";
  return rows
    // The cache can be up to a minute old — re-check the window here.
    .filter((o) => (!o.startsAt || new Date(o.startsAt).getTime() <= now) && (!o.endsAt || new Date(o.endsAt).getTime() > now))
    .map((o) => ({
      id: o.id,
      title: (ar ? o.titleAr : o.titleEn) || o.titleAr || o.titleEn,
      body: (ar ? o.bodyAr : o.bodyEn) || null,
      highlight: (ar ? o.highlightAr : o.highlightEn) || null,
      ctaLabel: (ar ? o.ctaLabelAr : o.ctaLabelEn) || null,
      href: o.linkUrl || null,
      code: o.code || null,
      image: o.image,
      endsAt: o.endsAt ? new Date(o.endsAt).toISOString() : null,
      showInBar: o.showInBar,
      showInCards: o.showInCards,
    }));
}
