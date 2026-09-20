"use client";

import { useState } from "react";
import { AdminSidebar } from "./sidebar";
import { AdminTopbar } from "./topbar";
import { Toaster } from "@/components/ui/toast";
import type { Dictionary, Locale } from "@/lib/i18n";

/**
 * Wraps the sidebar + topbar so the mobile hamburger toggle (in the topbar)
 * and the drawer it opens (the sidebar) can share state — the dashboard was
 * previously unusable on phones (fixed w-64 sidebar, no responsive handling).
 */
export function AdminShell({
  permissions,
  name,
  email,
  locale,
  dict,
  children,
}: {
  permissions: string[];
  name: string;
  email: string;
  locale: Locale;
  dict: Dictionary["admin"];
  children: React.ReactNode;
}) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      <Toaster />
      <AdminSidebar
        permissions={permissions}
        dict={dict}
        mobileOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <AdminTopbar name={name} email={email} locale={locale} dict={dict} onOpenNav={() => setMobileNavOpen(true)} />
        <main id="main-content" className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
