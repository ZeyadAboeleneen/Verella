import Link from "next/link";
import type { Metadata } from "next";
import ProductCard from "@/components/ProductCard";
import { StoreSearchInput } from "@/components/store/search-input";
import { LoadErrorBand } from "@/components/LoadErrorBand";
import { withDbTimeout } from "@/lib/db-timeout";
import { getStoreCategories, getStoreProducts, getStoreHeroImages } from "@/lib/store/queries";
import { getLocale, getDict } from "@/lib/i18n";
import { StoreHeroBackground } from "@/components/store/hero-background";

// Note: this route reads the locale cookie (via getLocale) and searchParams,
// which force dynamic (per-request) rendering — an ISR `revalidate` export
// here would be a no-op, so it's intentionally omitted.

export const metadata: Metadata = {
  title: "Our Store | Verella",
  description: "Shop coffee beans, Turkish coffee, espresso, and accessories from Verella Coffee.",
};

export default async function StorePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string }>;
}) {
  const [locale, dict, params] = await Promise.all([getLocale(), getDict(), searchParams]);
  const activeCategory = params.category;
  const search = params.q;

  const [categories, products, heroImages] = await Promise.all([
    withDbTimeout(getStoreCategories(locale)).catch(() => null),
    withDbTimeout(getStoreProducts(locale, { categorySlug: activeCategory, search })).catch(() => null),
    withDbTimeout(getStoreHeroImages()).catch(() => []),
  ]);

  return (
    <div className="min-h-screen">
      <div className="relative overflow-hidden bg-[#000000] py-14 md:py-24 px-5 md:px-16 text-center">
        <StoreHeroBackground images={heroImages} />
        <div className="relative z-10">
          <p className="text-[#FFE2C6] text-xs font-semibold uppercase tracking-widest mb-3">Verella</p>
          <h1 className="font-[family-name:var(--font-plus-jakarta)] text-3xl md:text-5xl font-bold text-white mb-4">
            {dict.store.title}
          </h1>
          <p className="text-white/80 text-sm md:text-lg max-w-xl mx-auto">{dict.store.subtitle}</p>
        </div>
      </div>

      {categories === null || products === null ? (
        <LoadErrorBand message={dict.common.loadError} retryLabel={dict.common.retry} href="/store" />
      ) : (
      <div className="py-10 md:py-16 px-5 md:px-16 max-w-[1280px] mx-auto">
        <StoreSearchInput placeholder={dict.store.searchPlaceholder} />

        {/* dir="ltr": consistent horizontal-scroll direction regardless of page language */}
        <div className="flex gap-2 md:gap-4 overflow-x-auto no-scrollbar pb-2 mb-8 md:mb-12 md:flex-wrap md:justify-center" dir="ltr">
          <Link
            href="/store"
            className={`flex-shrink-0 px-5 py-2 rounded-full border text-xs font-semibold uppercase tracking-widest transition-all whitespace-nowrap ${
              !activeCategory ? "bg-black text-white border-black" : "border-[#8E7B6A] hover:bg-black hover:text-white hover:border-black"
            }`}
          >
            {dict.store.all}
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat.slug}
              href={`/store?category=${cat.slug}`}
              className={`flex-shrink-0 px-5 py-2 rounded-full border text-xs font-semibold uppercase tracking-widest transition-all whitespace-nowrap ${
                activeCategory === cat.slug
                  ? "bg-black text-white border-black"
                  : "border-[#8E7B6A] hover:bg-black hover:text-white hover:border-black"
              }`}
            >
              {cat.name}
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {products.map((p) => (
            <ProductCard
              key={p.id}
              productId={p.id}
              slug={p.slug}
              name={p.name}
              price={p.price}
              compareAtPrice={p.compareAtPrice}
              rating={p.rating}
              tag={p.tag}
              badge={p.badge}
              image={p.image}
              alt={p.alt}
              addToCartLabel={dict.product.addToCart}
              addedLabel={dict.product.added}
            />
          ))}
        </div>

        {products.length === 0 && (
          <p className="text-center text-[#4A3026] py-16">{search ? dict.store.searchEmpty : dict.store.empty}</p>
        )}
      </div>
      )}
    </div>
  );
}
