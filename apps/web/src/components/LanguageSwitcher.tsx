"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { stripLocalePrefix } from "@/lib/i18n/client";
import type { Locale } from "@verella/core";

/**
 * Compact "EN / AR" segmented toggle — both abbreviations are always shown
 * (not just the target language), with the current one styled active. This
 * intentionally always renders the two Latin abbreviations rather than each
 * language's native name (previously "English" / "العربية"), since that read
 * as inconsistent/dated next to a plain toggle.
 *
 * Switching does a full page navigation (not router.push) to the /en or /ar
 * equivalent of the current page — a soft client-side transition leaves the
 * root layout's <html lang dir> (set server-side from the locale cookie)
 * stuck on the old value, since Next.js reuses that layout instance across
 * the two URLs instead of re-rendering it. A full navigation guarantees
 * proxy.ts stamps the cookie and the server re-renders <html> fresh.
 */
export function LanguageSwitcher({ locale, className }: { locale: Locale; className?: string }) {
  const pathname = usePathname();
  const [pending, setPending] = useState(false);

  function switchTo(target: Locale) {
    if (target === locale || pending) return;
    setPending(true);
    const rest = stripLocalePrefix(pathname);
    const targetPath = `/${target}${rest === "/" ? "" : rest}`;
    window.location.href = targetPath;
  }

  const textClass = className ?? "text-xs font-semibold uppercase tracking-widest transition-colors";

  return (
    // dir="ltr" pins "EN / AR" in that fixed order regardless of the page's
    // reading direction — a language switcher whose own option order flips
    // depending on which language is active would be disorienting.
    <div className="flex items-center gap-1.5" dir="ltr">
      <button
        type="button"
        onClick={() => switchTo("en")}
        disabled={pending}
        aria-current={locale === "en"}
        aria-label="Switch to English"
        className={`${textClass} disabled:opacity-50 ${locale === "en" ? "opacity-100" : "opacity-50 hover:opacity-80"}`}
      >
        EN
      </button>
      <span aria-hidden="true" className="text-xs opacity-40">
        /
      </span>
      <button
        type="button"
        onClick={() => switchTo("ar")}
        disabled={pending}
        aria-current={locale === "ar"}
        aria-label="التبديل إلى العربية"
        className={`${textClass} disabled:opacity-50 ${locale === "ar" ? "opacity-100" : "opacity-50 hover:opacity-80"}`}
      >
        AR
      </button>
    </div>
  );
}
