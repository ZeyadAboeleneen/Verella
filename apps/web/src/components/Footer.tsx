"use client";
import Link from "@/components/LocaleLink";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { Dictionary } from "@/lib/i18n";
import type { StoreCategoryView } from "@/lib/store/queries";
import { BRAND_CONTACT } from "@/lib/brand";
import { SocialIconLinks } from "@/components/social-links";
import { Lockup, VMark } from "@/components/brand/Logo";
import { reopenConsent } from "@/lib/consent";

type FooterLink = { label: string; href: string; external?: boolean };

function LinkList({ links, className = "" }: { links: FooterLink[]; className?: string }) {
  return (
    <ul className={`space-y-3 ${className}`}>
      {links.map(({ label, href, external }) => (
        <li key={href}>
          {external ? (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-ivory/70 transition-colors duration-300 hover:text-champagne"
            >
              {label}
            </a>
          ) : (
            <Link href={href} className="text-sm text-ivory/70 transition-colors duration-300 hover:text-champagne">
              {label}
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}

function ColumnTitle({ children }: { children: React.ReactNode }) {
  return <h4 className="text-[11px] font-medium uppercase tracking-[0.25em] text-champagne">{children}</h4>;
}

function MobileSection({ title, links }: { title: string; links: FooterLink[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-ivory/10">
      <button
        type="button"
        className="flex w-full items-center justify-between py-4"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <ColumnTitle>{title}</ColumnTitle>
        <ChevronDown
          className={`h-4 w-4 text-champagne transition-transform duration-300 ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className="overflow-hidden">
          <LinkList links={links} className="pb-5" />
        </div>
      </div>
    </div>
  );
}

export default function Footer({ dict, categories = [] }: { dict: Dictionary; categories?: StoreCategoryView[] }) {
  const f = dict.footer;

  const shop: FooterLink[] = [
    { label: f.shopAll, href: "/store" },
    ...categories.map((c) => ({ label: c.name, href: `/store?category=${c.slug}` })),
  ];
  const help: FooterLink[] = [
    { label: f.help.contact, href: "/contact" },
    { label: f.help.shipping, href: "/shipping-returns" },
    { label: f.help.faq, href: "/faq" },
  ];
  const company: FooterLink[] = [
    { label: f.company.about, href: "/about" },
    { label: f.company.privacy, href: "/privacy" },
    { label: f.company.terms, href: "/terms" },
  ];
  const contact: FooterLink[] = [
    { label: `${f.contact.whatsapp} · ${BRAND_CONTACT.whatsapp.display}`, href: BRAND_CONTACT.whatsapp.href, external: true },
    { label: BRAND_CONTACT.email.address, href: BRAND_CONTACT.email.href, external: true },
    { label: BRAND_CONTACT.instagram.handle, href: BRAND_CONTACT.instagram.href, external: true },
  ];

  return (
    <footer className="relative overflow-hidden bg-charcoal text-ivory">
      {/* A single cropped mark at the edge — the guidelines prefer this over a full repeat. */}
      <VMark
        size={520}
        className="pointer-events-none absolute -bottom-40 -end-24 text-champagne opacity-[0.05]"
      />

      <div className="relative mx-auto max-w-[1280px] px-5 pb-10 pt-14 md:px-16 md:pt-20">
        <div className="grid gap-10 md:grid-cols-12 md:gap-8">
          <div className="space-y-6 md:col-span-4">
            <Link href="/" aria-label="Verella — home" className="inline-block">
              <Lockup variant="primary" height={48} className="text-champagne" />
            </Link>
            <p className="max-w-xs text-sm leading-relaxed text-ivory/70">{f.tagline}</p>
            <SocialIconLinks className="flex gap-3" iconClassName="h-4 w-4" />
          </div>

          <div className="hidden space-y-5 md:col-span-2 md:block">
            <ColumnTitle>{f.shopTitle}</ColumnTitle>
            <LinkList links={shop} />
          </div>
          <div className="hidden space-y-5 md:col-span-2 md:block">
            <ColumnTitle>{f.helpTitle}</ColumnTitle>
            <LinkList links={help} />
          </div>
          <div className="hidden space-y-5 md:col-span-2 md:block">
            <ColumnTitle>{f.companyTitle}</ColumnTitle>
            <LinkList links={company} />
          </div>
          <div className="space-y-5 md:col-span-2">
            <ColumnTitle>{f.contactTitle}</ColumnTitle>
            <LinkList links={contact} />
          </div>

          <div className="border-t border-ivory/10 md:hidden">
            <MobileSection title={f.shopTitle} links={shop} />
            <MobileSection title={f.helpTitle} links={help} />
            <MobileSection title={f.companyTitle} links={company} />
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-3 border-t border-ivory/10 pt-6 text-xs text-ivory/50 md:flex-row">
          <p>
            © {new Date().getFullYear()} Verella. {f.rights}
          </p>
          <button
            type="button"
            onClick={reopenConsent}
            className="underline-offset-4 transition-colors hover:text-champagne hover:underline"
          >
            {dict.cookies.settings}
          </button>
          <p>
            Made by{" "}
            <a
              href="https://www.digitivaa.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-ivory/80 underline-offset-4 transition-colors hover:text-champagne hover:underline"
            >
              Digitiva
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
