"use client";

import type { Dictionary } from "@/lib/i18n";

const CoffeeBranchSvg = () => (
  <svg viewBox="0 0 180 140" className="w-full h-full" fill="none">
    <path d="M20 130 Q40 100 60 80 Q80 60 100 50 Q120 40 150 30" stroke="#FFE2C6" strokeWidth="2" strokeLinecap="round" fill="none" />
    <path d="M60 80 Q50 60 55 40" stroke="#FFE2C6" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    <ellipse cx="52" cy="32" rx="14" ry="20" fill="none" stroke="#FFE2C6" strokeWidth="1.5" transform="rotate(-20 52 32)" />
    <path d="M52 14 Q58 32 52 50" stroke="#FFE2C6" strokeWidth="1" fill="none" />
    <path d="M80 65 Q72 48 76 30" stroke="#FFE2C6" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    <ellipse cx="74" cy="22" rx="12" ry="18" fill="none" stroke="#FFE2C6" strokeWidth="1.5" transform="rotate(-15 74 22)" />
    <path d="M74 6 Q80 22 74 38" stroke="#FFE2C6" strokeWidth="1" fill="none" />
    <path d="M100 50 Q95 32 98 16" stroke="#FFE2C6" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    <ellipse cx="97" cy="9" rx="11" ry="16" fill="none" stroke="#FFE2C6" strokeWidth="1.5" transform="rotate(-10 97 9)" />
    <path d="M97 -5 Q103 9 97 23" stroke="#FFE2C6" strokeWidth="1" fill="none" />
    <circle cx="40" cy="112" r="5" fill="#FFE2C6" />
    <circle cx="65" cy="95" r="4" fill="#FFE2C6" />
    <circle cx="88" cy="78" r="4" fill="#FFE2C6" />
    <path d="M20 130 Q15 120 22 112 Q29 104 38 108" stroke="#FFE2C6" strokeWidth="1.2" fill="none" strokeLinecap="round" />
    <path d="M35 118 Q28 108 33 98 Q38 88 47 92" stroke="#FFE2C6" strokeWidth="1.2" fill="none" strokeLinecap="round" />
  </svg>
);

const CoffeeBeanSmall = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 30 42" className={className} fill="none">
    <ellipse cx="15" cy="21" rx="10" ry="16" fill="#FFE2C6" stroke="#8C6B57" strokeWidth="1.2" />
    <path d="M15 6 Q19 21 15 36" stroke="#8C6B57" strokeWidth="1" fill="none" />
    <path d="M15 6 Q11 21 15 36" stroke="#8C6B57" strokeWidth="1" fill="none" />
  </svg>
);

export default function Newsletter({ dict }: { dict: Dictionary }) {
  return (
    <section className="py-10 px-4 md:py-16 md:px-16 max-w-[1280px] mx-auto">
      <div
        className="relative overflow-hidden rounded-3xl"
        style={{ background: "#F5F5DC", border: "2px solid #000000" }}
      >
        {/* Desktop layout */}
        <div className="hidden md:flex items-stretch min-h-[220px]">
          {/* Left: branch art */}
          <div className="relative w-52 flex-shrink-0">
            <div className="absolute bottom-0 left-0 w-52 h-44 pointer-events-none opacity-75">
              <CoffeeBranchSvg />
            </div>
          </div>

          {/* Center: content */}
          <div className="flex flex-col justify-center py-12 pr-12 flex-1">
            <h2
              className="font-[family-name:var(--font-plus-jakarta)] text-3xl font-bold mb-2"
              style={{ color: "#000000" }}
            >
              {dict.home.newsletter.title}
            </h2>
            <p className="text-base mb-6" style={{ color: "#57392D" }}>
              {dict.home.newsletter.subtitle}
            </p>
            <form
              className="flex rounded-xl overflow-hidden max-w-md"
              style={{ border: "1.5px solid #FFE2C6", background: "#F5F5DC" }}
              onSubmit={(e) => e.preventDefault()}
            >
              <input
                type="email"
                placeholder={dict.home.newsletter.placeholder}
                className="flex-grow px-5 py-3.5 bg-transparent outline-none text-sm"
                style={{ color: "#000000" }}
              />
              <button
                type="submit"
                className="px-7 py-3.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 flex-shrink-0"
                style={{ background: "#FFE2C6" }}
              >
                {dict.home.newsletter.subscribe}
              </button>
            </form>
          </div>

          {/* Right: decorative beans */}
          <div className="relative w-28 flex-shrink-0">
            <CoffeeBeanSmall className="absolute top-6 right-6 w-8 h-12 opacity-50 rotate-12" />
            <CoffeeBeanSmall className="absolute top-16 right-14 w-5 h-8 opacity-35 -rotate-8" />
            <CoffeeBeanSmall className="absolute bottom-8 right-4 w-7 h-10 opacity-45 rotate-20" />
          </div>
        </div>

        {/* Mobile layout */}
        <div className="md:hidden relative px-6 pt-8 pb-10">
          {/* Decorative beans top-right */}
          <CoffeeBeanSmall className="absolute top-4 right-4 w-7 h-10 opacity-50 rotate-12" />
          <CoffeeBeanSmall className="absolute top-10 right-12 w-4 h-7 opacity-35 -rotate-6" />

          <h2
            className="font-[family-name:var(--font-plus-jakarta)] text-2xl font-bold mb-2 leading-snug"
            style={{ color: "#000000" }}
          >
            {dict.home.newsletter.title}
          </h2>
          <p className="text-sm mb-6 leading-relaxed" style={{ color: "#57392D" }}>
            {dict.home.newsletter.subtitle}
          </p>

          {/* Stacked input + button on mobile */}
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => e.preventDefault()}
          >
            <input
              type="email"
              placeholder={dict.home.newsletter.placeholder}
              className="w-full px-5 py-4 rounded-xl text-sm outline-none"
              style={{
                background: "#F5F5DC",
                border: "1.5px solid #FFE2C6",
                color: "#000000",
              }}
            />
            <button
              type="submit"
              className="w-full py-4 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: "#FFE2C6" }}
            >
              {dict.home.newsletter.subscribe}
            </button>
          </form>

          {/* Branch bottom-left */}
          <div className="absolute bottom-0 left-0 w-36 h-28 pointer-events-none opacity-60">
            <CoffeeBranchSvg />
          </div>
        </div>
      </div>
    </section>
  );
}
