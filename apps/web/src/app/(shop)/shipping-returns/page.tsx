import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { getDict, getLocale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const [locale, dict] = await Promise.all([getLocale(), getDict()]);
  return pageMetadata({ locale, path: "/shipping-returns", ...dict.meta.pages.shipping });
}

export default async function ShippingReturnsPage() {
  const dict = await getDict();
  const t = dict.shippingPage;
  return (
    <LegalPage
      {...t}
      labels={dict.legal}
      before={
        <section className="border-b border-beige/60 bg-surface-bright px-5 md:px-16">
          <dl className="mx-auto grid max-w-[1100px] divide-y divide-beige/60 md:grid-cols-3 md:divide-x md:divide-y-0 rtl:md:divide-x-reverse">
            {t.highlights.map((h) => (
              <div key={h.title} className="space-y-1.5 py-8 md:px-8 md:first:ps-0 md:last:pe-0">
                <dt className="font-[family-name:var(--font-display)] text-lg font-medium text-charcoal">{h.title}</dt>
                <dd className="text-sm text-charcoal/70">{h.body}</dd>
              </div>
            ))}
          </dl>
        </section>
      }
    />
  );
}
