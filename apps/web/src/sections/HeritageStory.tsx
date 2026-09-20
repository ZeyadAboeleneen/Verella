import Link from "next/link";
import { getDict } from "@/lib/i18n";
import type { Dictionary } from "@/lib/i18n";

function getCategories(dict: Dictionary) { return [
  {
    label: dict.home.heritage.coffeeBeans,
    icon: (
      <svg viewBox="0 0 64 64" fill="none" stroke="#57392D" strokeWidth="1.8" className="w-10 h-10">
        <rect x="10" y="28" width="44" height="28" rx="3" />
        <rect x="18" y="18" width="28" height="12" rx="2" />
        <line x1="32" y1="10" x2="32" y2="18" />
        <circle cx="20" cy="10" r="4" />
        <circle cx="44" cy="10" r="4" />
        <line x1="20" y1="10" x2="32" y2="10" />
        <line x1="32" y1="10" x2="44" y2="10" />
        <line x1="32" y1="36" x2="32" y2="50" />
        <line x1="24" y1="43" x2="40" y2="43" />
      </svg>
    ),
  },
  {
    label: dict.home.heritage.turkishCoffee,
    icon: (
      <svg viewBox="0 0 64 64" fill="none" stroke="#57392D" strokeWidth="1.8" className="w-10 h-10">
        <path d="M18 20 Q16 40 20 48 Q24 54 32 54 Q40 54 44 48 Q48 40 46 20 Z" />
        <line x1="18" y1="20" x2="46" y2="20" />
        <path d="M44 30 Q52 30 52 38 Q52 46 44 46" />
        <ellipse cx="32" cy="54" rx="10" ry="3" />
        <path d="M26 14 Q28 10 32 14 Q36 10 38 14" />
      </svg>
    ),
  },
  {
    label: dict.home.heritage.espresso,
    icon: (
      <svg viewBox="0 0 64 64" fill="none" stroke="#57392D" strokeWidth="1.8" className="w-10 h-10">
        <rect x="20" y="8" width="24" height="36" rx="4" transform="rotate(-30 32 32)" />
        <circle cx="38" cy="44" r="6" />
        <line x1="32" y1="44" x2="20" y2="56" strokeWidth="3" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: dict.home.heritage.accessories,
    icon: (
      <svg viewBox="0 0 64 64" fill="none" stroke="#57392D" strokeWidth="1.8" className="w-10 h-10">
        <path d="M14 38 Q14 52 32 52 Q50 52 50 38 L46 24 H18 Z" />
        <line x1="18" y1="24" x2="46" y2="24" />
        <path d="M46 32 Q54 32 54 38 Q54 44 46 44" />
        <ellipse cx="32" cy="52" rx="12" ry="3" />
        <line x1="14" y1="38" x2="50" y2="38" />
        <line x1="24" y1="52" x2="24" y2="58" />
        <line x1="40" y1="52" x2="40" y2="58" />
        <line x1="20" y1="58" x2="44" y2="58" />
      </svg>
    ),
  },
]; }

const CoffeeBeanSvg = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 40 56" className={className} fill="none">
    <ellipse cx="20" cy="28" rx="14" ry="22" fill="#FFE2C6" stroke="#8C6B57" strokeWidth="1.5" />
    <path d="M20 8 Q26 28 20 48" stroke="#8C6B57" strokeWidth="1.5" fill="none" />
    <path d="M20 8 Q14 28 20 48" stroke="#8C6B57" strokeWidth="1.5" fill="none" />
  </svg>
);

