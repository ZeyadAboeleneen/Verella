import type { Metadata } from "next";
import { SimplePageHero } from "@/components/SimplePageHero";

export const metadata: Metadata = {
  title: "Sourcing | Verella",
  description: "How Verella Coffee sources its beans.",
};

const ORIGINS = [
  { name: "Ethiopia", note: "Bright, floral washed lots from Yirgacheffe and Sidamo." },
  { name: "Brazil", note: "Full-bodied, nutty naturals from smallholder farms in Minas Gerais." },
  { name: "Colombia", note: "Balanced, fruit-forward beans from the Huila region." },
  { name: "Yemen", note: "Rare heirloom varieties honoring the origins of Arabic coffee." },
];

export default function SourcingPage() {
  return (
    <div>
      <SimplePageHero
        eyebrow="Our Craft"
        title="Sourcing"
        subtitle="We build direct relationships with farmers across the coffee belt to bring you beans with real provenance."
      />
      <section className="py-16 px-5 md:px-16 max-w-3xl mx-auto space-y-6 text-[#4A3026] leading-relaxed">
        <p>
          Every bag of Verella coffee begins with a relationship, not a transaction. We work directly with
          farmers and cooperatives, visiting origin whenever we can, to ensure fair prices and consistent quality
          from harvest to harvest.
        </p>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {ORIGINS.map(({ name, note }) => (
            <div key={name} className="rounded-2xl border border-[#e8d5bc]/60 p-6">
              <h3 className="font-[family-name:var(--font-plus-jakarta)] text-lg font-semibold text-black">{name}</h3>
              <p className="mt-2 text-sm">{note}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
