import { getDict } from "@/lib/i18n";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const [dict, params] = await Promise.all([getDict(), searchParams]);
  return <ResetPasswordForm dict={dict} token={params.token ?? ""} />;
}
