import type { Metadata } from "next";
import { privateMetadata } from "@/lib/seo";
import { getDict } from "@/lib/i18n";
import { LoginForm } from "@/components/auth/login-form";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDict();
  return privateMetadata(dict.meta.pages.login.title);
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const [dict, params] = await Promise.all([getDict(), searchParams]);
  return <LoginForm dict={dict} callbackUrl={params.callbackUrl} />;
}
