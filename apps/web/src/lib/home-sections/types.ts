/** One big image + text section on the home page (Admin → Home sections). */
export interface HomeFeatureText {
  eyebrow: string;
  title: string;
  body: string;
  cta: string;
}
export interface HomeFeature {
  /** Store category the button opens (and whose image is used when no own image is set). */
  categorySlug: string;
  /** Where the button goes ("/about", "/store/some-product", …); "" = the category above. */
  href: string;
  /** Own picture; null = use the category's image. */
  image: { id: number; url: string } | null;
  ar: HomeFeatureText;
  en: HomeFeatureText;
}

/** A section's text in one language (falling back to the other when empty) and its button link. */
export function resolveHomeFeature(f: HomeFeature, locale: "ar" | "en") {
  const t = (k: keyof HomeFeatureText) => (locale === "ar" ? f.ar[k] || f.en[k] : f.en[k] || f.ar[k]);
  return {
    eyebrow: t("eyebrow"),
    title: t("title"),
    body: t("body"),
    cta: t("cta"),
    href: f.href || `/store?category=${f.categorySlug}`,
  };
}
