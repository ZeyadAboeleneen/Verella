import type { MenuSectionView as MenuSection, MenuItemView as MenuItem } from "@/lib/menu/queries";
import type { Dictionary } from "@/lib/i18n";
import { CategoryVisual } from "./CategoryVisual";
import { IntroHeroBackground } from "./IntroHeroBackground";
import { MenuStickyNav } from "./MenuStickyNav";
import { ScrollToTop } from "./ScrollToTop";

type MenuDict = Dictionary["menuPage"];

function itemCountLabel(count: number, dict: MenuDict) {
  return `${count} ${count === 1 ? dict.itemSingular : dict.itemPlural}`;
}

// ─── Badge colour mapping ──────────────────────────────────────────────────
const BADGE_STYLES: Record<string, string> = {
  Popular:  "bg-[#57392D]/10 text-[#57392D] border border-[#57392D]/20",
  New:      "bg-emerald-50 text-emerald-700 border border-emerald-200",
  Seasonal: "bg-sky-50 text-sky-700 border border-sky-200",
  Heritage: "bg-[#000000]/8 text-[#000000] border border-[#000000]/15",
};

// ─── Category grid tile (the page's visual centrepiece) ───────────────────
function CategoryTile({ section, dict }: { section: MenuSection; dict: MenuDict }) {
  return (
    <a
      href={`#${section.id}`}
      className="group relative aspect-square sm:aspect-[3/4] overflow-hidden rounded-2xl sm:rounded-[1.5rem] bg-[#000000] shadow-[0_8px_24px_-8px_rgba(39,25,8,0.35)]"
    >
      <CategoryVisual section={section} sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-3.5 md:p-4">
        <p className="font-[family-name:var(--font-plus-jakarta)] text-[15px] md:text-lg font-bold leading-tight text-white">
          {section.title}
        </p>
        <p className="mt-0.5 text-[11px] font-medium text-white/70">{itemCountLabel(section.items.length, dict)}</p>
      </div>
    </a>
  );
}

