import { getStoreCategories, getStoreProducts } from "@/lib/store/queries";
import { getLocale, getDict } from "@/lib/i18n";
import { CategoryProductRow } from "@/components/store/category-product-row";

export default async function StoreProductsByCategory() {
  const [locale, dict] = await Promise.all([getLocale(), getDict()]);
  const [categories, products] = await Promise.all([
    getStoreCategories(locale).catch(() => []),
    getStoreProducts(locale).catch(() => []),
  ]);

  if (categories.length === 0 || products.length === 0) return null;

  const categoriesWithProducts = categories
    .map((cat) => ({
      category: cat,
      items: products.filter((p) => p.categorySlug === cat.slug),
    }))
    .filter((group) => group.items.length > 0);

  if (categoriesWithProducts.length === 0) return null;

  return (
    <section className="py-10 md:py-16 px-5 md:px-16 max-w-[1280px] mx-auto">
      {categoriesWithProducts.map(({ category, items }) => (
        <CategoryProductRow
          key={category.slug}
          categoryName={category.name}
          products={items}
          addToCartLabel={dict.product.addToCart}
          addedLabel={dict.product.added}
          swipeHint={dict.home.bestSellers.swipeHint}
        />
      ))}
    </section>
  );
}
