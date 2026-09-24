import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Jost, Tajawal } from "next/font/google";
import "./globals.css";
import { getLocale, getDictionary, dir } from "@/lib/i18n";
import { siteUrl } from "@/lib/seo";
import { getSiteName } from "@/lib/settings/queries";
import { withDbTimeout } from "@/lib/db-timeout";

// Jost (Latin) and Tajawal (Arabic) are the brand guidelines' typefaces.
const jost = Jost({
  subsets: ["latin"],
  variable: "--font-jost",
  weight: ["300", "400", "500", "600", "700"],
});
const tajawal = Tajawal({
  subsets: ["arabic", "latin"],
  variable: "--font-tajawal",
  weight: ["300", "400", "500", "700"],
});

export async function generateMetadata(): Promise<Metadata> {
  const [locale, siteName] = await Promise.all([getLocale(), withDbTimeout(getSiteName()).catch(() => null)]);
  const name = ((locale === "ar" ? siteName?.ar : siteName?.en) ?? "Verella").toUpperCase();
  const dict = getDictionary(locale);
  return {
    metadataBase: new URL(siteUrl()),
    // Pages set a short title ("About"); the template brands it.
    title: { default: `${name} | ${dict.meta.tagline}`, template: `%s | ${name}` },
    description: dict.meta.description,
    applicationName: "Verella",
    openGraph: { type: "website", siteName: "Verella", locale: locale === "ar" ? "ar_EG" : "en_US" },
    twitter: { card: "summary_large_image" },
  };
}

// Declared via the Viewport API (not manual <head> JSX) so Next guarantees it
// on every render path — error pages, streamed responses, etc. Without it,
// real phones render at ~980px virtual width and the desktop layout shows.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#F5F0E8",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  // The admin dashboard's page content (tables, forms, buttons on individual
  // pages) isn't translated yet — only its chrome (sidebar/topbar) is — so
  // `dir` stays forced to ltr under /admin even for the Arabic locale,
  // otherwise the still-English page bodies would render mirrored
  // right-to-left. `lang`, however, follows the REAL locale regardless of
  // route: it doesn't affect layout/mirroring (only `dir` does), and it's
  // what the `html:lang(ar) body` rule in globals.css keys off to apply the
  // brand's Arabic font — forcing lang="en" here would leave the admin
  // sidebar's Arabic labels rendering in a system fallback font.
  const headersList = await headers();
  const isAdminRoute = (headersList.get("x-effective-pathname") ?? "").startsWith("/admin");
  const direction = isAdminRoute ? "ltr" : dir(locale);

  return (
    <html
      lang={locale}
      dir={direction}
      className={`${jost.variable} ${tajawal.variable} scroll-smooth`}
      data-scroll-behavior="smooth"
    >
      <body>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:start-2 focus:z-[100] focus:rounded-lg focus:bg-black focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
