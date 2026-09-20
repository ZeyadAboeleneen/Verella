import type { Metadata } from "next";
import { SimplePageHero } from "@/components/SimplePageHero";

export const metadata: Metadata = {
  title: "Brewing Guides | Verella",
  description: "Brewing guides for Turkish coffee, espresso, and pour-over at home.",
};

const GUIDES = [
  {
    method: "Turkish Coffee",
    ratio: "1 heaped tsp per 60ml water",
    steps: [
      "Add finely ground coffee, water, and sugar (to taste) to a cezve.",
      "Heat slowly over low heat — do not stir once it starts to foam.",
      "Remove from heat just as it foams, let it settle, then return briefly to heat once more.",
      "Pour slowly into small cups, sharing the foam evenly.",
    ],
  },
  {
    method: "Espresso",
    ratio: "18g in, 36g out, ~28 seconds",
    steps: [
      "Grind fine and dose 18g into your portafilter.",
      "Tamp evenly and lock into the machine.",
      "Extract to roughly double the dose by weight in 25-30 seconds.",
      "Adjust grind finer if it runs too fast, coarser if too slow.",
    ],
  },
  {
    method: "Pour-Over",
    ratio: "1:16 coffee to water",
    steps: [
      "Grind medium-coarse, rinse your filter, and add coffee to the dripper.",
      "Bloom with double the coffee weight in water for 30 seconds.",
      "Pour the remaining water in slow circles over 2-3 minutes.",
      "Let it fully drain before removing the dripper.",
    ],
  },
];

export default function BrewingGuidesPage() {
  return (
    <div>
      <SimplePageHero eyebrow="Our Craft" title="Brewing Guides" subtitle="Get the most out of your beans, wherever you're brewing." />
      <section className="py-16 px-5 md:px-16 max-w-3xl mx-auto space-y-10">
        {GUIDES.map(({ method, ratio, steps }) => (
          <div key={method}>
            <h2 className="font-[family-name:var(--font-plus-jakarta)] text-2xl font-semibold text-black">{method}</h2>
            <p className="mt-1 text-sm font-semibold uppercase tracking-widest text-[#57392D]">{ratio}</p>
            <ol className="mt-4 space-y-2 text-[#4A3026] leading-relaxed list-decimal list-inside">
              {steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>
        ))}
      </section>
    </div>
  );
}
