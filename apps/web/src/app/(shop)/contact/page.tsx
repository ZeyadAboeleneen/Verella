import type { Metadata } from "next";
import { SimplePageHero } from "@/components/SimplePageHero";
import { ContactForm } from "@/components/contact/contact-form";

export const metadata: Metadata = {
  title: "Contact Us | Verella",
  description: "Get in touch with Verella Coffee — questions, feedback, or wholesale inquiries.",
};

const CHANNELS = [
  { icon: "call", label: "Phone", value: "+20 100 123 4567", href: "tel:+201001234567" },
  { icon: "location_on", label: "Flagship Branch", value: "Taksem Khattab, Mansoura, Egypt", href: "/branches" },
  { icon: "schedule", label: "Response Time", value: "1–2 business days", href: undefined },
];

export default function ContactPage() {
  return (
    <div>
      <SimplePageHero eyebrow="Get in touch" title="Contact Us" subtitle="We'd love to hear from you — questions, feedback, or wholesale inquiries." />
      <section className="mx-auto max-w-5xl px-5 py-12 md:px-16 md:py-16">
        <div className="grid gap-10 lg:grid-cols-5">
          {/* Channels */}
          <div className="space-y-4 lg:col-span-2">
            {CHANNELS.map(({ icon, label, value, href }) => {
              const body = (
                <>
                  <span aria-hidden="true" className="material-symbols-outlined text-2xl text-[#57392D]">{icon}</span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-[#8E7B6A]">{label}</p>
                    <p className="mt-1 text-sm font-medium text-[#000000]">{value}</p>
                  </div>
                </>
              );
              const classes =
                "flex items-center gap-4 rounded-2xl border border-[#e8d5bc]/60 p-5 transition-colors";
              return href ? (
                <a key={label} href={href} className={`${classes} hover:border-[#57392D]`}>
                  {body}
                </a>
              ) : (
                <div key={label} className={classes}>
                  {body}
                </div>
              );
            })}
            <p className="pt-2 text-sm leading-relaxed text-[#4A3026]">
              For wholesale partnerships, see our{" "}
              <a href="/wholesale" className="text-[#57392D] underline">
                Wholesale page
              </a>
              .
            </p>
          </div>

          {/* Form */}
          <div className="lg:col-span-3">
            <h2 className="mb-4 font-[family-name:var(--font-plus-jakarta)] text-xl font-bold text-[#000000]">
              Send us a message
            </h2>
            <ContactForm />
          </div>
        </div>
      </section>
    </div>
  );
}
