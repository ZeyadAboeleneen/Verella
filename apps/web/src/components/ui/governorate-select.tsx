"use client";

import { forwardRef, type SelectHTMLAttributes } from "react";
import { EGYPT_GOVERNORATES } from "@verella/core";

/**
 * All 27 governorates, labelled in the page's language. The submitted value
 * is always the English name — that's what addresses store and what the
 * per-governorate delivery fee table is keyed by.
 */
export const GovernorateSelect = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement> & { locale?: "en" | "ar"; placeholder?: string }
>(function GovernorateSelect({ locale = "en", placeholder, className = "", ...props }, ref) {
  return (
    <select
      ref={ref}
      className={`flex h-11 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-charcoal/20 ${className}`}
      {...props}
    >
      <option value="" disabled>
        {placeholder ?? (locale === "ar" ? "اختر المحافظة" : "Select governorate")}
      </option>
      {EGYPT_GOVERNORATES.map((g) => (
        <option key={g.name} value={g.name}>
          {locale === "ar" ? g.ar : g.name}
        </option>
      ))}
    </select>
  );
});
