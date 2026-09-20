import "server-only";
import { unstable_cache } from "next/cache";
import { asc, eq, inArray } from "drizzle-orm";
import { db, menuCategories, menuCategoryTranslations, menuItems, menuItemTranslations, menuItemSizes, menuHeroImages, media } from "@verella/db";
import { formatMoney, toCents, type Locale } from "@verella/core";

// See store/queries.ts for why this is time-based only (60s) rather than
// tag-based — same remote-DB rationale, same Next 16 revalidateTag caveat.
const CATALOG_REVALIDATE_SECONDS = 60;

export interface MenuItemSizeView {
  size: string;
  price: string;
  compareAtPrice?: string | null;
}

export interface MenuItemView {
  id: string;
  name: string;
  description?: string;
  /** Every size/price pair for this item, in display order — always at least one. */
  sizes: MenuItemSizeView[];
  /** Formatted price of the cheapest size — the headline price for "From ..." display. */
  priceFrom: string;
  badge?: string;
}

export interface MenuSectionView {
  id: string;
  title: string;
  icon: string;
  image: string | null;
  items: MenuItemView[];
}

function pickTranslation<T extends { locale: string }>(rows: T[], locale: Locale): T | undefined {
  return rows.find((r) => r.locale === locale) ?? rows.find((r) => r.locale === "en");
}

async function getMenuSectionsImpl(locale: Locale = "en"): Promise<MenuSectionView[]> {
  const categories = await db
    .select()
    .from(menuCategories)
    .where(eq(menuCategories.isActive, true))
    .orderBy(asc(menuCategories.sortOrder));
  if (categories.length === 0) return [];

  const categoryIds = categories.map((c) => c.id);
  const categoryImageIds = categories.map((c) => c.imageMediaId).filter((id): id is number => id != null);
  const [catTranslations, categoryImages, items] = await Promise.all([
    db.select().from(menuCategoryTranslations).where(inArray(menuCategoryTranslations.categoryId, categoryIds)),
    categoryImageIds.length
      ? db.select({ id: media.id, url: media.url }).from(media).where(inArray(media.id, categoryImageIds))
      : Promise.resolve([]),
    db.select().from(menuItems).where(inArray(menuItems.categoryId, categoryIds)),
  ]);
  const categoryImageById = new Map(categoryImages.map((m) => [m.id, m.url]));

  const activeItems = items.filter((i) => i.isActive && !i.deletedAt).sort((a, b) => a.sortOrder - b.sortOrder);
  const itemIds = activeItems.map((i) => i.id);
  const [itemTranslations, sizeRows] = itemIds.length
    ? await Promise.all([
        db.select().from(menuItemTranslations).where(inArray(menuItemTranslations.itemId, itemIds)),
        db.select().from(menuItemSizes).where(inArray(menuItemSizes.itemId, itemIds)),
      ])
    : [[], []];

  return categories.map((cat) => {
    const t = pickTranslation(
      catTranslations.filter((r) => r.categoryId === cat.id),
      locale,
    );
    const catItems = activeItems.filter((i) => i.categoryId === cat.id);

    return {
      id: cat.slug,
      title: t?.name ?? cat.slug,
      icon: cat.icon ?? "coffee",
      image: cat.imageMediaId ? categoryImageById.get(cat.imageMediaId) ?? null : null,
      items: catItems.map((item) => {
        const it = pickTranslation(
          itemTranslations.filter((r) => r.itemId === item.id),
          locale,
        );
        const itemSizes = sizeRows
          .filter((s) => s.itemId === item.id)
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((s) => ({ size: s.size, price: formatMoney(toCents(s.price), item.currency, locale) }));
        const cheapest = sizeRows.filter((s) => s.itemId === item.id).sort((a, b) => Number(a.price) - Number(b.price))[0];

        return {
          id: item.slug,
          name: it?.name ?? item.slug,
          description: it?.description ?? undefined,
          sizes: itemSizes,
          priceFrom: cheapest ? formatMoney(toCents(cheapest.price), item.currency, locale) : "",
          badge: item.badge ?? undefined,
        };
      }),
    };
  });
}

export const getMenuSections = unstable_cache(getMenuSectionsImpl, ["menu-sections"], {
  revalidate: CATALOG_REVALIDATE_SECONDS,
});

// Not cached: this table is tiny (a handful of rows) and rarely queried
// outside this one banner, so the cost of hitting the DB on every load is
// negligible — and it means admin changes appear immediately via the
// existing revalidatePath("/menu") instead of waiting out the 60s window.
export async function getMenuHeroImages(): Promise<string[]> {
  const rows = await db
    .select({ url: media.url })
    .from(menuHeroImages)
    .innerJoin(media, eq(media.id, menuHeroImages.mediaId))
    .where(eq(menuHeroImages.isActive, true))
    .orderBy(asc(menuHeroImages.sortOrder));
  return rows.map((r) => r.url);
}
