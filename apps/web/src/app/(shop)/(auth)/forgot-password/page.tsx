import { getDict } from "@/lib/i18n";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export default async function ForgotPasswordPage() {
  const dict = await getDict();
  return <ForgotPasswordForm dict={dict} />;
}
