import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import { SUPPORTED_LOCALES, DEFAULT_LOCALE, type Locale } from "@verella/core";
import { LOCALE_COOKIE } from "@/lib/i18n/constants";
import { getRequiredPermissionForPath, getFirstAccessiblePath } from "@/lib/admin/nav";

const LOCALE_COOKIE_OPTS = { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" as const };

function detectLocaleFromRequest(request: NextRequest): Locale {
  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;
  if (SUPPORTED_LOCALES.includes(cookieLocale as Locale)) return cookieLocale as Locale;

  const acceptLanguage = request.headers.get("accept-language") ?? "";
  if (/\bar\b/i.test(acceptLanguage.split(",")[0] ?? "")) return "ar";

  return DEFAULT_LOCALE;
}

/**
 * First-pass gate only — this is NOT the sole authorization boundary.
 * Server Actions bypass a Proxy matcher scoped to page routes, so every
 * mutating server action independently calls requirePermission() (see
 * src/lib/auth/rbac.ts). This also owns the site's /en, /ar URL-prefix
 * routing: every page lives at its plain (unprefixed) path in the app/
 * directory exactly as before — Proxy adds the visible /en or /ar prefix by
 * redirecting a bare request to the right locale, then rewriting the
 * prefixed URL back to the underlying unprefixed route on the way in.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const segments = pathname.split("/");
  const prefixLocale = segments[1];
  const hasLocalePrefix = SUPPORTED_LOCALES.includes(prefixLocale as Locale);

  if (!hasLocalePrefix) {
    const locale = detectLocaleFromRequest(request);
    const url = request.nextUrl.clone();
    url.pathname = pathname === "/" ? `/${locale}` : `/${locale}${pathname}`;
    const response = NextResponse.redirect(url);
    response.cookies.set(LOCALE_COOKIE, locale, LOCALE_COOKIE_OPTS);
    return response;
  }

  const locale = prefixLocale as Locale;
  const rest = segments.slice(2).join("/");
  const effectivePathname = rest ? `/${rest}` : "/";
  const withLocale = (path: string) => `/${locale}${path === "/" ? "" : path}`;

  if (effectivePathname.startsWith("/admin")) {
    const session = await auth();
    if (!session?.user) {
      const loginUrl = new URL(withLocale("/login"), request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
    const userPermissions = session.user.permissions ?? [];
    // Front door: any granted permission at all is enough to enter the
    // shell. Requiring the literal "dashboard.view" slug here used to lock
    // out any custom role that has plenty of other page permissions but
    // wasn't also explicitly given that specific one — dashboard.view is a
    // feature permission for the KPI overview page, not a prerequisite for
    // using the dashboard at all.
    if (userPermissions.length === 0) {
      return NextResponse.redirect(new URL(withLocale("/"), request.url));
    }
    // Per-page gate: being let into the shell doesn't mean access to every
    // page inside. Each admin route maps to a specific permission via
    // ADMIN_NAV, and a user missing that permission for the page they're
    // requesting gets sent to their first accessible page instead of seeing
    // (and being able to act on) a page nothing in their role actually
    // grants them — falling back to their first accessible page rather than
    // a hardcoded "/admin", since they may not have dashboard.view either.
    const requiredPermission = getRequiredPermissionForPath(effectivePathname);
    if (requiredPermission && !userPermissions.includes(requiredPermission)) {
      return NextResponse.redirect(new URL(withLocale(getFirstAccessiblePath(userPermissions)), request.url));
    }
  }

  // Rewrite the visible /en or /ar prefix away so the existing (unprefixed)
  // route tree keeps matching, and stamp the locale cookie so getLocale()
  // (cookie-based, unchanged) resolves correctly for this same request.
  request.cookies.set(LOCALE_COOKIE, locale);
  // The admin dashboard has no translation dictionary — its chrome is
  // English-only. root layout.tsx reads this header to force <html lang dir>
  // back to English/LTR under /admin regardless of the URL's locale prefix,
  // so an /ar/admin link doesn't render the (untranslated) English UI mirrored
  // right-to-left.
  request.headers.set("x-effective-pathname", effectivePathname);
  const rewriteUrl = request.nextUrl.clone();
  rewriteUrl.pathname = effectivePathname;
  const response = NextResponse.rewrite(rewriteUrl, { request: { headers: request.headers } });
  response.cookies.set(LOCALE_COOKIE, locale, LOCALE_COOKIE_OPTS);
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|api|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|xml|txt|json|webmanifest)$).*)",
  ],
};
