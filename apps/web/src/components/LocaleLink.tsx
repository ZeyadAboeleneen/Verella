"use client";

import NextLink from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";
import { SUPPORTED_LOCALES, DEFAULT_LOCALE, type Locale } from "@verella/core";

/** "/about" → "/ar/about" for the locale the visitor is currently browsing. */
export function withLocale(href: string, locale: Locale): string {
  if (!href.startsWith("/") || href.startsWith("//") || href.startsWith("/api")) return href;
  const first = href.split(/[/?#]/)[1];
  if (SUPPORTED_LOCALES.includes(first as Locale)) return href;
  return href === "/" ? `/${locale}` : `/${locale}${href}`;
}

/**
 * next/link that keeps the visitor's /en or /ar prefix. Routes are written
 * unprefixed ("/store"); proxy.ts would redirect those to the prefixed URL,
 * but that costs a round-trip on every click and points crawlers on Arabic
 * pages at English ones.
 */
export default function Link({ href, ...props }: ComponentProps<typeof NextLink>) {
  const pathname = usePathname();
  const current = pathname?.split("/")[1];
  const locale = SUPPORTED_LOCALES.includes(current as Locale) ? (current as Locale) : DEFAULT_LOCALE;
  return <NextLink href={typeof href === "string" ? withLocale(href, locale) : href} {...props} />;
}
