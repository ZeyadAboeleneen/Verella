import type { Metadata } from "next";
import { getDict, getLocale } from "@/lib/i18n";
import { getStoreBrands, getStoreCategories, getStoreProducts } from "@/lib/store/queries";
import { withDbTimeout } from "@/lib/db-timeout";
import { HeroShowcase } from "@/components/home/HeroShowcase";
import { VMarquee } from "@/components/home/VMarquee";
import { CategoryStrip } from "@/components/home/CategoryStrip";
import { ProductShowcase } from "@/components/home/ProductShowcase";
import { Manifesto } from "@/components/home/Manifesto";
import { EditorialFeature } from "@/components/home/EditorialFeature";
import { BrandIndex } from "@/components/home/BrandIndex";
import { Reveal, RevealText } from "@/components/motion/Reveal";
import { BRAND_CONTACT } from "@/lib/brand";
import { jsonLdHtml, pageMetadata, siteUrl } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const [locale, dict] = await Promise.all([getLocale(), getDict()]);
  const title = `VERELLA | ${dict.meta.tagline}`;
  return { ...pageMetadata({ locale, path: "/", title, description: dict.meta.description }), title: { absolute: title } };
}

// Organization + WebSite structured data for the brand's search presence.
function organizationJsonLd() {
  const url = siteUrl();
  return [
    {
      "@context": "https://schema.org",
      "@type": "OnlineStore",
      name: "Verella",
      url,
      logo: `${url}/brand/lockup-primary-charcoal.png`,
      email: BRAND_CONTACT.email.address,
      sameAs: [BRAND_CONTACT.instagram.href],
      areaServed: "EG",
    },
    { "@context": "https://schema.org", "@type": "WebSite", name: "Verella", url },
  ];
}

export default async function Home() {
  const locale = await getLocale();
  const [dict, categories, products, brands] = await Promise.all([
    getDict(),
    withDbTimeout(getStoreCategories(locale)).catch(() => []),
    withDbTimeout(getStoreProducts(locale)).catch(() => []),
    withDbTimeout(getStoreBrands(locale)).catch(() => []),
  ]);
  const h = dict.home;
  const lines = h.hero.lines as Record<string, string>;

  // Featured and best sellers lead the edit; the rest of the catalog fills in behind them.
  const edit = [...products].sort((a, b) => Number(b.isFeaturedHome || b.isBestSeller) - Number(a.isFeaturedHome || a.isBestSeller));
  const categoryImage = (slug: string) => categories.find((c) => c.slug === slug)?.image ?? null;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdHtml(organizationJsonLd())} />
      <HeroShowcase
        slides={categories.map((c) => ({ slug: c.slug, name: c.name, line: lines[c.slug] ?? c.name, image: c.image }))}
        labels={{ kicker: h.hero.kicker, shopNow: h.hero.shopNow, scroll: h.hero.scroll }}
      />

      <VMarquee items={h.marquee} />

      <section className="mx-auto max-w-[1400px] px-5 pb-8 pt-24 md:px-16 md:pt-32">
        <div className="mb-10 md:mb-14">
          <Reveal>
            <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.35em] text-gold-ink">{h.worlds.eyebrow}</p>
          </Reveal>
          <RevealText
            text={h.worlds.title}
            className="font-[family-name:var(--font-display)] text-5xl font-medium uppercase leading-none tracking-tight text-charcoal md:text-8xl"
          />
        </div>
        <Reveal y={50}>
          <CategoryStrip
            categories={categories.map((c) => ({ ...c, count: products.filter((p) => p.categorySlug === c.slug).length }))}
            labels={{ explore: h.worlds.explore, items: h.worlds.items }}
          />
        </Reveal>
      </section>

      <ProductShowcase products={edit} categories={categories} labels={h.showcase} productLabels={dict.product} />

      <Manifesto lines={h.manifesto} signature={h.manifestoSig} />

      {h.features.map((f, i) => (
        <EditorialFeature
          key={f.category}
          eyebrow={f.eyebrow}
          title={f.title}
          body={f.body}
          cta={f.cta}
          href={`/store?category=${f.category}`}
          image={categoryImage(f.category)}
          flip={i % 2 === 1}
        />
      ))}

      <BrandIndex brands={brands} labels={h.brands} />

      <VMarquee items={h.marquee} reverse tone="light" />
    </>
  );
}
