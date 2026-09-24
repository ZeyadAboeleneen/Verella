import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import Link from "@/components/LocaleLink";
import { ArrowUpRight } from "lucide-react";
import { getDict, getLocale } from "@/lib/i18n";
import { getStoreCategories } from "@/lib/store/queries";
import { withDbTimeout } from "@/lib/db-timeout";
import { VMark } from "@/components/brand/Logo";
import { Reveal, RevealText } from "@/components/motion/Reveal";
import { VMarquee } from "@/components/home/VMarquee";
import { EditorialFeature } from "@/components/home/EditorialFeature";

export async function generateMetadata(): Promise<Metadata> {
  const [locale, dict] = await Promise.all([getLocale(), getDict()]);
  return pageMetadata({ locale, path: "/about", ...dict.meta.pages.about });
}

export default async function AboutPage() {
  const locale = await getLocale();
  const [dict, categories] = await Promise.all([getDict(), withDbTimeout(getStoreCategories(locale)).catch(() => [])]);
  const t = dict.aboutPage;

  return (
    <div>
      <section className="relative overflow-hidden bg-charcoal px-5 pb-24 pt-20 text-ivory md:px-16 md:pb-36 md:pt-32">
        <VMark size={700} className="pointer-events-none absolute -end-40 -top-32 text-champagne/[0.06]" />
        <div className="relative mx-auto max-w-[1400px]">
          <Reveal>
            <p className="mb-6 text-[11px] font-medium uppercase tracking-[0.35em] text-champagne">{t.eyebrow}</p>
          </Reveal>
          <RevealText
            text={t.title}
            as="h1"
            className="max-w-5xl font-[family-name:var(--font-display)] text-[clamp(3rem,9vw,8.5rem)] font-medium uppercase leading-[0.9] tracking-[-0.02em]"
          />
          <Reveal delay={0.2}>
            <p className="mt-10 max-w-2xl text-lg leading-relaxed text-ivory/75">{t.intro}</p>
          </Reveal>
        </div>
      </section>

      <VMarquee items={dict.home.marquee} tone="light" />

      <section className="mx-auto grid max-w-[1400px] gap-12 px-5 py-24 md:grid-cols-2 md:px-16 md:py-32">
        <ul className="space-y-4">
          {t.not.map((line, i) => (
            <Reveal key={line} delay={i * 0.1}>
              <li className="font-[family-name:var(--font-display)] text-3xl font-medium uppercase tracking-tight text-charcoal/50 line-through decoration-champagne decoration-2 md:text-5xl">
                {line}
              </li>
            </Reveal>
          ))}
        </ul>
        <Reveal delay={0.3} className="flex items-end">
          <p className="font-[family-name:var(--font-display)] text-3xl font-medium uppercase leading-tight tracking-tight text-charcoal md:text-5xl">{t.is}</p>
        </Reveal>
      </section>

      <section className="bg-surface-container-low px-5 py-24 md:px-16 md:py-32">
        <div className="mx-auto max-w-[1400px]">
          <RevealText
            text={t.pillarsTitle}
            className="mb-16 font-[family-name:var(--font-display)] text-4xl font-medium uppercase tracking-tight text-charcoal md:text-7xl"
          />
          <div className="grid gap-px overflow-hidden rounded-3xl bg-charcoal/10 md:grid-cols-3">
            {t.pillars.map((p, i) => (
              <Reveal key={p.title} delay={i * 0.12} className="group bg-ivory p-8 transition-colors duration-500 hover:bg-charcoal md:p-12">
                <span className="text-[11px] tracking-[0.3em] text-gold-ink group-hover:text-champagne">0{i + 1}</span>
                <h3 className="mt-10 font-[family-name:var(--font-display)] text-5xl font-medium uppercase tracking-tight text-charcoal transition-colors duration-500 group-hover:text-ivory md:text-6xl">
                  {p.title}
                </h3>
                <p className="mt-4 text-sm leading-relaxed text-charcoal/70 transition-colors duration-500 group-hover:text-ivory/70">{p.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-5 py-24 md:px-16 md:py-32">
        <RevealText
          text={t.audienceTitle}
          className="mb-14 font-[family-name:var(--font-display)] text-4xl font-medium uppercase tracking-tight text-charcoal md:text-7xl"
        />
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {t.audience.map((a, i) => (
            <Reveal key={a.title} delay={i * 0.08} className="border-t border-charcoal pt-6">
              <h3 className="text-sm font-medium uppercase tracking-[0.25em] text-charcoal">{a.title}</h3>
              <ul className="mt-5 space-y-2 text-sm text-charcoal/70">
                {a.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </Reveal>
          ))}
        </div>
      </section>

      <EditorialFeature
        eyebrow={dict.home.features[0].eyebrow}
        title={dict.home.features[0].title}
        body={dict.home.features[0].body}
        cta={dict.home.features[0].cta}
        href="/store?category=fragrances"
        image={categories.find((c) => c.slug === "fragrances")?.image ?? null}
      />

      <section className="relative overflow-hidden bg-charcoal px-5 py-28 text-center text-ivory md:px-16 md:py-40">
        <VMark size={90} className="mx-auto mb-10 text-champagne" />
        <RevealText
          text={t.quote}
          as="p"
          className="mx-auto max-w-5xl font-[family-name:var(--font-display)] text-4xl font-medium uppercase leading-[0.95] tracking-tight md:text-7xl"
        />
        <Reveal delay={0.3}>
          <Link
            href="/store"
            className="group mt-12 inline-flex h-14 items-center gap-3 rounded-full bg-ivory px-8 text-xs font-medium uppercase tracking-[0.25em] text-charcoal transition-colors hover:bg-champagne"
          >
            {t.cta}
            <ArrowUpRight size={16} className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
        </Reveal>
      </section>
    </div>
  );
}
