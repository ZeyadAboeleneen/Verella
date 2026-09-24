import type { MetadataRoute } from "next";
import { DEFAULT_LOCALE } from "@verella/core";
import { getStoreProducts } from "@/lib/store/queries";
import { languageAlternates, localizedPath, siteUrl } from "@/lib/seo";

const STATIC_ROUTES = ["/", "/about", "/store", "/faq", "/contact", "/shipping-returns", "/privacy", "/terms"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  // A DB outage shouldn't take the sitemap down with it — fall back to the static pages.
  const products = await getStoreProducts("en").catch(() => []);

  // Every route lives behind a visible /en or /ar prefix (see proxy.ts); the
  // bare paths redirect, so list the canonical English URL and point search
  // engines at the Arabic twin through hreflang alternates.
  const entry = (path: string, priority: number, changeFrequency: "daily" | "weekly" | "monthly") => ({
    url: `${base}${localizedPath(DEFAULT_LOCALE, path)}`,
    changeFrequency,
    priority,
    alternates: {
      languages: Object.fromEntries(Object.entries(languageAlternates(path)).map(([l, p]) => [l, `${base}${p}`])),
    },
  });

  return [
    ...STATIC_ROUTES.map((path) =>
      entry(path, path === "/" ? 1 : path === "/store" ? 0.9 : 0.5, path === "/" || path === "/store" ? "daily" : "monthly"),
    ),
    ...products.map((p) => entry(`/store/${p.slug}`, 0.7, "weekly")),
  ];
}
