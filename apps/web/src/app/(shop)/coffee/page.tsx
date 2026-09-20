import type { Metadata } from "next";
import ProductCard from "@/components/ProductCard";
import { getStoreProducts } from "@/lib/store/queries";
import { getLocale, getDict } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Our Coffee | Verella",
  description: "Explore our coffee origins — Ethiopia, Brazil, Colombia, and Yemen.",
};

export default async function CoffeePage() {
  const [locale, dict] = await Promise.all([getLocale(), getDict()]);
  const allProducts = await getStoreProducts(locale);
  const coffeeProducts = allProducts.filter((p) => p.categorySlug === "beans" || p.categorySlug === "espresso");

  const origins = [
    { name: dict.coffeePage.ethiopia, icon: "local_florist", description: dict.coffeePage.ethiopiaDesc },
    { name: dict.coffeePage.brazil, icon: "cookie", description: dict.coffeePage.brazilDesc },
    { name: dict.coffeePage.colombia, icon: "eco", description: dict.coffeePage.colombiaDesc },
    { name: dict.coffeePage.yemen, icon: "landscape", description: dict.coffeePage.yemenDesc },
  ];

  return (
    <div>
      {/* Hero */}
      <section className="py-14 md:py-24 px-5 md:px-16 max-w-[1280px] mx-auto text-center space-y-4 md:space-y-6">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#57392D]">{dict.coffeePage.kicker}</span>
        <h1 className="font-[family-name:var(--font-plus-jakarta)] text-3xl md:text-5xl font-bold text-black">
          {dict.coffeePage.title}
        </h1>
        <p className="text-[#4A3026] text-base md:text-lg max-w-2xl mx-auto">{dict.coffeePage.subtitle}</p>
      </section>

      {/* Origins */}
      <section className="py-12 md:py-16 bg-[#FFE2C6]">
        <div className="px-5 md:px-16 max-w-[1280px] mx-auto">
          <span className="block text-center text-xs font-semibold uppercase tracking-[0.2em] text-[#57392D] mb-2 md:mb-3">
            {dict.coffeePage.originsKicker}
          </span>
          <h2 className="font-[family-name:var(--font-plus-jakarta)] text-2xl md:text-[32px] font-semibold text-black mb-8 md:mb-12 text-center">
            {dict.coffeePage.originsTitle}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
            {origins.map(({ name, icon, description }) => (
              <div
                key={name}
                className="group bg-white rounded-2xl md:rounded-[1.5rem] p-5 md:p-8 luxury-shadow text-center space-y-3 md:space-y-4 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_18px_36px_-14px_rgba(39,25,8,0.3)]"
              >
                <div className="mx-auto flex h-14 w-14 md:h-16 md:w-16 items-center justify-center rounded-full bg-[#FAECD2] transition-colors duration-300 group-hover:bg-[#57392D]">
                  <span
                    aria-hidden="true"
                    className="material-symbols-outlined text-2xl md:text-3xl text-[#57392D] transition-colors duration-300 group-hover:text-white"
                  >
                    {icon}
                  </span>
                </div>
                <h3 className="font-[family-name:var(--font-plus-jakarta)] text-lg md:text-xl font-semibold text-black">{name}</h3>
                <p className="text-[#4A3026] text-xs md:text-sm leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Products */}
      <section className="py-12 md:py-20 px-5 md:px-16 max-w-[1280px] mx-auto">
        <h2 className="font-[family-name:var(--font-plus-jakarta)] text-2xl md:text-[32px] font-semibold text-black mb-8 md:mb-12">
          {dict.coffeePage.shopCoffee}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {coffeeProducts.map((p) => (
            <ProductCard
              key={p.id}
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
            />
          ))}
        </div>
      </section>
    </div>
  );
}
