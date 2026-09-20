import { getDict, getLocale } from "@/lib/i18n";
import { getBranches, localizeBranch, FALLBACK_BRANCH } from "@/lib/branches/queries";
import { withDbTimeout } from "@/lib/db-timeout";

export default async function Locations() {
  const [dict, locale, rows] = await Promise.all([getDict(), getLocale(), withDbTimeout(getBranches()).catch(() => [])]);
  const list = (rows.length > 0 ? rows : [FALLBACK_BRANCH]).map((b) => localizeBranch(b, locale));
  const branches = list.map((b) => ({ name: b.name, address: b.address ?? "—", active: true }));
  const primaryMapUrl = list[0]?.mapUrl ?? FALLBACK_BRANCH.mapUrl!;
  const primaryAddress = list[0]?.address ?? FALLBACK_BRANCH.address!;
  return (
    <section className="py-12 md:py-20 bg-[#FFE2C6] overflow-hidden">
      <div className="px-5 md:px-16 max-w-[1280px] mx-auto">

        {/* Mobile layout */}
        <div className="md:hidden space-y-5">
          <div className="space-y-1">
            <h2 className="font-[family-name:var(--font-plus-jakarta)] text-2xl font-semibold text-black">
              {dict.home.locations.title}
            </h2>
            <p className="text-[#4A3026] text-sm">{dict.home.locations.subtitle}</p>
          </div>

          {/* Map first on mobile */}
          <div className="w-full h-52 rounded-3xl overflow-hidden luxury-shadow">
            <div
              className="w-full h-full bg-cover bg-center"
              style={{
                backgroundImage: "url('/map.png')",
              }}
            />
          </div>

          {/* Info card */}
          <div className="bg-white rounded-3xl luxury-shadow p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-[#FAECD2] flex items-center justify-center flex-shrink-0">
                <span aria-hidden="true" className="material-symbols-outlined text-[#57392D] text-xl">location_on</span>
              </div>
              <div>
                <h4 className="font-bold text-black text-base">{list[0]?.name ?? dict.home.locations.branchName}</h4>
                <p className="text-sm text-[#4A3026]">{primaryAddress}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm text-[#4A3026]">
              <span aria-hidden="true" className="material-symbols-outlined text-[#57392D] text-base">schedule</span>
              {list[0]?.hours ?? dict.home.locations.openDailyHours}
            </div>
            <a
              href={primaryMapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full h-11 bg-[#57392D] text-white rounded-full text-xs font-semibold uppercase tracking-widest hover:bg-[#57392D] transition-all"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[18px]">directions</span>
              {dict.home.locations.getDirections}
            </a>
          </div>
        </div>

        {/* Desktop layout */}
        <div className="hidden md:flex flex-row gap-6 items-center">
          <div className="w-1/3 space-y-10">
            <div className="space-y-3">
              <h2 className="font-[family-name:var(--font-plus-jakarta)] text-[32px] font-semibold text-black">
                {dict.home.locations.title}
              </h2>
              <p className="text-[#4A3026] text-base">{dict.home.locations.subtitle}</p>
            </div>
            <div className="space-y-4">
              {branches.map(({ name, address, active }) => (
                <div
                  key={name}
                  className={`p-6 rounded-2xl luxury-shadow flex items-start gap-4 ${active ? "bg-white" : "bg-white/50 border border-[#8E7B6A]/10"}`}
                >
                  <span aria-hidden="true" className="material-symbols-outlined text-[#57392D]">location_on</span>
                  <div>
                    <h4 className="font-bold text-black">{name}</h4>
                    <p className="text-sm text-[#4A3026]">{address}</p>
                  </div>
                </div>
              ))}
            </div>
            <a
              href={primaryMapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full h-12 border-2 border-[#57392D] text-[#57392D] rounded-full text-xs font-semibold uppercase tracking-widest hover:bg-[#57392D] hover:text-white transition-all"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[18px]">directions</span>
              {dict.home.locations.getDirections}
            </a>
          </div>

          <div className="w-2/3 h-[500px] rounded-3xl overflow-hidden luxury-shadow">
            <div
              className="w-full h-full bg-cover bg-center"
              style={{
                backgroundImage: "url('/map.png')",
              }}
            />
          </div>
        </div>

      </div>
    </section>
  );
}
