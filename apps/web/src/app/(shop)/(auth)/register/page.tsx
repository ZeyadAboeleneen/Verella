import type { Metadata } from "next";
import { privateMetadata } from "@/lib/seo";
import { getDict } from "@/lib/i18n";
import { RegisterForm } from "@/components/auth/register-form";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDict();
  return privateMetadata(dict.meta.pages.register.title);
}

export default async function RegisterPage() {
  const dict = await getDict();
  return <RegisterForm dict={dict} />;
}
