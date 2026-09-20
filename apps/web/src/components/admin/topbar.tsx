import Image from "next/image";
import Link from "next/link";
import { LogOut, Menu } from "lucide-react";
import { logoutAction } from "@/lib/auth/actions";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import type { Dictionary, Locale } from "@/lib/i18n";

export function AdminTopbar({
  name,
  email,
  locale,
  dict,
  onOpenNav,
}: {
  name: string;
  email: string;
  locale: Locale;
  dict: Dictionary["admin"];
  onOpenNav?: () => void;
}) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-outline-variant/60 bg-surface-container-lowest px-4 md:px-6">
      <div className="flex items-center gap-3">
        {onOpenNav && (
          <button type="button" onClick={onOpenNav} className="text-on-surface-variant md:hidden" aria-label="Open menu">
            <Menu size={22} />
          </button>
        )}
        <Link href="/admin" className="flex items-center gap-2">
          <Image src="/brand/logo-icon-crisp.png" alt="Verella" width={26} height={24} className="h-6 w-auto object-contain" priority />
          <span className="font-display text-sm font-bold text-on-surface">{dict.brandName}</span>
        </Link>
      </div>
      <div className="flex items-center gap-4">
        <LanguageSwitcher locale={locale} className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant" />
        <Link href="/admin/account" className="rounded-lg px-2 py-1 text-end hover:bg-surface-container" title={dict.myAccount}>
          <p className="text-sm font-semibold text-on-surface">{name}</p>
          <p className="text-xs text-on-surface-variant">{email}</p>
        </Link>
        <form action={logoutAction}>
          <button
            type="submit"
            className="flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container"
            title={dict.logout}
          >
            <LogOut size={18} />
          </button>
        </form>
      </div>
    </header>
  );
}
