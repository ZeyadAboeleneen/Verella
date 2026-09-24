import type { MetadataRoute } from "next";
import { SUPPORTED_LOCALES } from "@verella/core";
import { siteUrl } from "@/lib/seo";

const PRIVATE_SEGMENTS = ["/admin", "/account", "/cart", "/checkout", "/order", "/login", "/register"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Every page lives behind a visible /en or /ar prefix (see proxy.ts),
      // so each private route is disallowed under both locale prefixes as
      // well as bare (the bare path only redirects).
      disallow: [
        "/api",
        ...PRIVATE_SEGMENTS,
        ...SUPPORTED_LOCALES.flatMap((locale) => PRIVATE_SEGMENTS.map((segment) => `/${locale}${segment}`)),
      ],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
