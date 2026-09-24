import { VMark } from "@/components/brand/Logo";

export function SimplePageHero({ eyebrow, title, subtitle }: { eyebrow?: string; title: string; subtitle?: string }) {
  return (
    <section className="relative overflow-hidden bg-charcoal px-5 py-16 md:px-16 md:py-24">
      {/* A single cropped mark at the edge, per the guidelines' pattern rules. */}
      <VMark size={380} className="pointer-events-none absolute -end-16 -top-24 text-champagne opacity-[0.06]" />
      <div className="relative mx-auto max-w-[1280px] space-y-4 text-center">
        {eyebrow && <span className="text-[11px] font-medium uppercase tracking-[0.3em] text-champagne">{eyebrow}</span>}
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-medium text-ivory md:text-5xl">{title}</h1>
        {subtitle && <p className="mx-auto max-w-xl text-base text-ivory/70 md:text-lg">{subtitle}</p>}
      </div>
    </section>
  );
}