const CoffeeBranchSvg = () => (
  <svg viewBox="0 0 200 80" className="w-48 h-16 mx-auto" fill="none">
    <path d="M100 60 Q70 40 40 50 Q20 55 10 45" stroke="#57392D" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    <path d="M100 60 Q130 40 160 50 Q180 55 190 45" stroke="#57392D" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    <path d="M40 50 Q35 35 45 25" stroke="#57392D" strokeWidth="1.2" fill="none" />
    <ellipse cx="45" cy="22" rx="8" ry="11" fill="#FFE2C6" stroke="#57392D" strokeWidth="1" transform="rotate(-15 45 22)" />
    <path d="M45 12 Q50 22 45 32" stroke="#57392D" strokeWidth="0.8" fill="none" />
    <path d="M65 44 Q60 30 68 20" stroke="#57392D" strokeWidth="1.2" fill="none" />
    <ellipse cx="68" cy="17" rx="8" ry="11" fill="#FFE2C6" stroke="#57392D" strokeWidth="1" transform="rotate(-10 68 17)" />
    <path d="M68 7 Q73 17 68 27" stroke="#57392D" strokeWidth="0.8" fill="none" />
    <circle cx="30" cy="55" r="4" fill="#57392D" />
    <circle cx="55" cy="48" r="4" fill="#57392D" transform="rotate(-10 55 48)" />
    <path d="M160 50 Q155 35 165 25" stroke="#57392D" strokeWidth="1.2" fill="none" />
    <ellipse cx="165" cy="22" rx="8" ry="11" fill="#FFE2C6" stroke="#57392D" strokeWidth="1" transform="rotate(15 165 22)" />
    <path d="M165 12 Q160 22 165 32" stroke="#57392D" strokeWidth="0.8" fill="none" />
    <path d="M135 44 Q130 30 138 20" stroke="#57392D" strokeWidth="1.2" fill="none" />
    <ellipse cx="138" cy="17" rx="8" ry="11" fill="#FFE2C6" stroke="#57392D" strokeWidth="1" transform="rotate(10 138 17)" />
    <path d="M138 7 Q133 17 138 27" stroke="#57392D" strokeWidth="0.8" fill="none" />
    <circle cx="170" cy="55" r="4" fill="#57392D" />
    <circle cx="145" cy="48" r="4" fill="#57392D" transform="rotate(10 145 48)" />
    <path d="M95 60 Q100 45 100 30" stroke="#57392D" strokeWidth="1.2" fill="none" />
    <path d="M105 60 Q100 45 100 30" stroke="#57392D" strokeWidth="1.2" fill="none" />
    {/* swirl left */}
    <path d="M40 60 Q30 55 35 48 Q40 41 48 46" stroke="#57392D" strokeWidth="1" fill="none" strokeLinecap="round" />
    {/* swirl right */}
    <path d="M160 60 Q170 55 165 48 Q160 41 152 46" stroke="#57392D" strokeWidth="1" fill="none" strokeLinecap="round" />
  </svg>
);

const beans = [
  { top: "5%",  right: "2%",  size: "w-10 h-14", opacity: 0.6,  rotate: 12,  delay: "0s",    duration: "2s"  },
  { top: "12%", right: "8%",  size: "w-6 h-9",   opacity: 0.4,  rotate: -8,  delay: "0.5s",  duration: "2.8s"},
  { top: "25%", right: "1%",  size: "w-8 h-12",  opacity: 0.5,  rotate: 22,  delay: "1s",    duration: "2.4s"},
  { top: "45%", left:  "1%",  size: "w-10 h-14", opacity: 0.5,  rotate: -15, delay: "0.3s",  duration: "3s"  },
  { top: "60%", left:  "6%",  size: "w-6 h-9",   opacity: 0.35, rotate: 10,  delay: "0.8s",  duration: "2.2s"},
  { top: "35%", left:  "1%",  size: "w-7 h-10",  opacity: 0.3,  rotate: -22, delay: "1.4s",  duration: "2.6s"},
  { top: "75%", right: "2%",  size: "w-7 h-10",  opacity: 0.4,  rotate: 5,   delay: "0.2s",  duration: "2.9s"},
];

