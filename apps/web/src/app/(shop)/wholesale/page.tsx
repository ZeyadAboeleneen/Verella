import type { Metadata } from "next";
import { SimplePageHero } from "@/components/SimplePageHero";

export const metadata: Metadata = {
  title: "Wholesale | Verella",
  description: "Wholesale coffee partnerships for cafés, hotels, and offices.",
};

const PERKS = [
  { icon: "coffee_maker", title: "Custom Roasts", desc: "Blends tailored to your brewing equipment and menu." },
  { icon: "local_shipping", title: "Reliable Supply", desc: "Consistent volume and delivery schedules for your business." },
  { icon: "handshake", title: "Dedicated Support", desc: "A single point of contact for orders, training, and equipment." },
];

export default function WholesalePage() {
  return (
    <div>
      <SimplePageHero
        eyebrow="Business"
        title="Wholesale"
        subtitle="Bring Verella's heritage coffee to your café, hotel, or office."
      />
      <section className="py-16 px-5 md:px-16 max-w-3xl mx-auto space-y-12">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          {PERKS.map(({ icon, title, desc }) => (
            <div key={title} className="text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-[#57392D] flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined text-white text-xl" aria-hidden="true">{icon}</span>
              </div>
              <h3 className="font-[family-name:var(--font-plus-jakarta)] font-semibold text-black">{title}</h3>
              <p className="text-sm text-[#4A3026]">{desc}</p>
            </div>
          ))}
        </div>
        <div className="text-center">
          <a href="/contact" className="inline-block rounded-full bg-black px-8 py-3.5 text-xs font-semibold uppercase tracking-widest text-white hover:bg-[#57392D] transition-colors">
            Start a wholesale inquiry
          </a>
        </div>
      </section>
    </div>
  );
}
