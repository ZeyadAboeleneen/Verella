import type { MetadataRoute } from "next";
import { SUPPORTED_LOCALES } from "@verella/core";

function siteUrl() {
  return (process.env.AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

const PRIVATE_SEGMENTS = ["/admin", "/account", "/cart", "/checkout"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Every page now lives behind a visible /en or /ar prefix (see
      // proxy.ts), so each private route must be disallowed under both
      // locale prefixes — a bare "/admin" rule no longer matches "/en/admin".
      disallow: [
        "/api",
        ...SUPPORTED_LOCALES.flatMap((locale) => PRIVATE_SEGMENTS.map((segment) => `/${locale}${segment}`)),
      ],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
