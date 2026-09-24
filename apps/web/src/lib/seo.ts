import type { Metadata } from "next";
import { SUPPORTED_LOCALES, DEFAULT_LOCALE, type Locale } from "@verella/core";

/** The public origin, e.g. https://verella.com — from AUTH_URL (also Auth.js's base URL). */
export function siteUrl(): string {
  return (process.env.AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

/** Locale-prefixed path, matching the /en | /ar URLs that proxy.ts serves. */
export function localizedPath(locale: Locale, path: string): string {
  return `/${locale}${path === "/" ? "" : path}`;
}

/** app/opengraph-image.png, served by Next at this path. */
const DEFAULT_SHARE_IMAGE = { url: "/opengraph-image.png", width: 1200, height: 630, alt: "Verella — Original Brands. One Destination." };

/** hreflang alternates for a path, pointing search engines at both languages. */
export function languageAlternates(path: string): Record<string, string> {
  return {
    ...Object.fromEntries(SUPPORTED_LOCALES.map((l) => [l, localizedPath(l, path)])),
    "x-default": localizedPath(DEFAULT_LOCALE, path),
  };
}

/**
 * Per-page metadata: localized title/description, canonical + hreflang, and
 * matching Open Graph / Twitter card text. The share image itself comes from
 * app/opengraph-image.png unless `image` is given (e.g. a product photo).
 */
export function pageMetadata({
  locale,
  path,
  title,
  description,
  image,
}: {
  locale: Locale;
  path: string;
  title: string;
  description: string;
  image?: string | null;
}): Metadata {
  const url = localizedPath(locale, path);
  // A page-level openGraph object replaces the layout's wholesale (including
  // the file-based app/opengraph-image.png), so the default card is restated.
  const images = image ? [{ url: image }] : [DEFAULT_SHARE_IMAGE];
  return {
    title,
    description,
    alternates: { canonical: url, languages: languageAlternates(path) },
    openGraph: {
      type: "website",
      siteName: "Verella",
      locale: locale === "ar" ? "ar_EG" : "en_US",
      url,
      title,
      description,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images,
    },
  };
}

/** Safe `dangerouslySetInnerHTML` payload for a JSON-LD <script> (escapes "<" so data can't close the tag). */
export function jsonLdHtml(data: unknown): { __html: string } {
  return { __html: JSON.stringify(data).replace(/</g, "\\u003c") };
}

/** Metadata for pages that must never be indexed (bag, checkout, account, order, auth). */
export function privateMetadata(title: string): Metadata {
  return { title, robots: { index: false, follow: false } };
}