// ─── Single menu item card ─────────────────────────────────────────────────
function MenuItemCard({ item }: { item: MenuItem }) {
  const singleSize = item.sizes.length === 1;

  return (
    <div className="group flex flex-col justify-between rounded-2xl sm:rounded-[1.25rem] border border-[#e8d5bc]/40 bg-white p-3.5 sm:p-5 shadow-[0_2px_10px_-4px_rgba(39,25,8,0.12)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#FFE2C6]/60 hover:shadow-[0_10px_24px_-8px_rgba(39,25,8,0.18)]">
      <div className="space-y-1 sm:space-y-1.5">
        {item.badge && (
          <span
            className={`inline-block text-[9px] sm:text-[10px] font-semibold uppercase tracking-widest px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full ${
              BADGE_STYLES[item.badge] ?? "bg-[#57392D]/10 text-[#57392D]"
            }`}
          >
            {item.badge}
          </span>
        )}
        <h3 className="font-[family-name:var(--font-plus-jakarta)] text-[13px] sm:text-[15px] font-semibold text-[#000000] leading-snug">
          {item.name}
        </h3>
        {item.description && (
          <p className="text-[#4A3026] text-[11px] sm:text-xs leading-relaxed line-clamp-2">
            {item.description}
          </p>
        )}
      </div>

      <div className="mt-3 sm:mt-4 border-t border-[#e8d5bc]/50 pt-2.5 sm:pt-3">
        {singleSize ? (
          <div className="flex items-baseline gap-2">
            <span className={`font-[family-name:var(--font-plus-jakarta)] text-sm sm:text-base font-bold ${item.sizes[0].compareAtPrice ? "text-red-600" : "text-[#57392D]"}`}>
              {item.sizes[0].price}
            </span>
            {item.sizes[0].compareAtPrice && (
              <span className="text-[#8E7B6A] text-xs line-through">{item.sizes[0].compareAtPrice}</span>
            )}
          </div>
        ) : (
          <ul className="space-y-0.5 sm:space-y-1">
            {item.sizes.map((s) => (
              <li key={s.size} className="flex items-center justify-between gap-2 text-xs sm:text-sm">
                <span className="text-[#4A3026] truncate">{s.size}</span>
                <div className="flex items-baseline gap-1.5">
                  <span className={`font-[family-name:var(--font-plus-jakarta)] font-bold whitespace-nowrap ${s.compareAtPrice ? "text-red-600" : "text-[#57392D]"}`}>{s.price}</span>
                  {s.compareAtPrice && (
                    <span className="text-[#8E7B6A] text-xs line-through">{s.compareAtPrice}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ─── One full category section: panoramic banner + item grid ──────────────
function MenuSectionBlock({ section, dict }: { section: MenuSection; dict: MenuDict }) {
  return (
    <section id={section.id} className="scroll-mt-32">
      {/* Panoramic banner — the "instant recognition" moment as you scroll */}
      <div className="group relative mb-4 h-28 overflow-hidden rounded-2xl sm:rounded-[1.75rem] sm:h-44 md:h-52 md:mb-8">
        <CategoryVisual section={section} sizes="100vw" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-4 sm:p-5 md:p-7">
          <h2 className="font-[family-name:var(--font-plus-jakarta)] text-xl sm:text-2xl font-bold text-white md:text-4xl">
            {section.title}
          </h2>
          <span className="hidden shrink-0 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm sm:inline-block">
            {itemCountLabel(section.items.length, dict)}
          </span>
        </div>
      </div>

      {/* Items grid — two columns even on phones so the list stays scannable */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-4">
        {section.items.map((item) => (
          <MenuItemCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}

// ─── Main page content — a Server Component. Only IntroHeroBackground,
// CategoryVisual, and MenuStickyNav actually need client-side JS (crossfade
// timer, image-error fallback state, and scroll-driven active-section
// tracking, respectively); everything else here — every item card, every
// category tile, all the copy — is static and was previously being shipped
// and hydrated as client JS for no reason because the whole page lived in
// one "use client" file. ────────────────────────────────────────────────
export default function MenuPageClient({
  sections,
  heroImages,
  dict,
}: {
  sections: MenuSection[];
  heroImages: string[];
  dict: MenuDict;
}) {
  return (
    <div className="min-h-screen bg-[#F5F5DC]">
      <ScrollToTop />
      {/* ── Compact intro ────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-[#000000] px-5 py-12 text-center md:px-16 md:py-16">
        <IntroHeroBackground images={heroImages} />
        <div className="relative z-10">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-[#FFE2C6]">{dict.kicker}</p>
          <h1 className="font-[family-name:var(--font-plus-jakarta)] text-3xl font-bold text-white md:text-5xl">
            {dict.title}
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm text-white/70 md:text-base">{dict.subtitle}</p>
        </div>
      </div>

      {/* ── Category showcase — instantly recognisable, no reading required ─ */}
      <div className="mx-auto max-w-[1280px] px-4 sm:px-5 py-6 sm:py-8 md:px-16 md:py-10">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 md:gap-4 lg:grid-cols-4">
          {sections.map((section) => (
            <CategoryTile key={section.id} section={section} dict={dict} />
          ))}
        </div>
      </div>

      {/* ── Sticky Section Nav ──────────────────────────────────────────── */}
      <MenuStickyNav sections={sections.map((s) => ({ id: s.id, title: s.title }))} />

      {/* ── Menu Content ────────────────────────────────────────────────── */}
      <div className="max-w-[1280px] mx-auto px-4 sm:px-5 md:px-16 py-8 md:py-14 space-y-10 sm:space-y-14 md:space-y-20">
        {sections.map((section) => (
          <MenuSectionBlock key={section.id} section={section} dict={dict} />
        ))}
      </div>

      {/* ── Footer CTA ──────────────────────────────────────────────────── */}
      <div className="bg-[#000000] py-12 md:py-16 px-5 text-center mt-4">
        <p className="text-[#FFE2C6] text-xs font-semibold uppercase tracking-[0.2em] mb-3">{dict.footerKicker}</p>
        <h2 className="font-[family-name:var(--font-plus-jakarta)] text-2xl md:text-3xl font-bold text-white mb-4">
          {dict.footerTitle}
        </h2>
        <p className="text-white/80 text-sm max-w-sm mx-auto mb-6">{dict.footerBody}</p>
        <a
          href="/branches"
          className="inline-flex items-center gap-2 bg-[#57392D] text-white px-8 py-3 rounded-full text-xs font-semibold uppercase tracking-widest hover:bg-[#412B22] transition-colors"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-[16px] select-none">location_on</span>
          {dict.findBranch}
        </a>
      </div>
    </div>
  );
}
