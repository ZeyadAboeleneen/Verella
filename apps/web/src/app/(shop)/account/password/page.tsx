import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import Link from "@/components/LocaleLink";
import { privateMetadata } from "@/lib/seo";
import { getSessionUser } from "@/lib/auth/rbac";
import { ChangePasswordForm } from "@/components/admin/account/change-password-form";

export const metadata: Metadata = privateMetadata("Change password");

export default async function AccountPasswordPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?callbackUrl=/account/password");

  return (
    <div className="min-h-screen bg-ivory">
      <div className="mx-auto max-w-lg px-5 py-8 md:py-12">
        <Link
          href="/account"
          className="mb-6 inline-flex items-center gap-1 text-sm font-semibold text-on-surface-variant transition-colors hover:text-charcoal"
        >
          <ChevronLeft size={16} className="rtl:rotate-180" aria-hidden="true" />
          My Account
        </Link>
        <ChangePasswordForm />
      </div>
    </div>
  );
}
