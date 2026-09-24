import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { AtSign, MessageCircle } from "lucide-react";
import { SOCIAL_LINKS } from "@/components/social-links";
import { SimplePageHero } from "@/components/SimplePageHero";
import { ContactForm } from "@/components/contact/contact-form";
import { BRAND_CONTACT } from "@/lib/brand";
import { getDict, getLocale } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const [locale, dict] = await Promise.all([getLocale(), getDict()]);
  return pageMetadata({ locale, path: "/contact", ...dict.meta.pages.contact });
}

export default async function ContactPage() {
  const dict = await getDict();
  const t = dict.contact;

  const instagramGlyph = SOCIAL_LINKS.find((l) => l.label === "Instagram")?.icon;
  const channels = [
    { icon: <MessageCircle size={18} />, label: t.whatsapp, hint: t.whatsappHint, value: BRAND_CONTACT.whatsapp.display, href: BRAND_CONTACT.whatsapp.href },
    { icon: <AtSign size={18} />, label: t.email, value: BRAND_CONTACT.email.address, href: BRAND_CONTACT.email.href },
    { icon: <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] fill-current" aria-hidden="true">{instagramGlyph}</svg>, label: t.instagram, value: BRAND_CONTACT.instagram.handle, href: BRAND_CONTACT.instagram.href },
  ];

  return (
    <div>
      <SimplePageHero eyebrow={t.eyebrow} title={t.title} subtitle={t.subtitle} />
      <section className="mx-auto max-w-5xl px-5 py-12 md:px-16 md:py-20">
        <div className="grid gap-12 lg:grid-cols-5">
          <ul className="space-y-3 lg:col-span-2">
            {channels.map(({ icon, label, hint, value, href }) => (
              <li key={label}>
                <a
                  href={href}
                  target={href.startsWith("http") ? "_blank" : undefined}
                  rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
                  className="group flex items-center gap-4 rounded-2xl bg-surface-container-lowest p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_30px_-16px_rgba(20,20,20,0.35)]"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-charcoal text-champagne transition-transform duration-300 group-hover:scale-105">
                    {icon}
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.2em] text-on-surface-variant">
                      {label}
                      {hint && <span className="rounded-full bg-secondary-container px-2 py-0.5 text-[9px] tracking-wider text-on-secondary-container">{hint}</span>}
                    </span>
                    <span className="mt-1 block truncate text-sm text-charcoal" dir="ltr">
                      {value}
                    </span>
                  </span>
                </a>
              </li>
            ))}
          </ul>

          <div className="lg:col-span-3">
            <h2 className="mb-6 font-[family-name:var(--font-display)] text-2xl font-medium text-charcoal">{t.formTitle}</h2>
            <ContactForm labels={t} />
          </div>
        </div>
      </section>
    </div>
  );
}
