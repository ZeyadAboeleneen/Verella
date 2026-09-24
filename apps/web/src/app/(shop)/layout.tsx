import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getDict, getLocale } from "@/lib/i18n";
import { getSessionUser } from "@/lib/auth/rbac";
import { getCartItemCount } from "@/lib/cart/queries";
import { getStoreCategories } from "@/lib/store/queries";
import { withDbTimeout } from "@/lib/db-timeout";
import { SmoothScroll } from "@/components/motion/SmoothScroll";
import { CookieConsent } from "@/components/CookieConsent";

export default async function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The nav's session/cart lookups are non-critical — if the DB blips or
  // hangs, render the page logged-out with an empty badge instead of failing
  // (or stalling) every route.
  const locale = await getLocale();
  const [dict, user, cartCount, categories] = await Promise.all([
    getDict(),
    withDbTimeout(getSessionUser()).catch(() => null),
    withDbTimeout(getCartItemCount()).catch(() => 0),
    withDbTimeout(getStoreCategories(locale)).catch(() => []),
  ]);

  return (
    <>
      <SmoothScroll />
      <Navbar dict={dict} locale={locale} user={user} cartCount={cartCount} categories={categories} />
      <main id="main-content">{children}</main>
      <Footer dict={dict} categories={categories} />
      {/* Read at request time (not NEXT_PUBLIC_) so the Docker image needs no rebuild to set it. */}
      <CookieConsent labels={dict.cookies} measurementId={process.env.GA_MEASUREMENT_ID || undefined} />
    </>
  );
}
