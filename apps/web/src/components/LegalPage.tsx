import Link from "@/components/LocaleLink";
import { ArrowUpRight } from "lucide-react";
import { SimplePageHero } from "@/components/SimplePageHero";
import { BRAND_CONTACT } from "@/lib/brand";
import type { Dictionary } from "@/lib/i18n";

export interface LegalSection {
  title: string;
  body: string[];
}

function sectionId(index: number) {
  return `section-${index + 1}`;
}

/** "Still have a question?" band that closes every help/legal page. */
export function HelpContactBand({ labels }: { labels: Dictionary["legal"] }) {
  return (
    <section className="border-t border-beige/60 bg-ivory px-5 py-16 md:px-16">
      <div className="mx-auto flex max-w-[1100px] flex-col items-start justify-between gap-6 md:flex-row md:items-center">
        <div className="space-y-2">
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-medium text-charcoal">{labels.questions}</h2>
          <p className="max-w-lg text-sm leading-relaxed text-charcoal/70">{labels.questionsBody}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <a
            href={BRAND_CONTACT.whatsapp.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-12 items-center gap-2 rounded-full bg-charcoal px-6 text-xs font-medium uppercase tracking-[0.2em] text-ivory transition-colors hover:bg-black"
          >
            WhatsApp <ArrowUpRight size={14} className="rtl:-scale-x-100" />
          </a>
          <Link
            href="/contact"
            className="inline-flex h-12 items-center rounded-full border border-charcoal/20 px-6 text-xs font-medium uppercase tracking-[0.2em] text-charcoal transition-colors hover:border-charcoal"
          >
            {labels.contactCta}
          </Link>
        </div>
      </div>
    </section>
  );
}

/**
 * Long-form policy page (shipping, privacy, terms): hero, an "on this page"
 * index that stays in view on desktop, and numbered sections. All copy comes
 * from the dictionaries, so both languages share one layout.
 */
export function LegalPage({
  eyebrow,
  title,
  subtitle,
  updated,
  sections,
  labels,
  before,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  updated: string;
  sections: LegalSection[];
  labels: Dictionary["legal"];
  before?: React.ReactNode;
}) {
  return (
    <div>
      <SimplePageHero eyebrow={eyebrow} title={title} subtitle={subtitle} />
      {before}
      <div className="mx-auto grid max-w-[1100px] gap-12 px-5 py-16 md:grid-cols-[220px_1fr] md:gap-16 md:px-16 md:py-24">
        <nav aria-label={labels.onThisPage} className="hidden md:block">
          <div className="sticky top-[calc(var(--nav-offset,72px)+2rem)] space-y-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-charcoal/60">{labels.onThisPage}</p>
            <ol className="space-y-2.5 border-s border-beige ps-4">
              {sections.map((s, i) => (
                <li key={s.title}>
                  <a href={`#${sectionId(i)}`} className="text-sm text-charcoal/65 transition-colors hover:text-charcoal">
                    {s.title}
                  </a>
                </li>
              ))}
            </ol>
          </div>
        </nav>

        <div className="min-w-0">
          <p className="mb-10 text-xs uppercase tracking-[0.2em] text-charcoal/60">
            {labels.updated}: {updated}
          </p>
          <div className="space-y-12">
            {sections.map((s, i) => (
              <section key={s.title} id={sectionId(i)} className="scroll-mt-28 space-y-4">
                <h2 className="flex items-baseline gap-4 font-[family-name:var(--font-display)] text-xl font-medium text-charcoal md:text-2xl">
                  <span className="text-sm tabular-nums text-gold-ink" aria-hidden="true">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {s.title}
                </h2>
                {s.body.map((p) => (
                  <p key={p.slice(0, 40)} className="leading-relaxed text-charcoal/80">
                    {p}
                  </p>
                ))}
              </section>
            ))}
          </div>
        </div>
      </div>
      <HelpContactBand labels={labels} />
    </div>
  );
}
