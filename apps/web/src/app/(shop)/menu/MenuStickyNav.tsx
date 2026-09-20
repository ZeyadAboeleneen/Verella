"use client";

import { useEffect, useRef, useState } from "react";

/** Sticky quick-jump nav with active-section highlighting — the only reason this page needs a scroll observer. */
export function MenuStickyNav({ sections }: { sections: { id: string; title: string }[] }) {
  const [activeId, setActiveId] = useState<string>(sections[0]?.id ?? "");
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sections.length) return;
    const observers: IntersectionObserver[] = [];
    sections.forEach((section) => {
      const el = document.getElementById(section.id);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveId(section.id); },
        { rootMargin: "-30% 0px -60% 0px", threshold: 0 },
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, [sections]);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const activePill = nav.querySelector(`[data-id="${activeId}"]`) as HTMLElement | null;
    if (!activePill) return;
    // Center the pill within the nav's own horizontal scroller only — never
    // use scrollIntoView here, since with no dedicated vertical scroll
    // container it scrolls the whole page to reach a pill that's still
    // below the fold on first mount, hijacking the page's initial scroll
    // position down to the nav itself.
    const targetLeft = activePill.offsetLeft - nav.clientWidth / 2 + activePill.clientWidth / 2;
    nav.scrollTo({ left: targetLeft, behavior: "smooth" });
  }, [activeId]);

  return (
    <div className="sticky z-30 border-b border-[#e8d5bc]/50 bg-[#F5F5DC]/90 backdrop-blur-md transition-[top] duration-300"
      style={{ top: "var(--nav-offset, 52px)" }}>
      {/* dir="ltr": scrollLeft sign conventions for RTL differ across
          browsers, which would break the offsetLeft-based auto-centering
          above — and a jump-nav's left-to-right pill order shouldn't flip
          with the page language anyway. */}
      <div ref={navRef} dir="ltr" className="mx-auto flex max-w-[1280px] gap-1.5 overflow-x-auto no-scrollbar px-5 py-2.5 md:px-16">
        {sections.map((s) => (
          <a key={s.id} data-id={s.id} href={`#${s.id}`}
            className={`flex-shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors duration-200 ${
              activeId === s.id ? "bg-[#000000] text-[#FFE2C6]" : "bg-transparent text-[#8E7B6A] hover:bg-[#FFE2C6] hover:text-[#000000]"
            }`}>
            {s.title}
          </a>
        ))}
      </div>
    </div>
  );
}
