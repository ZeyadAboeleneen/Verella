import Link from "@/components/LocaleLink";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ChevronLeft } from "lucide-react";
import { getStoreProductBySlug } from "@/lib/store/queries";
import { getLocale, getDict } from "@/lib/i18n";
import { ProductDetail } from "@/components/ProductDetail";
import { jsonLdHtml, localizedPath, pageMetadata, siteUrl } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const [locale, dict] = await Promise.all([getLocale(), getDict()]);
  const product = await getStoreProductBySlug(slug, locale);
  const m = dict.meta.pages;
  if (!product) return { title: m.notFound, robots: { index: false } };
  const title = product.brand ? `${product.name} — ${product.brand}` : product.name;
  const description = product.description?.slice(0, 160) ?? m.productFallback.replace("{name}", product.name);
  return pageMetadata({ locale, path: `/store/${product.slug}`, title, description, image: product.image });
}

export default async function StoreProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [locale, dict] = await Promise.all([getLocale(), getDict()]);
  const product = await getStoreProductBySlug(slug, locale);
  if (!product) notFound();

  // Product structured data — lets search results show price and availability.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    ...(product.brand && { brand: { "@type": "Brand", name: product.brand } }),
    ...(product.description && { description: product.description }),
    image: product.images.length > 0 ? product.images.map((i) => i.url) : [product.image],
    offers: {
      "@type": "Offer",
      url: `${siteUrl()}${localizedPath(locale, `/store/${product.slug}`)}`,
      priceCurrency: "EGP",
      price: (product.priceValue / 100).toFixed(2),
      availability: product.stockQty > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  };

  return (
    <div className="mx-auto max-w-5xl px-5 py-12 md:px-16 md:py-16">
      <Link href="/store" className="mb-8 inline-flex items-center gap-1 text-xs font-medium uppercase tracking-[0.2em] text-on-surface-variant transition-colors hover:text-charcoal">
        <ChevronLeft size={14} className="rtl:rotate-180" />
        {dict.store.title}
      </Link>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdHtml(jsonLd)} />
      <ProductDetail product={product} dict={dict.product} />
    </div>
  );
}
