import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/rbac";
import { AdminShell } from "@/components/admin/admin-shell";
import { getDict, getLocale } from "@/lib/i18n";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Defense in depth: proxy.ts already gates /admin, but a page-level check
  // costs nothing and covers any future matcher changes (see proxy.ts note).
  // Mirrors proxy.ts's front-door check — any granted permission is enough
  // to enter the shell; dashboard.view is a feature permission for the KPI
  // overview page, not a prerequisite for the dashboard itself.
  const [user, locale, dict] = await Promise.all([getSessionUser(), getLocale(), getDict()]);
  if (!user || user.permissions.length === 0) {
    redirect("/login?callbackUrl=/admin");
  }

  return (
    <AdminShell
      permissions={user.permissions}
      name={user.name ?? user.email ?? "Admin"}
      email={user.email ?? ""}
      locale={locale}
      dict={dict.admin}
    >
      {children}
    </AdminShell>
  );
}
