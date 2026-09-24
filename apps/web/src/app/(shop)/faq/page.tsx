import type { Metadata } from "next";
import { ChevronDown } from "lucide-react";
import { SimplePageHero } from "@/components/SimplePageHero";
import { HelpContactBand } from "@/components/LegalPage";
import { getDict, getLocale } from "@/lib/i18n";
import { jsonLdHtml, pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const [locale, dict] = await Promise.all([getLocale(), getDict()]);
  return pageMetadata({ locale, path: "/faq", ...dict.meta.pages.faq });
}

export default async function FaqPage() {
  const dict = await getDict();
  const t = dict.faqPage;

  // FAQPage structured data, so search results can show the answers directly.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: t.groups.flatMap((g) =>
      g.items.map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
    ),
  };

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdHtml(jsonLd)} />
      <SimplePageHero eyebrow={t.eyebrow} title={t.title} subtitle={t.subtitle} />
      <div className="mx-auto max-w-[1100px] space-y-16 px-5 py-16 md:px-16 md:py-24">
        {t.groups.map((group) => (
          <section key={group.title} className="grid gap-6 md:grid-cols-[220px_1fr] md:gap-16">
            <h2 className="text-[11px] font-medium uppercase tracking-[0.25em] text-charcoal/60 md:pt-6">{group.title}</h2>
            <div className="divide-y divide-beige border-y border-beige">
              {group.items.map(({ q, a }) => (
                <details key={q} className="group">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 font-[family-name:var(--font-display)] text-lg font-medium text-charcoal [&::-webkit-details-marker]:hidden">
                    {q}
                    <ChevronDown
                      size={18}
                      aria-hidden="true"
                      className="shrink-0 text-gold transition-transform duration-300 group-open:rotate-180"
                    />
                  </summary>
                  <p className="max-w-2xl pb-6 leading-relaxed text-charcoal/75">{a}</p>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>
      <HelpContactBand labels={dict.legal} />
    </div>
  );
}
