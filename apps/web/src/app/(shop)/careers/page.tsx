import type { Metadata } from "next";
import { SimplePageHero } from "@/components/SimplePageHero";

export const metadata: Metadata = {
  title: "Careers | Verella",
  description: "Join the Verella Coffee team.",
};

const ROLES = [
  { title: "Barista", location: "Mansoura", type: "Full-time" },
  { title: "Roastery Assistant", location: "Mansoura", type: "Full-time" },
  { title: "Store Manager", location: "Mansoura", type: "Full-time" },
];

export default function CareersPage() {
  return (
    <div>
      <SimplePageHero
        eyebrow="Join us"
        title="Careers at Verella"
        subtitle="We're always looking for people who share our passion for coffee and hospitality."
      />
      <section className="py-16 px-5 md:px-16 max-w-3xl mx-auto">
        <div className="space-y-4">
          {ROLES.map(({ title, location, type }) => (
            <div key={title} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#e8d5bc]/60 p-6">
              <div>
                <h3 className="font-[family-name:var(--font-plus-jakarta)] text-lg font-semibold text-black">{title}</h3>
                <p className="text-sm text-[#8E7B6A]">{location} · {type}</p>
              </div>
              <a href="/contact" className="rounded-full bg-black px-6 py-2.5 text-xs font-semibold uppercase tracking-widest text-white hover:bg-[#57392D] transition-colors">
                Apply
              </a>
            </div>
          ))}
        </div>
        <p className="mt-10 text-center text-[#4A3026]">
          Don&apos;t see a role that fits? Reach out via our <a href="/contact" className="text-[#57392D] underline">Contact page</a> —
          we&apos;d still love to hear from you.
        </p>
      </section>
    </div>
  );
}
