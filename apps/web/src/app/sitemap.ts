import type { MetadataRoute } from "next";
import { getStoreProducts } from "@/lib/store/queries";
import { DEFAULT_LOCALE } from "@verella/core";

function siteUrl() {
  return (process.env.AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

const STATIC_ROUTES = [
  "",
  "/about",
  "/branches",
  "/coffee",
  "/menu",
  "/store",
  "/faq",
  "/contact",
  "/shipping-returns",
  "/privacy",
  "/careers",
  "/sourcing",
  "/brewing-guides",
  "/wholesale",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const products = await getStoreProducts("en");

  // Every route now lives behind a visible /en or /ar prefix (see proxy.ts) —
  // the bare paths below 307-redirect rather than serving content directly,
  // so the sitemap must list the canonical prefixed URL search engines
  // should actually index.
  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((path) => ({
    url: `${base}/${DEFAULT_LOCALE}${path}`,
    changeFrequency: path === "" ? "daily" : "weekly",
    priority: path === "" ? 1 : 0.7,
  }));

  const productEntries: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${base}/${DEFAULT_LOCALE}/store/${p.slug}`,
    changeFrequency: "weekly",
    priority: 0.5,
  }));

  return [...staticEntries, ...productEntries];
}
