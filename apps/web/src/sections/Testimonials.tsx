import Image from "next/image";
import { getDict } from "@/lib/i18n";

const testimonials = [
  {
    name: "Omar Y.",
    initials: "OY",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuC4ZwdGmO_DCQ_aCgiwaPolMXaHgusfYkpwIs7fHmlbBxDfA6uuhnwAMYvMubrVmYYXtY0gXBmKNtiriXbDLwAFGweLRTltgsgUQ_W4UHNYn9_UjkKloMXnaDEUEk5aHm45KZ25PZ0jGkBnfJ9oM4eHULDOG4t1GGs0cCy1fQvE3IthcWYIUCvYtVosgW38GkHhLWE_T2pwYSB94qI5qcwlSihBA1L485ERxJlFeZlQ5DwFB30bWFM5EPJpwaBJ93xT1czcPstot8Uq",
    text: "The best coffee experience I've had in a long time. Rich flavor, beautiful atmosphere, and unmatched quality that truly honors our heritage.",
  },
  {
    name: "Dina M.",
    initials: "DM",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAEkkUYsBilZcRFKb99oIS5EiJRGznTw3K4rgIlYROhOvnlPUq4t12Ig32XJ3eXuk-vyQtZtz_NOTSVw-B7_OSNI5AqHs8kYVB98Ab0GYBm6PB18hN61mLajZ4k5rD7c_vwLUHp2_h07oSAlFG72QitHhHvVNBQ8Lx8cJNTrdfNXvsya2decTr31B_vtA8KSgLdJsnK1fdno3J86SKmzXAfEl9nENMcN-voi1OkLV5EPRwZDArMMaBOaqa8zai3fdcgl_cIKLTq8AVn",
    text: "Every sip feels like a trip back to the historic cafes of Cairo. The branding and packaging are just as exquisite as the coffee itself.",
  },
  {
    name: "Karim A.",
    initials: "KA",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBrEVFYM1L6FTqLYhtPRdwvLDFbDlk2ogIvmI8qFS5Au0K9deWoqdWQx0sQ54mAr3ovbV4L5RPWuTU6EnqStwp22LQVePhkSAeID5IZ3VKNjUIF76FCtlKGvuGNsy5Hm5tYtUOgAwriUbwm_6YgL4a70yyHow2kYqLXlaHNjrZJV6y4tH-l3W1mRiRYeczRwrmBCi8xnP8omOTmyaJGY14344_N7my9EOMQmjEodC4vRqNk-Y176LOOb_yaHfuo6d33HW5ajO6Iw9Uu",
    text: "The gift boxes are my go-to for special occasions. They are impeccably presented and always leave a lasting impression of luxury.",
  },
];

export default async function Testimonials() {
  const dict = await getDict();
  return (
    <section className="py-12 md:py-20 bg-[#FAECD2]">
      <div className="px-5 md:px-16 max-w-[1280px] mx-auto">
        <h2 className="font-[family-name:var(--font-plus-jakarta)] text-2xl md:text-[32px] font-semibold text-black mb-8 md:mb-12 text-center">
          {dict.home.testimonials.title}
        </h2>

        {/* Mobile: horizontal scroll — dir="ltr" keeps swipe/scroll direction consistent between languages */}
        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4 -mx-5 px-5 md:hidden" dir="ltr">
          {testimonials.map(({ name, initials, image, text }) => (
            <div
              key={name}
              className="min-w-[260px] max-w-[260px] flex-shrink-0 bg-white rounded-3xl luxury-shadow overflow-hidden"
            >
              {/* Accent top bar */}
              <div className="h-1 w-full bg-gradient-to-r from-[#FFE2C6] to-[#57392D]" />
              <div className="p-5 flex gap-4 items-start">
                {/* Avatar */}
                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[#57392D] relative flex-shrink-0 bg-[#FFE2C6] flex items-center justify-center">
                  <Image src={image} alt={name} fill className="object-cover" />
                  <span className="absolute text-xs font-bold text-[#57392D]">{initials}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm font-bold text-black">{name}</h4>
                    <div className="flex gap-0.5 text-[#57392D]" role="img" aria-label="5 out of 5 stars">
                      {[...Array(5)].map((_, i) => (
                        <span key={i} aria-hidden="true" className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                      ))}
                    </div>
                  </div>
                  <p className="text-[#4A3026] italic text-sm leading-relaxed">&ldquo;{text}&rdquo;</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop: grid */}
        <div className="hidden md:grid grid-cols-3 gap-8">
          {testimonials.map(({ name, image, text }) => (
            <div
              key={name}
              className="bg-white p-10 rounded-[1.75rem] luxury-shadow flex flex-col items-center space-y-6"
            >
              <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-[#57392D] relative flex-shrink-0">
                <Image src={image} alt={name} fill className="object-cover" />
              </div>
              <div className="flex gap-1 text-[#57392D]" role="img" aria-label="5 out of 5 stars">
                {[...Array(5)].map((_, i) => (
                  <span key={i} aria-hidden="true" className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                ))}
              </div>
              <p className="text-[#4A3026] italic leading-relaxed">&ldquo;{text}&rdquo;</p>
              <h4 className="text-xs font-semibold uppercase tracking-widest text-black">{name}</h4>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
