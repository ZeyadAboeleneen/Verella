/**
 * Verella's category structure. Gender categories (for her / for him /
 * unisex) are how most shoppers start; the rest group by type. A product has
 * one primary category (store_products.category_id) and may appear in others
 * through store_product_categories.
 */
export interface CatalogCategory {
  slug: string;
  nameEn: string;
  nameAr: string;
  descEn: string;
  descAr: string;
  /** Product image folders for the category's colour card — the middle one sets the colour. */
  cover: [string, string, string] | [string, string];
}

export const CATALOG_CATEGORIES: CatalogCategory[] = [
  {
    slug: "women",
    nameEn: "For Her",
    nameAr: "لها",
    descEn: "Florals, fruits and soft musks — perfumes made to be worn by her.",
    descAr: "ورد وفواكه ومسك ناعم — عطور معمولة ليها.",
    cover: ["p11-pink-diamond-sakura", "p25-pink-queen", "p29-arrogate-pink-diva"],
  },
  {
    slug: "men",
    nameEn: "For Him",
    nameAr: "له",
    descEn: "Fresh, woody and bold — signatures with presence.",
    descAr: "منعشة وخشبية وجريئة — بصمة ليها حضور.",
    cover: ["p26-frankel-aventus-black-elixir", "p40-tyrant", "p27-boom-blue"],
  },
  {
    slug: "unisex",
    nameEn: "Unisex",
    nameAr: "للجنسين",
    descEn: "Scents that belong to whoever wears them.",
    descAr: "عطور بتاعة اللي يلبسها.",
    cover: ["p21-balas-rose", "p13-emerald-soul-diamond", "p22-fondue-lava-lush"],
  },
  {
    slug: "musk",
    nameEn: "Musk",
    nameAr: "المسك",
    descEn: "Clean, soft and close to the skin — the musk collection.",
    descAr: "نظيف وناعم وقريب من البشرة — مجموعة المسك.",
    cover: ["p02-abaq-pomegranate-musk", "p06-powder-musk", "p05-al-shams-musk"],
  },
  {
    slug: "oud-tobacco",
    nameEn: "Oud & Tobacco",
    nameAr: "العود والتبغ",
    descEn: "Warm, smoky and deep — for evenings that last.",
    descAr: "دافئ ومدخّن وعميق — لسهرات طويلة.",
    cover: ["p17-french-tobacco", "p10-black-diamond-incense", "p18-mexican-tobacco"],
  },
  {
    slug: "gift-sets",
    nameEn: "Gift Sets",
    nameAr: "أطقم الهدايا",
    descEn: "Collections and duos, boxed and ready to give.",
    descAr: "مجموعات وأطقم جاهزة للإهداء.",
    cover: ["p09-special-musk-duo", "p44-diamond-maroon-box", "p37-laverne-little-garden"],
  },
  {
    slug: "accessories",
    nameEn: "Beauty & Accessories",
    nameAr: "الجمال والإكسسوارات",
    descEn: "The finishing touches — sunglasses and body care.",
    descAr: "اللمسة الأخيرة — نظارات وعناية بالجسم.",
    cover: ["p30-flower-powder-bloom", "p24-assaf-sunglasses"],
  },
];
