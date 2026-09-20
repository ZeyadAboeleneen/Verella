import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getDict, getLocale } from "@/lib/i18n";
import { getSessionUser } from "@/lib/auth/rbac";
import { getCartItemCount } from "@/lib/cart/queries";
import { getBranches, localizeBranch } from "@/lib/branches/queries";
import { withDbTimeout } from "@/lib/db-timeout";

export default async function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The nav's session/cart lookups are non-critical — if the DB blips or
  // hangs, render the page logged-out with an empty badge instead of failing
  // (or stalling) every route.
  const [locale, dict, user, cartCount, branches] = await Promise.all([
    getLocale(),
    getDict(),
    withDbTimeout(getSessionUser()).catch(() => null),
    withDbTimeout(getCartItemCount()).catch(() => 0),
    withDbTimeout(getBranches()).catch(() => []),
  ]);
  const localizedBranches = branches.map((b) => localizeBranch(b, locale));

  return (
    <>
      <Navbar dict={dict} locale={locale} user={user} cartCount={cartCount} />
      <main id="main-content">{children}</main>
      <Footer dict={dict} branches={localizedBranches} />
    </>
  );
}
