import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { Suspense } from "react";
import { LoadErrorBand } from "@/components/LoadErrorBand";
import { withDbTimeout } from "@/lib/db-timeout";
import { getStoreCategories, getStoreProducts } from "@/lib/store/queries";
import { getLocale, getDict } from "@/lib/i18n";
import { StoreBrowser } from "@/components/store/StoreBrowser";
import { CategoryStrip } from "@/components/home/CategoryStrip";
import { VMarquee } from "@/components/home/VMarquee";
import { Reveal, RevealText } from "@/components/motion/Reveal";

export async function generateMetadata(): Promise<Metadata> {
  const [locale, dict] = await Promise.all([getLocale(), getDict()]);
  return pageMetadata({ locale, path: "/store", ...dict.meta.pages.store });
}

export default async function StorePage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const [locale, dict, params] = await Promise.all([getLocale(), getDict(), searchParams]);
  const [categories, products] = await Promise.all([
    withDbTimeout(getStoreCategories(locale)).catch(() => null),
    withDbTimeout(getStoreProducts(locale)).catch(() => null),
  ]);

  if (categories === null || products === null) {
    return <LoadErrorBand message={dict.common.loadError} retryLabel={dict.common.retry} href="/store" />;
  }

  const active = categories.find((c) => c.slug === params.category);
  const s = dict.store;

  return (
    <div>
      <section className="mx-auto grid max-w-[1400px] gap-10 px-5 pb-16 pt-10 md:grid-cols-12 md:gap-12 md:px-16 md:pb-20 md:pt-16">
        <div className="flex flex-col justify-end md:col-span-4">
          <Reveal>
            <p className="mb-5 text-[11px] font-medium uppercase tracking-[0.35em] text-gold-ink">Verella — {s.all}</p>
          </Reveal>
          <RevealText
            key={active?.slug ?? "all"}
            text={active?.name ?? s.title}
            as="h1"
            className="font-[family-name:var(--font-display)] text-6xl font-medium uppercase leading-[0.9] tracking-tight text-charcoal md:text-8xl"
          />
          <Reveal delay={0.2}>
            <p className="mt-6 max-w-sm text-base leading-relaxed text-charcoal/70">{active?.description ?? s.subtitle}</p>
          </Reveal>
        </div>
        <Reveal className="md:col-span-8" y={40} delay={0.1}>
          <CategoryStrip
            categories={categories.map((c) => ({ ...c, count: products.filter((p) => p.categorySlug === c.slug).length }))}
            labels={{ explore: dict.home.worlds.explore, items: dict.home.worlds.items }}
            height="h-[62vh] min-h-[440px] md:h-[520px]"
          />
        </Reveal>
      </section>

      <div className="px-5 md:px-16">
        <Suspense>
          <StoreBrowser products={products} categories={categories} labels={s} productLabels={dict.product} />
        </Suspense>
      </div>

      <div className="mt-24">
        <VMarquee items={dict.home.marquee} tone="light" />
      </div>
    </div>
  );
}
