import Image from "next/image";
import Link from "next/link";
import { getDict } from "@/lib/i18n";

export default async function ImmersiveExperience() {
  const dict = await getDict();
  const stats = [
    { icon: "eco", label: dict.home.immersive.stat1Label, sub: dict.home.immersive.stat1Sub },
    { icon: "local_fire_department", label: dict.home.immersive.stat2Label, sub: dict.home.immersive.stat2Sub },
    { icon: "history_edu", label: dict.home.immersive.stat3Label, sub: dict.home.immersive.stat3Sub },
  ];
  return (
    <section className="relative min-h-[480px] md:h-[640px] flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0">
        <Image
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuDQwUW2-Nl99Fd61IHy372RbhsPzdro6dQMmnL8hfvAx3NN86mzWCtw9WNxR_o8IHRBJzTeFboF-QdCcaIDrE-e2UM-lSzKq8ohYF6NaTS72PeZX2mU4d5zt0bsmkwW00cV31Y_A06xscg83zg9MNZnHp7pTUvthrI0qiQXqATOXeIUHzjPL3qMrCFzqejlmZ1qjFUoPlZGIgHSu05uIeKZg1wO17r6s3eVRn7QwgVa8dRyE_CFHaggMcLredAc_hms4P6b2rxUB9h1"
          alt="Master roaster at work"
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-[#000000]/60" />
      </div>
      <div className="relative z-10 text-center max-w-4xl px-6 md:px-5 py-12 md:py-0">
        <h2 className="font-[family-name:var(--font-plus-jakarta)] text-3xl md:text-5xl font-bold text-white mb-4 md:mb-8">
          {dict.home.immersive.title}
        </h2>
        <p className="text-sm md:text-lg text-[#FEE5C9] mb-8 md:mb-10 leading-relaxed max-w-xl mx-auto">
          {dict.home.immersive.subtitle}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-12 text-white">
          {stats.map(({ icon, label, sub }) => (
            <div
              key={label}
              className="flex items-center gap-4 rounded-2xl bg-white/5 p-4 text-start md:flex-col md:items-center md:gap-0 md:bg-transparent md:p-0 md:text-center md:space-y-2"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[#57392D] text-3xl md:text-2xl shrink-0">{icon}</span>
              <div className="md:contents">
                <span className="font-[family-name:var(--font-plus-jakarta)] text-base md:text-2xl font-bold text-[#FFE2C6] md:text-[#57392D] block">
                  {label}
                </span>
                <p className="text-xs text-[#FEE5C9] md:opacity-70 leading-relaxed">{sub}</p>
              </div>
            </div>
          ))}
        </div>
        <Link
          href="/menu"
          className="mt-8 md:mt-12 inline-flex items-center gap-2 bg-[#57392D] text-white px-8 py-3.5 md:px-10 md:py-4 rounded-full text-xs font-semibold uppercase tracking-widest hover:bg-[#412B22] transition-colors"
        >
          {dict.home.immersive.viewMenu}
          <span aria-hidden="true" className="material-symbols-outlined text-[18px]">arrow_forward</span>
        </Link>
      </div>
    </section>
  );
}
