import { getDict, getLocale } from "@/lib/i18n";
import { getHomeHeroSlides, type HeroSlideView } from "@/lib/content/queries";
import { getStoreProducts } from "@/lib/store/queries";
import { HeroSlider, type HeroCartProduct } from "@/components/HeroSlider";

/** Shown until slides are configured in Admin → Home Page (placement "home_hero"). */
const FALLBACK_SLIDE: HeroSlideView = {
  id: 0,
  imageUrl:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuDpHYKaDbPH4GDNtKVPFXtZA_RQayLx4Q7gQKg0H16FobXpLQeOsPLnO_u-vIfevbrfB9xCRnrTZFV7qiE0DvxCvIT0Q5UnEcAFzGwlrrLx1o0INue903Sge4CRIO9Y14O4Dq1pWkVdFiy-96OgrmCI0NhfTNLSYZzpJEAm3VroFQszH7TgqQdh8gRKH0-iTxNNydoDmu9H7rvCQ5GH68F3kuErH43q_tLimva8ReDWnUnrtboLxylOnXzvpoG0OAXJK7FcM3qK1RCi",
  linkUrl: null,
  ctaText: null,
  link2Url: null,
  ctaText2: null,
  imageLinkUrl: null,
  title: null,
  subtitle: null,
};

function cartProductId(href: string | null): number | null {
  const match = href?.match(/^cart:(\d+)$/);
  return match ? Number(match[1]) : null;
}

export default async function Hero() {
  const [locale, dict] = await Promise.all([getLocale(), getDict()]);
  const slides = await getHomeHeroSlides(locale);
  const activeSlides = slides.length > 0 ? slides : [FALLBACK_SLIDE];

  // Only the hero slider needs product name/image/price to show a nice "added
  // to cart" toast — skip the catalog lookup entirely unless a slide actually
  // uses an "Add to cart" destination.
  const wantedIds = new Set(
    activeSlides.flatMap((s) => [cartProductId(s.linkUrl), cartProductId(s.link2Url), cartProductId(s.imageLinkUrl)]).filter((id): id is number => id != null),
  );
  let cartProducts: Record<number, HeroCartProduct> = {};
  if (wantedIds.size > 0) {
    const products = await getStoreProducts(locale).catch(() => []);
    cartProducts = Object.fromEntries(
      products.filter((p) => wantedIds.has(p.id)).map((p) => [p.id, { name: p.name, image: p.image, price: p.price }]),
    );
  }

  return (
    <HeroSlider
      slides={activeSlides}
      cartProducts={cartProducts}
      copy={{
        kicker: dict.home.hero.kicker,
        title: dict.home.hero.title,
        subtitle: dict.home.hero.subtitle,
        shopCoffee: dict.home.hero.shopCoffee,
        ourStory: dict.home.hero.ourStory,
      }}
    />
  );
}
