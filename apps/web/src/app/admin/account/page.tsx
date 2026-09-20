import { getSessionUser } from "@/lib/auth/rbac";
import { ChangePasswordForm } from "@/components/admin/account/change-password-form";

export default async function AdminAccountPage() {
  const user = await getSessionUser();

  return (
    <div>
      <h1 className="mb-1 font-display text-2xl font-bold text-on-surface">My Account</h1>
      <p className="mb-6 text-sm text-on-surface-variant">
        Signed in as {user?.name ?? user?.email}
        {user?.email && user?.name ? ` · ${user.email}` : ""}
      </p>
      <ChangePasswordForm />
    </div>
  );
}
