import ProductCard from "@/components/ProductCard";
import { getBestSellerProducts } from "@/lib/store/queries";
import { getLocale, getDict } from "@/lib/i18n";

export default async function BestSellers() {
  const [locale, dict] = await Promise.all([getLocale(), getDict()]);
  // getBestSellerProducts is now itself cached (see store/queries.ts) — no
  // extra withDbTimeout wrapper needed, and the .catch keeps a DB blip from
  // taking the section down.
  const bestSellers = await getBestSellerProducts(locale, 8).catch(() => []);

  if (bestSellers.length === 0) return null;

  return (
    <section className="py-12 md:py-20 bg-[#F5F5DC]">
      <div className="px-5 md:px-16 max-w-[1280px] mx-auto">
        <div className="flex justify-between items-center mb-8 md:mb-12">
          <h2 className="font-[family-name:var(--font-plus-jakarta)] text-2xl md:text-[32px] font-semibold text-black">
            {dict.home.bestSellers.title}
          </h2>
          {/* dir="ltr": a horizontal-scroll carousel's prev/next semantics
              (left chevron = back) shouldn't invert with the page language. */}
          <div className="hidden md:flex gap-4" dir="ltr">
            <button className="w-12 h-12 rounded-full border border-[#8E7B6A] flex items-center justify-center hover:bg-black hover:text-white transition-all">
              <span aria-hidden="true" className="material-symbols-outlined">chevron_left</span>
            </button>
            <button className="w-12 h-12 rounded-full border border-[#8E7B6A] flex items-center justify-center hover:bg-black hover:text-white transition-all">
              <span aria-hidden="true" className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
        </div>

        <div className="flex gap-4 md:gap-6 overflow-x-auto no-scrollbar pb-4 -mx-5 px-5 md:-mx-0 md:px-0" dir="ltr">
          {bestSellers.map((p) => (
            <div key={p.id} className="min-w-[220px] md:min-w-[300px] flex-shrink-0">
              <ProductCard
                productId={p.id}
                slug={p.slug}
                name={p.name}
                price={p.price}
                compareAtPrice={p.compareAtPrice}
                rating={p.rating}
                tag={p.tag}
                badge={p.badge}
                image={p.image}
                alt={p.alt}
                addToCartLabel={dict.product.addToCart}
                addedLabel={dict.product.added}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
