import { SUPPORTED_LOCALES, type Locale } from "@verella/core";

/**
 * Every visible URL now carries a /en or /ar prefix (see proxy.ts), while
 * every internal Link href/pathname comparison in the codebase was written
 * against the plain (unprefixed) route — e.g. href="/admin" vs a browser
 * pathname of "/en/admin". Client components doing that comparison
 * (usePathname() against a hardcoded href) need the prefix stripped first.
 */
export function stripLocalePrefix(pathname: string): string {
  const segments = pathname.split("/");
  const maybeLocale = segments[1];
  if (SUPPORTED_LOCALES.includes(maybeLocale as Locale)) {
    const rest = segments.slice(2).join("/");
    return rest ? `/${rest}` : "/";
  }
  return pathname;
}
