// Shared between server code (settings/queries.ts, settings/actions.ts) and
// the client settings form — deliberately has no "server-only" import.

export const SITE_THEMES = ["classic", "dusk", "midnight", "emerald"] as const;
export type SiteTheme = (typeof SITE_THEMES)[number];

/** Labels + a couple of swatch colours for the Admin → Settings → Appearance picker. */
export const THEME_LABELS: Record<SiteTheme, { name: string; hint: string; swatch: [string, string] }> = {
  classic: { name: "Classic", hint: "Brand default — flat charcoal, no extra colour.", swatch: ["#141414", "#141414"] },
  dusk: { name: "Dusk", hint: "Deep plum fading to rose.", swatch: ["#2B1426", "#C9566B"] },
  midnight: { name: "Midnight", hint: "Deep indigo fading to periwinkle.", swatch: ["#0E1530", "#5C77C9"] },
  emerald: { name: "Emerald", hint: "Deep forest green fading to jade.", swatch: ["#0A241B", "#3FA980"] },
};
