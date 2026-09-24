import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { getDict, getLocale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const [locale, dict] = await Promise.all([getLocale(), getDict()]);
  return pageMetadata({ locale, path: "/privacy", ...dict.meta.pages.privacy });
}

export default async function PrivacyPage() {
  const dict = await getDict();
  const t = dict.privacyPage;
  return <LegalPage {...t} labels={dict.legal} />;
}
