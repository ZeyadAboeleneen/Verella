import "server-only";
import { unstable_cache } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db, settings } from "@verella/db";
import { SETTINGS_CACHE_TAG } from "@/lib/settings/queries";
import ar from "@/lib/i18n/dictionaries/ar.json";
import en from "@/lib/i18n/dictionaries/en.json";
import type { HomeFeature, HomeFeatureText } from "./types";

const text = (v: unknown): HomeFeatureText => {
  const o = (v ?? {}) as Partial<Record<keyof HomeFeatureText, unknown>>;
  const s = (x: unknown) => (typeof x === "string" ? x : "");
  return { eyebrow: s(o.eyebrow), title: s(o.title), body: s(o.body), cta: s(o.cta) };
};

/** The built-in sections, used until the admin saves their own. */
export function defaultHomeFeatures(): HomeFeature[] {
  return en.home.features.map((f, i) => ({
    categorySlug: f.category,
    href: "",
    image: null,
    en: text(f),
    ar: text(ar.home.features[i]),
  }));
}

async function getHomeFeaturesImpl(): Promise<HomeFeature[]> {
  const [row] = await db
    .select({ value: settings.value })
    .from(settings)
    .where(and(eq(settings.group, "site"), eq(settings.key, "home_features")))
    .limit(1);
  const v = row?.value as { items?: unknown[] } | undefined;
  if (!v || !Array.isArray(v.items)) return defaultHomeFeatures();
  return v.items.map((raw) => {
    const r = (raw ?? {}) as Record<string, unknown>;
    const img = r.image as { id?: unknown; url?: unknown } | null | undefined;
    return {
      categorySlug: typeof r.categorySlug === "string" ? r.categorySlug : "",
      href: typeof r.href === "string" ? r.href : "",
      image: img && typeof img.id === "number" && typeof img.url === "string" ? { id: img.id, url: img.url } : null,
      ar: text(r.ar),
      en: text(r.en),
    };
  });
}
export const getHomeFeatures = unstable_cache(getHomeFeaturesImpl, ["settings-home-features"], {
  revalidate: 300,
  tags: [SETTINGS_CACHE_TAG],
});
