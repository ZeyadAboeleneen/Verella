import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { getDict, getLocale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const [locale, dict] = await Promise.all([getLocale(), getDict()]);
  return pageMetadata({ locale, path: "/terms", ...dict.meta.pages.terms });
}

export default async function TermsPage() {
  const dict = await getDict();
  const t = dict.termsPage;
  return <LegalPage {...t} labels={dict.legal} />;
}
