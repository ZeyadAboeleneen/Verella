import { getDict } from "@/lib/i18n";
import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const [dict, params] = await Promise.all([getDict(), searchParams]);
  return <LoginForm dict={dict} callbackUrl={params.callbackUrl} />;
}
