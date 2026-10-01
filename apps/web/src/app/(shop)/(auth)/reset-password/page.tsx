import { getDict } from "@/lib/i18n";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; setup?: string }>;
}) {
  const [dict, params] = await Promise.all([getDict(), searchParams]);
  // setup=1: the "create your password" link sent with a guest's order.
  return <ResetPasswordForm dict={dict} token={params.token ?? ""} setup={params.setup === "1"} />;
}
