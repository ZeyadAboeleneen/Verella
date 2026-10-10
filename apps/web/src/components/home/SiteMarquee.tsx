import { getMarquee } from "@/lib/settings/queries";
import { getDict, getLocale } from "@/lib/i18n";
import { VMarquee } from "./VMarquee";

/**
 * The scrolling brand strip, with its text from Admin → Settings (same on
 * every page). Hidden when switched off; the built-in text when none is set.
 */
export async function SiteMarquee({ reverse, tone }: { reverse?: boolean; tone?: "dark" | "light" }) {
  const [marquee, locale, dict] = await Promise.all([
    getMarquee().catch(() => ({ enabled: true, items: [] })),
    getLocale(),
    getDict(),
  ]);
  if (!marquee.enabled) return null;
  // A phrase missing in this language falls back to the other one.
  const custom = marquee.items.map((i) => (locale === "ar" ? i.ar || i.en : i.en || i.ar)).filter(Boolean);
  const items = custom.length > 0 ? custom : dict.home.marquee;
  return <VMarquee items={items} reverse={reverse} tone={tone} />;
}
