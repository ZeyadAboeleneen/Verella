import type { Metadata } from "next";
import { getAboutHero } from "@/lib/content/queries";
import { getDict } from "@/lib/i18n";
import { SocialIconLinks } from "@/components/social-links";
import About from "@/sections/About";
import ImmersiveExperience from "@/sections/ImmersiveExperience";
import InstagramGallery from "@/sections/InstagramGallery";
import Newsletter from "@/sections/Newsletter";

export const metadata: Metadata = {
  title: "Our Story | Verella",
  description: "From a single coffee cart in downtown Cairo to a beloved Egyptian heritage coffee brand.",
};

/** Shown until an image is set in Admin → About Page (or the DB is briefly unreachable). */
const FALLBACK_HERO_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAkH61wZIeWDQVG7XwTYY-UgMR2izAozhpZN5O6mWPcOyaus5yRNk_4n4oibOL05Z6PrWnyq76Jyy5DN9vmYgILrOgkzm4Oy6FC5dw0xb0xW4srS8s4ZEY0_T6tGzyD5JRX6LfFNSUN3PK8-cDZEYEsfbXz3eK4r7CtXVCbbkzsTPCN-Wfxd-atfgg_0HdgsC5ePQxQ_jLN7ql_uko3b4gM2z1UkjdrnsC4QwCnNZVmQGX_y9Xy9DUhIB9X7Mkg6Tz7G9v1tSlk37s6";

export default async function AboutPage() {
  const [heroImage, dict] = await Promise.all([
    getAboutHero().catch(() => null).then((v) => v ?? FALLBACK_HERO_IMAGE),
    getDict(),
  ]);

  const values = [
    { icon: "eco", title: dict.aboutPage.value1Title, desc: dict.aboutPage.value1Desc },
    { icon: "local_cafe", title: dict.aboutPage.value2Title, desc: dict.aboutPage.value2Desc },
    { icon: "history_edu", title: dict.aboutPage.value3Title, desc: dict.aboutPage.value3Desc },
    { icon: "groups", title: dict.aboutPage.value4Title, desc: dict.aboutPage.value4Desc },
  ];

  return (
    <div>
      {/* Hero */}
      <section className="relative h-[380px] md:h-[500px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('${heroImage}')` }} />
        <div className="absolute inset-0 bg-black/55" />
        <div className="relative z-10 text-center text-white space-y-4 px-5">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#57392D]">{dict.aboutPage.since}</span>
          <h1 className="font-[family-name:var(--font-plus-jakarta)] text-3xl md:text-5xl font-bold">{dict.aboutPage.title}</h1>
          <p className="text-[#FEE5C9] text-base md:text-lg max-w-xl mx-auto">{dict.aboutPage.subtitle}</p>
        </div>
      </section>

      {/* Story */}
      <section className="py-12 md:py-20 px-5 md:px-16 max-w-[1280px] mx-auto">
        <div className="max-w-3xl mx-auto space-y-5 md:space-y-6 text-[#4A3026] text-base md:text-lg leading-relaxed text-center">
          <p>{dict.aboutPage.storyP1}</p>
          <p>{dict.aboutPage.storyP2}</p>
          <p>{dict.aboutPage.storyP3}</p>
        </div>
      </section>

      {/* Heritage in Every Single Detail Section */}
      <About />

      {/* Values */}
      <section className="py-12 md:py-20 bg-[#FFE2C6]">
        <div className="px-5 md:px-16 max-w-[1280px] mx-auto">
          <h2 className="font-[family-name:var(--font-plus-jakarta)] text-2xl md:text-[32px] font-semibold text-black mb-8 md:mb-12 text-center">
            {dict.aboutPage.valuesTitle}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {values.map(({ icon, title, desc }) => (
              <div key={title} className="text-center space-y-2.5 md:space-y-4">
                <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-[#57392D] flex items-center justify-center mx-auto">
                  <span aria-hidden="true" className="material-symbols-outlined text-white text-xl md:text-2xl">{icon}</span>
                </div>
                <h3 className="font-[family-name:var(--font-plus-jakarta)] text-base md:text-xl font-semibold text-black">{title}</h3>
                <p className="text-[#4A3026] text-xs md:text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The Coffee Experience Section */}
      <ImmersiveExperience />

      {/* From Our Instagram Section */}
      <InstagramGallery />

      {/* Follow us */}
      <section className="py-12 md:py-20 px-5 md:px-16 max-w-[1280px] mx-auto text-center">
        <h2 className="font-[family-name:var(--font-plus-jakarta)] text-2xl md:text-[32px] font-semibold text-black mb-3">
          {dict.aboutPage.followTitle}
        </h2>
        <p className="text-[#4A3026] max-w-md mx-auto mb-8">{dict.aboutPage.followBody}</p>
        <SocialIconLinks
          className="flex justify-center gap-4"
          iconClassName="w-5 h-5"
          linkClassName="border-[#e8d5bc] text-[#57392D] hover:border-[#57392D] hover:bg-[#57392D] hover:text-white"
        />
      </section>

      {/* Join Our Coffee Circle (Newsletter) Section */}
      <Newsletter dict={dict} />
    </div>
  );
}
