import type { Metadata } from "next";
import { withDbTimeout } from "@/lib/db-timeout";
import { getBranches, localizeBranch, FALLBACK_BRANCH } from "@/lib/branches/queries";
import { getDict, getLocale } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Our Branches | Verella",
  description: "Visit Verella Coffee — find our branches, opening hours, and directions.",
};

export default async function BranchesPage() {
  const [dict, locale, rows] = await Promise.all([
    getDict(),
    getLocale(),
    withDbTimeout(getBranches()).catch(() => []),
  ]);
  const localizedFallback = localizeBranch(FALLBACK_BRANCH, locale);
  const list = (rows.length > 0 ? rows : [FALLBACK_BRANCH]).map((b) => localizeBranch(b, locale));
  const single = list.length === 1;
  const primaryMapUrl = list[0]?.mapUrl ?? localizedFallback.mapUrl!;

  const highlights = [
    { icon: "local_cafe", title: dict.branchesPage.highlight1Title, desc: dict.branchesPage.highlight1Desc },
    { icon: "storefront", title: dict.branchesPage.highlight2Title, desc: dict.branchesPage.highlight2Desc },
    { icon: "wifi", title: dict.branchesPage.highlight3Title, desc: dict.branchesPage.highlight3Desc },
    { icon: "shopping_bag", title: dict.branchesPage.highlight4Title, desc: dict.branchesPage.highlight4Desc },
  ];
  const tags = [dict.branchesPage.tagDineIn, dict.branchesPage.tagTakeaway, dict.branchesPage.tagFreeWifi, dict.branchesPage.tagRetailCorner];

  return (
    <div>
      {/* Hero banner */}
      <section
        className="relative h-[320px] md:h-[420px] flex items-end overflow-hidden"
        style={{
          backgroundImage:
            "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDQwUW2-Nl99Fd61IHy372RbhsPzdro6dQMmnL8hfvAx3NN86mzWCtw9WNxR_o8IHRBJzTeFboF-QdCcaIDrE-e2UM-lSzKq8ohYF6NaTS72PeZX2mU4d5zt0bsmkwW00cV31Y_A06xscg83zg9MNZnHp7pTUvthrI0qiQXqATOXeIUHzjPL3qMrCFzqejlmZ1qjFUoPlZGIgHSu05uIeKZg1wO17r6s3eVRn7QwgVa8dRyE_CFHaggMcLredAc_hms4P6b2rxUB9h1')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        <div className="relative z-10 px-5 md:px-16 pb-12 max-w-[1280px] mx-auto w-full">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#FFE2C6] mb-3 block">
            {single ? dict.branchesPage.ourLocation : dict.branchesPage.ourLocations}
          </span>
          <h1 className="font-[family-name:var(--font-plus-jakarta)] text-3xl md:text-6xl font-bold text-white leading-tight">
            {single ? list[0].name : dict.branchesPage.findABranch}
          </h1>
        </div>
      </section>

      {/* Branch cards — overlap the hero */}
      <div className="px-5 md:px-16 max-w-[1280px] mx-auto">
        <div className={`relative -mt-8 z-10 grid gap-4 md:gap-6 ${single ? "" : "md:grid-cols-2"}`}>
          {list.map((b) =>
            single ? (
              <div key={b.id} className="rounded-3xl p-6 md:p-8 luxury-shadow" style={{ background: "#F5F5DC" }}>
                <div className="flex flex-col gap-5 md:flex-row md:items-center md:gap-10">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-11 h-11 md:w-12 md:h-12 rounded-full bg-[#57392D] flex items-center justify-center flex-shrink-0">
                      <span aria-hidden="true" className="material-symbols-outlined text-white text-xl">location_on</span>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-[#57392D] mb-1">{dict.branchesPage.address}</p>
                      <p className="font-[family-name:var(--font-plus-jakarta)] text-lg md:text-xl font-bold text-black">
                        {b.address ?? "—"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-11 h-11 md:w-12 md:h-12 rounded-full bg-[#57392D] flex items-center justify-center flex-shrink-0">
                      <span aria-hidden="true" className="material-symbols-outlined text-white text-xl">schedule</span>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-[#57392D] mb-1">{dict.branchesPage.hours}</p>
                      <p className="font-[family-name:var(--font-plus-jakarta)] text-lg md:text-xl font-bold text-black">
                        {b.hours ?? dict.branchesPage.openDaily}
                      </p>
                    </div>
                  </div>

                  {b.mapUrl && (
                    <a
                      href={b.mapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0 bg-[#57392D] text-white px-7 py-3.5 rounded-full text-xs font-semibold uppercase tracking-widest hover:bg-[#412B22] transition-colors inline-flex items-center justify-center gap-2"
                    >
                      <span aria-hidden="true" className="material-symbols-outlined text-[18px]">directions</span>
                      {dict.branchesPage.getDirections}
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <div
                key={b.id}
                className="flex flex-col rounded-3xl p-6 md:p-8 luxury-shadow"
                style={{ background: "#F5F5DC" }}
              >
                <h2 className="font-[family-name:var(--font-plus-jakarta)] text-xl font-bold text-black mb-5">{b.name}</h2>

                <div className="flex-1 space-y-5">
                  <div className="flex items-start gap-4">
                    <div className="w-11 h-11 rounded-full bg-[#57392D] flex items-center justify-center flex-shrink-0">
                      <span aria-hidden="true" className="material-symbols-outlined text-white text-xl">location_on</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-widest text-[#57392D] mb-1">{dict.branchesPage.address}</p>
                      <p className="font-[family-name:var(--font-plus-jakarta)] text-base md:text-lg font-bold text-black leading-snug">
                        {b.address ?? "—"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-11 h-11 rounded-full bg-[#57392D] flex items-center justify-center flex-shrink-0">
                      <span aria-hidden="true" className="material-symbols-outlined text-white text-xl">schedule</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-widest text-[#57392D] mb-1">{dict.branchesPage.hours}</p>
                      <p className="font-[family-name:var(--font-plus-jakarta)] text-base md:text-lg font-bold text-black leading-snug">
                        {b.hours ?? dict.branchesPage.openDaily}
                      </p>
                    </div>
                  </div>
                </div>

                {b.mapUrl && (
                  <a
                    href={b.mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-6 w-full bg-[#57392D] text-white px-7 py-3.5 rounded-full text-xs font-semibold uppercase tracking-widest hover:bg-[#412B22] transition-colors inline-flex items-center justify-center gap-2"
                  >
                    <span aria-hidden="true" className="material-symbols-outlined text-[18px]">directions</span>
                    {dict.branchesPage.getDirections}
                  </a>
                )}
              </div>
            ),
          )}
        </div>
      </div>

      {/* What we offer */}
      <section className="py-12 md:py-20 px-5 md:px-16 max-w-[1280px] mx-auto">
        <h2 className="font-[family-name:var(--font-plus-jakarta)] text-2xl md:text-[32px] font-semibold text-black mb-8 md:mb-12 text-center">
          {dict.branchesPage.whatWeOffer}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
          {highlights.map(({ icon, title, desc }) => (
            <div
              key={title}
              className="bg-[#FAECD2] rounded-2xl p-5 md:p-8 text-center space-y-2.5 md:space-y-4 luxury-shadow hover:-translate-y-1 transition-transform duration-300"
            >
              <div className="w-11 h-11 md:w-14 md:h-14 rounded-full bg-[#57392D] flex items-center justify-center mx-auto">
                <span aria-hidden="true" className="material-symbols-outlined text-white text-xl md:text-2xl">{icon}</span>
              </div>
              <h3 className="font-[family-name:var(--font-plus-jakarta)] text-base md:text-lg font-semibold text-black">{title}</h3>
              <p className="text-[#4A3026] text-xs md:text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Ambiance strip */}
      <section className="bg-[#000000] py-12 md:py-20 px-5 md:px-16">
        <div className="max-w-[1280px] mx-auto flex flex-col md:flex-row items-center gap-8 md:gap-12">
          <div className="md:w-1/2 space-y-4 md:space-y-6">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#FFE2C6]">{dict.branchesPage.experienceKicker}</span>
            <h2 className="font-[family-name:var(--font-plus-jakarta)] text-2xl md:text-4xl font-bold text-white leading-snug">
              {dict.branchesPage.experienceTitle}
            </h2>
            <p className="text-[#FEE5C9] leading-relaxed">{dict.branchesPage.experienceBody}</p>
            <div className="flex flex-wrap gap-3 pt-2">
              {tags.map((tag) => (
                <span key={tag} className="bg-[#FFE2C6]/20 text-[#FFE2C6] border border-[#FFE2C6]/30 px-4 py-1.5 rounded-full text-xs font-semibold">
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <div
            className="md:w-1/2 h-72 md:h-96 w-full rounded-3xl overflow-hidden"
            style={{
              backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuAtHJO0P8lnQRgLkZnHiguKhs_L21LPF-xDZvzmr2trJ7KmpFR_hwwIf1zcxrNys4ORwC0tdjlJR4T7U_7d6Appl-R2awVjPZxpR81qcuTx8HhgMdz7tio5QUxPSMycuQ6HxZkVwBiu5jp8H9sTR6edkTYOTlujLoop-J4WUshVgHSjETPfi9TB8ffq3_VG-JCyYcR2SvJB1KSlIvqRar7kagI0IWN1-oruYe-iwd7kdM4LKVEdcKa4QfLCasHCj_IYgYoaATeIJtxq')",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 md:py-20 px-5 md:px-16 max-w-[1280px] mx-auto text-center space-y-4 md:space-y-6">
        <h2 className="font-[family-name:var(--font-plus-jakarta)] text-2xl md:text-3xl font-bold text-black">
          {dict.branchesPage.ctaTitle}
        </h2>
        <p className="text-[#4A3026] max-w-md mx-auto">{dict.branchesPage.ctaBody}</p>
        <a
          href={primaryMapUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-[#57392D] text-white px-10 py-4 rounded-full text-xs font-semibold uppercase tracking-widest hover:bg-[#412B22] transition-colors"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-[18px]">map</span>
          {dict.branchesPage.findUsOnMap}
        </a>
      </section>
    </div>
  );
}