export default async function HeritageStory() {
  const dict = await getDict();
  const categories = getCategories(dict);
  return (
    <section
      className="relative overflow-hidden py-20"
      style={{ background: "linear-gradient(135deg, #F5F5DC 0%, #FCE8CD 50%, #F5F5DC 100%)" }}
    >
      {/* Subtle wood-grain lines */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-10" preserveAspectRatio="none">
        {[...Array(18)].map((_, i) => (
          <line key={i} x1={`${(i * 6) - 5}%`} y1="0" x2={`${(i * 6) + 5}%`} y2="100%" stroke="#57392D" strokeWidth="1" />
        ))}
      </svg>

      {/* Decorative beans — floating animation */}
      {beans.map((b, i) => (
        <div
          key={i}
          className={`absolute pointer-events-none z-20 ${b.size}`}
          style={{
            top: b.top,
            ...(b.right !== undefined ? { right: b.right } : { left: b.left }),
            opacity: b.opacity,
            ["--r" as string]: `${b.rotate}deg`,
            animation: `floatBean ${b.duration} ease-in-out ${b.delay} infinite alternate`,
          }}
        >
          <CoffeeBeanSvg className="w-full h-full" />
        </div>
      ))}

      <div className="relative z-10 max-w-[1280px] mx-auto px-5 md:px-8">

        {/* — Explore Our Heritage — */}
        <div className="text-center mb-10 md:mb-14">
          <h2
            className="font-[family-name:var(--font-plus-jakarta)] text-2xl md:text-3xl font-bold mb-8 md:mb-10"
            style={{ color: "#000000" }}
          >
            {dict.home.heritage.exploreHeritage}
          </h2>
          <div className="flex justify-center gap-3 md:gap-12">
            {categories.map(({ label, icon }) => (
              <div key={label} className="flex flex-col items-center gap-2 cursor-pointer group w-[72px] md:w-auto">
                <div
                  className="w-14 h-14 md:w-20 md:h-20 rounded-full border-2 flex items-center justify-center transition-all duration-300 group-hover:bg-[#FFE2C6]/30 flex-shrink-0"
                  style={{ borderColor: "#57392D" }}
                >
                  <div className="w-7 h-7 md:w-10 md:h-10 [&>svg]:w-full [&>svg]:h-full">{icon}</div>
                </div>
                <span className="text-[10px] md:text-sm font-medium text-center leading-tight" style={{ color: "#000000" }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* — Our Story — same overlapping layout on all screen sizes */}
        <div className="text-center mb-10">
          <h2
            className="font-[family-name:var(--font-plus-jakarta)] text-2xl md:text-3xl font-bold"
            style={{ color: "#000000" }}
          >
            {dict.home.heritage.ourStory}
          </h2>
        </div>

        <div className="relative max-w-xl md:max-w-2xl mx-auto" style={{ minHeight: 440 }}>
          {/* Vintage photo with wooden frame */}
          <div className="absolute left-0 top-0 z-10" style={{ width: "52%", paddingTop: "68%" }}>
            <div
              className="absolute inset-0 rounded-sm overflow-hidden"
              style={{
                border: "10px solid #57392D",
                boxShadow: "4px 4px 16px rgba(0,0,0,0.35), inset 0 0 0 2px #8C6B57",
              }}
            >
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAkH61wZIeWDQVG7XwTYY-UgMR2izAozhpZN5O6mWPcOyaus5yRNk_4n4oibOL05Z6PrWnyq76Jyy5DN9vmYgILrOgkzm4Oy6FC5dw0xb0xW4srS8s4ZEY0_T6tGzyD5JRX6LfFNSUN3PK8-cDZEYEsfbXz3eK4r7CtXVCbbkzsTPCN-Wfxd-atfgg_0HdgsC5ePQxQ_jLN7ql_uko3b4gM2z1UkjdrnsC4QwCnNZVmQGX_y9Xy9DUhIB9X7Mkg6Tz7G9v1tSlk37s6"
                alt="Historic Cairo street"
                className="w-full h-full object-cover"
                style={{ filter: "sepia(0.7) contrast(1.05) brightness(0.95)" }}
              />
            </div>
          </div>

          {/* Story card — overlaps photo */}
          <div
            className="absolute right-0 top-12 z-20 rounded-2xl p-5 md:p-8 flex flex-col gap-3 md:gap-5"
            style={{
              width: "64%",
              background: "#FFE2C6",
              boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
              minHeight: 320,
            }}
          >
            <h3
              className="font-[family-name:var(--font-plus-jakarta)] text-lg md:text-2xl font-bold leading-snug"
              style={{ color: "#000000" }}
            >
              {dict.home.heritage.storyTitle}
            </h3>
            <p className="text-xs md:text-sm leading-relaxed" style={{ color: "#000000" }}>
              {dict.home.heritage.storyP1}
            </p>
            <p className="text-xs md:text-sm leading-relaxed" style={{ color: "#000000" }}>
              {dict.home.heritage.storyP2}
            </p>
            <div className="mt-1"><CoffeeBranchSvg /></div>
            <div className="flex justify-end mt-auto">
              <Link
                href="/about"
                className="px-5 md:px-8 py-2.5 md:py-3 rounded-xl text-xs md:text-sm font-semibold text-white transition-all hover:opacity-90"
                style={{ background: "#57392D" }}
              >
                {dict.home.heritage.readFullStory}
              </Link>
            </div>
          </div>

          {/* Spacer */}
          <div style={{ paddingTop: "72%" }} />
        </div>

      </div>
    </section>
  );
}
