import Image from "next/image";
import Link from "next/link";
import { getDict } from "@/lib/i18n";

export default async function About() {
  const dict = await getDict();
  return (
    <section className="py-12 md:py-20 px-5 md:px-16 max-w-[1280px] mx-auto overflow-hidden">
      <div className="flex flex-col md:flex-row gap-10 md:gap-20 items-center">
        {/* Image always first on mobile */}
        <div className="w-full md:w-1/2 relative">
          <div className="relative z-10 w-full h-64 md:h-[500px] rounded-3xl overflow-hidden luxury-shadow">
            <Image
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAkH61wZIeWDQVG7XwTYY-UgMR2izAozhpZN5O6mWPcOyaus5yRNk_4n4oibOL05Z6PrWnyq76Jyy5DN9vmYgILrOgkzm4Oy6FC5dw0xb0xW4srS8s4ZEY0_T6tGzyD5JRX6LfFNSUN3PK8-cDZEYEsfbXz3eK4r7CtXVCbbkzsTPCN-Wfxd-atfgg_0HdgsC5ePQxQ_jLN7ql_uko3b4gM2z1UkjdrnsC4QwCnNZVmQGX_y9Xy9DUhIB9X7Mkg6Tz7G9v1tSlk37s6"
              alt="Historic Cairo coffee house"
              fill
              className="object-cover grayscale hover:grayscale-0 transition-all duration-1000"
            />
          </div>
          {/* Corner accents — desktop only */}
          <div className="hidden md:block absolute -top-10 -left-10 w-40 h-40 border-t-2 border-l-2 border-[#57392D]/30" />
          <div className="hidden md:block absolute -bottom-10 -right-10 w-40 h-40 border-b-2 border-r-2 border-[#57392D]/30" />
        </div>

        <div className="w-full md:w-1/2 space-y-5 md:space-y-8">
          <div className="space-y-3">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#57392D]">{dict.home.about.kicker}</span>
            <h2 className="font-[family-name:var(--font-plus-jakarta)] text-3xl md:text-5xl font-bold text-black leading-tight">
              {dict.home.about.title}
            </h2>
          </div>
          <p className="text-sm md:text-lg text-[#4A3026] leading-relaxed">{dict.home.about.p1}</p>
          <p className="text-sm md:text-base text-[#4A3026] leading-relaxed">{dict.home.about.p2}</p>
          <Link
            href="/about"
            className="group inline-flex items-center gap-3 text-black text-xs font-semibold uppercase tracking-widest border-b-2 border-black pb-2 hover:text-[#57392D] hover:border-[#57392D] transition-all"
          >
            {dict.home.about.cta}
            <span aria-hidden="true" className="material-symbols-outlined transition-transform group-hover:translate-x-2">
              arrow_right_alt
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
