"use client";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import type { Dictionary } from "@/lib/i18n";
import type { LocalizedBranch } from "@/lib/branches/queries";
import { SocialIconLinks } from "@/components/social-links";

const EXPERIENCE_HREFS = ["/sourcing", "/brewing-guides", "/wholesale", "/careers"];
const CARE_HREFS = ["/contact", "/shipping-returns", "/branches", "/faq"];

function AccordionSection({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/10 md:border-none">
      <button
        className="w-full flex justify-between items-center py-4 md:py-0 md:cursor-default"
        onClick={() => setOpen(!open)}
      >
        <h4 className="text-xs font-semibold uppercase tracking-widest text-[#57392D]">{title}</h4>
        <span className="material-symbols-outlined text-[#57392D] text-lg md:hidden" aria-hidden="true">
          {open ? "expand_less" : "expand_more"}
        </span>
      </button>
      <ul className={`space-y-3 overflow-hidden transition-all duration-300 ${open ? "max-h-60 pb-4" : "max-h-0 md:max-h-none"} md:max-h-none md:pb-0 md:mt-6`}>
        {links.map(({ label, href }) => (
          <li key={label}>
            <Link href={href} className="text-[#FEE5C9] hover:text-[#57392D] transition-all text-sm md:text-base block py-0.5">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Footer({ dict, branches = [] }: { dict: Dictionary; branches?: LocalizedBranch[] }) {
  const sections = [
    { title: dict.footer.experienceTitle, links: dict.footer.experienceLinks.map((label, i) => ({ label, href: EXPERIENCE_HREFS[i] })) },
    { title: dict.footer.careTitle, links: dict.footer.careLinks.map((label, i) => ({ label, href: CARE_HREFS[i] })) },
  ];

  return (
    <footer className="bg-[#000000] border-t border-white/5">
      <div className="px-5 md:px-16 py-12 md:py-20 max-w-[1280px] mx-auto text-white">
        {/* Logo + tagline + socials */}
        <div className="mb-8 md:mb-0 md:contents">
          <div className="flex flex-col gap-5 md:contents">
            <div className="md:hidden space-y-4">
              <Link href="/">
                <Image
                  src="/verella-logo.png"
                  alt="Verella"
                  width={64}
                  height={64}
                  className="h-16 w-16 object-contain brightness-[0.85] sepia saturate-[3] hue-rotate-[5deg]"
                />
              </Link>
              <p className="text-[#FEE5C9] text-sm opacity-80 max-w-xs">{dict.footer.tagline}</p>
              <SocialIconLinks className="flex gap-3" />
            </div>
          </div>
        </div>

        {/* Desktop grid — dir="ltr" keeps the column order (logo, experience,
            care, branches) fixed between languages; only each column's own
            text content follows the page's natural reading direction. */}
        <div className="hidden md:grid grid-cols-4 gap-6" dir="ltr">
          <div className="space-y-6">
            <Link href="/">
              <Image src="/verella-logo.png" alt="Verella" width={72} height={72} className="h-18 w-18 object-contain brightness-[0.85] sepia saturate-[3] hue-rotate-[5deg]" />
            </Link>
            <p className="text-[#FEE5C9] text-base opacity-80">{dict.footer.tagline}</p>
            <SocialIconLinks className="flex gap-4" iconClassName="w-5 h-5" />
          </div>
          {sections.map(({ title, links }) => (
            <div key={title}>
              <h4 className="text-xs font-semibold uppercase tracking-widest text-[#57392D] mb-6">{title}</h4>
              <ul className="space-y-4">
                {links.map(({ label, href }) => (
                  <li key={label}><Link href={href} className="text-[#FEE5C9] hover:text-[#57392D] transition-all text-base">{label}</Link></li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest text-[#57392D] mb-6">
              {branches.length > 1 ? dict.footer.ourBranches : dict.footer.ourBranch}
            </h4>
            {branches.length > 0 ? (
              <ul className="space-y-4">
                {branches.slice(0, 3).map((b) => (
                  <li key={b.id}>
                    <p className="text-white font-bold">{b.name}</p>
                    {b.address && <p className="text-[#FEE5C9] text-sm opacity-80">{b.address}</p>}
                    {b.hours && <p className="text-[#FEE5C9] text-sm opacity-80">{b.hours}</p>}
                  </li>
                ))}
              </ul>
            ) : (
              <>
                <p className="text-[#FEE5C9] text-base opacity-80 mb-4">{dict.footer.branchHint}</p>
                <p className="text-white font-bold">{dict.footer.openDaily}</p>
              </>
            )}
            {branches.length > 1 && (
              <Link href="/branches" className="mt-4 inline-block text-sm font-semibold text-[#57392D] hover:underline">
                {dict.footer.viewAllBranches}
              </Link>
            )}
          </div>
        </div>

        {/* Mobile accordion */}
        <div className="md:hidden border-t border-white/10 mt-2">
          {sections.map(({ title, links }) => (
            <AccordionSection key={title} title={title} links={links} />
          ))}
          <div className="border-b border-white/10 py-4">
            <h4 className="text-xs font-semibold uppercase tracking-widest text-[#57392D] mb-2">
              {branches.length > 1 ? dict.footer.ourBranches : dict.footer.ourBranch}
            </h4>
            {branches.length > 0 ? (
              <ul className="space-y-2">
                {branches.slice(0, 3).map((b) => (
                  <li key={b.id} className="text-[#FEE5C9] text-sm opacity-80">
                    <span className="font-semibold text-white">{b.name}</span>
                    {b.address && ` — ${b.address}`}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[#FEE5C9] text-sm opacity-80">{dict.footer.branchHint}</p>
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-white/5 py-6 text-center px-5">
        <p className="text-[#FEE5C9] text-xs opacity-80">
          © {new Date().getFullYear()} Verella Coffee. {dict.footer.rights}
          <span className="mx-2">|</span>
          <Link href="/privacy" className="hover:text-[#57392D] transition-colors">{dict.footer.privacyPolicy}</Link>
          <span className="mx-2">|</span>
          <span>Made by </span>
          <a
            href="https://www.digitivaa.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-white hover:text-[#57392D] transition-colors underline underline-offset-2"
          >
            Digitiva
          </a>
        </p>
      </div>
    </footer>
  );
}
