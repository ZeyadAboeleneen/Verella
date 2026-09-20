import "server-only";
import { unstable_cache } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db, settings } from "@verella/db";
import type { GovernorateFee } from "./actions";

// Settings are read constantly (site name alone is fetched by the root
// layout's generateMetadata on EVERY page navigation site-wide) but change
// rarely — an admin editing Settings maybe a few times a month. Leaving these
// uncached meant every single click anywhere on the site paid for a
// round-trip to the remote shared-hosting MySQL server before it could even
// start rendering. Same time-based-only rationale as the catalog queries
// (see store/queries.ts) — admin Settings saves already call revalidatePath,
// this just bounds how stale the underlying read can be in between.
const SETTINGS_REVALIDATE_SECONDS = 300;

async function getSetting(group: string, key: string): Promise<unknown> {
  const [row] = await db
    .select({ value: settings.value })
    .from(settings)
    .where(and(eq(settings.group, group), eq(settings.key, key)))
    .limit(1);
  return row?.value;
}

/** Per-governorate delivery fees configured in Admin → Settings (may be empty). */
async function getGovernorateFeesImpl(): Promise<GovernorateFee[]> {
  const value = await getSetting("checkout", "governorate_fees").catch(() => null);
  if (!Array.isArray(value)) return [];
  return value.filter(
    (g): g is GovernorateFee => typeof g === "object" && g !== null && typeof g.name === "string" && typeof g.fee === "string",
  );
}
export const getGovernorateFees = unstable_cache(getGovernorateFeesImpl, ["settings-governorate-fees"], {
  revalidate: SETTINGS_REVALIDATE_SECONDS,
});

/** Where contact-form messages and admin alerts (new orders, etc.) are sent. */
async function getNotificationEmailImpl(): Promise<string> {
  const value = await getSetting("notifications", "email").catch(() => null);
  return typeof value === "string" && value.trim() ? value.trim() : "zeyad5zoks@gmail.com";
}
export const getNotificationEmail = unstable_cache(getNotificationEmailImpl, ["settings-notification-email"], {
  revalidate: SETTINGS_REVALIDATE_SECONDS,
});

const DEFAULT_SITE_NAME = { en: "Verella", ar: "Verella" };

/** Site name configured in Admin → Settings → General. */
async function getSiteNameImpl(): Promise<{ en: string; ar: string }> {
  const value = (await getSetting("site", "name").catch(() => null)) as { en?: string; ar?: string } | null;
  return {
    en: value?.en?.trim() || DEFAULT_SITE_NAME.en,
    ar: value?.ar?.trim() || DEFAULT_SITE_NAME.ar,
  };
}
export const getSiteName = unstable_cache(getSiteNameImpl, ["settings-site-name"], {
  revalidate: SETTINGS_REVALIDATE_SECONDS,
});

/** Default currency configured in Admin → Settings → General — used for new store products. */
async function getSiteCurrencyImpl(): Promise<string> {
  const value = await getSetting("site", "currency").catch(() => null);
  return typeof value === "string" && value.trim() ? value.trim().toUpperCase() : "EGP";
}
export const getSiteCurrency = unstable_cache(getSiteCurrencyImpl, ["settings-site-currency"], {
  revalidate: SETTINGS_REVALIDATE_SECONDS,
});

/** Whether guests may check out without an account (Admin → Settings → General). */
async function isGuestCheckoutEnabledImpl(): Promise<boolean> {
  const value = await getSetting("checkout", "guest_checkout_enabled").catch(() => null);
  return value !== false;
}
export const isGuestCheckoutEnabled = unstable_cache(isGuestCheckoutEnabledImpl, ["settings-guest-checkout-enabled"], {
  revalidate: SETTINGS_REVALIDATE_SECONDS,
});

/** InstaPay account to display at checkout so customers know where to send the payment. */
async function getInstapayDetailsImpl(): Promise<{ number: string; name: string }> {
  const [number, name] = await Promise.all([
    getSetting("checkout", "instapay_number").catch(() => null),
    getSetting("checkout", "instapay_name").catch(() => null),
  ]);
  return {
    number: typeof number === "string" ? number.trim() : "",
    name: typeof name === "string" ? name.trim() : "",
  };
}
export const getInstapayDetails = unstable_cache(getInstapayDetailsImpl, ["settings-instapay-details"], {
  revalidate: SETTINGS_REVALIDATE_SECONDS,
});
