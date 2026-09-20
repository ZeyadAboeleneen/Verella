import Link from "next/link";
import { getDict, getLocale } from "@/lib/i18n";
import { getHomeCategoryCards, CATEGORY_CARD_KEYS, type CategoryCardPayload } from "@/lib/content/queries";
import { DEFAULT_CATEGORY_CARDS } from "@/lib/content/defaults";
import type { Locale } from "@verella/core";

function copyFor(card: CategoryCardPayload, locale: Locale) {
  return {
    title: (locale === "ar" ? card.titleAr : card.titleEn) || card.titleEn,
    description: (locale === "ar" ? card.descriptionAr : card.descriptionEn) || card.descriptionEn,
  };
}

export default async function Categories() {
  const [dict, locale, saved] = await Promise.all([
    getDict(),
    getLocale(),
    getHomeCategoryCards().catch(() => ({}) as Record<string, CategoryCardPayload>),
  ]);

  const [card1, card2, card3] = CATEGORY_CARD_KEYS.map((key) => copyFor(saved[key] ?? DEFAULT_CATEGORY_CARDS[key], locale));
  const [raw1, raw2, raw3] = CATEGORY_CARD_KEYS.map((key) => saved[key] ?? DEFAULT_CATEGORY_CARDS[key]);

  return (
    <section className="py-12 md:py-20 bg-[#FFE2C6]">
      <div className="px-5 md:px-16 max-w-[1280px] mx-auto">
        <h2 className="font-[family-name:var(--font-plus-jakarta)] text-2xl md:text-[32px] font-semibold text-black mb-8 md:mb-12 text-center">
          {dict.home.categories.title}
        </h2>

        {/* Mobile: stacked cards */}
        <div className="flex flex-col gap-4 md:hidden">
          <Link href={raw1.linkUrl || "#"} className="group relative overflow-hidden rounded-3xl luxury-shadow bg-[#000000] h-52 block">
            <div className="absolute inset-0 bg-cover bg-center opacity-60" style={{ backgroundImage: `url('${raw1.imageUrl}')` }} />
            <div className="absolute inset-0 bg-black/30" />
            <div className="absolute inset-0 flex flex-col justify-end p-6 text-white">
              <h3 className="font-[family-name:var(--font-plus-jakarta)] text-xl font-bold mb-1">{card1.title}</h3>
              <p className="text-sm opacity-80 mb-3 line-clamp-2">{card1.description}</p>
              <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-widest text-[#FFE2C6]">
                {dict.home.categories.explore} <span aria-hidden="true" className="material-symbols-outlined text-base">arrow_forward</span>
              </span>
            </div>
          </Link>

          <div className="grid grid-cols-2 gap-4">
            <Link href={raw2.linkUrl || "#"} className="group relative overflow-hidden rounded-3xl luxury-shadow bg-black h-40 block">
              <div className="absolute inset-0 bg-cover bg-center opacity-60" style={{ backgroundImage: `url('${raw2.imageUrl}')` }} />
              <div className="absolute inset-0 bg-black/30" />
              <div className="absolute inset-0 flex flex-col justify-end p-4 text-white">
                <h3 className="font-[family-name:var(--font-plus-jakarta)] text-base font-bold">{card2.title}</h3>
              </div>
            </Link>
            <Link href={raw3.linkUrl || "#"} className="group relative overflow-hidden rounded-3xl luxury-shadow bg-[#57392D] h-40 block">
              <div className="absolute inset-0 bg-cover bg-center opacity-40" style={{ backgroundImage: `url('${raw3.imageUrl}')` }} />
              <div className="absolute inset-0 flex flex-col justify-end p-4 text-white">
                <h3 className="font-[family-name:var(--font-plus-jakarta)] text-base font-semibold">{card3.title}</h3>
              </div>
            </Link>
          </div>
        </div>

        {/* Desktop: bento grid. dir="ltr" keeps the big card on the left and
            the two stacked cards on the right in both languages — this is a
            compositional layout, not reading-direction text, so it shouldn't
            mirror when switching to Arabic. */}
        <div className="hidden md:grid grid-cols-6 grid-rows-2 gap-6 h-[600px]" dir="ltr">
          <Link
            href={raw1.linkUrl || "#"}
            className="col-span-3 row-span-2 group relative overflow-hidden rounded-[1.75rem] luxury-shadow bg-[#000000] block"
          >
            <div
              className="absolute inset-0 bg-cover bg-center opacity-60 transition-transform duration-700 group-hover:scale-105"
              style={{ backgroundImage: `url('${raw1.imageUrl}')` }}
            />
            <div className="absolute inset-0 flex flex-col justify-end p-10 text-white">
              <h3 className="font-[family-name:var(--font-plus-jakarta)] text-2xl font-bold mb-2">{card1.title}</h3>
              <p className="opacity-80 mb-6">{card1.description}</p>
              <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#FFE2C6]">
                {dict.home.categories.exploreCollection} <span aria-hidden="true" className="material-symbols-outlined">arrow_forward</span>
              </span>
            </div>
          </Link>
          <Link href={raw2.linkUrl || "#"} className="col-span-3 row-span-1 group relative overflow-hidden rounded-[1.75rem] luxury-shadow bg-black block">
            <div
              className="absolute inset-0 bg-cover bg-center opacity-60 transition-transform duration-700 group-hover:scale-105"
              style={{ backgroundImage: `url('${raw2.imageUrl}')` }}
            />
            <div className="absolute inset-0 flex flex-col justify-end p-8 text-white">
              <h3 className="font-[family-name:var(--font-plus-jakarta)] text-2xl font-bold mb-1">{card2.title}</h3>
              <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#FFE2C6]">
                {dict.home.categories.viewMore} <span aria-hidden="true" className="material-symbols-outlined">arrow_forward</span>
              </span>
            </div>
          </Link>
          <Link
            href={raw3.linkUrl || "#"}
            className="col-span-3 row-span-1 group relative overflow-hidden rounded-[1.75rem] luxury-shadow bg-[#57392D] block"
          >
            <div
              className="absolute inset-0 bg-cover bg-center opacity-40 transition-transform duration-700 group-hover:scale-105"
              style={{ backgroundImage: `url('${raw3.imageUrl}')` }}
            />
            <div className="absolute inset-0 flex flex-col justify-end p-6 text-white">
              <h3 className="font-[family-name:var(--font-plus-jakarta)] text-2xl font-semibold mb-1">{card3.title}</h3>
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
}
