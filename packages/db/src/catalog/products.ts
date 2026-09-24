/**
 * Verella's launch catalog — taken from "Verella products.docx" (names and
 * prices as supplied). Descriptions and note pyramids were written from each
 * fragrance's published notes (brand sites, Fragrantica, Parfumo); SOLO has
 * no published notes, so its copy describes the bottle and character only.
 *
 * Images live in apps/web/public/products/<slug>/: `styled.webp` (the cut-out
 * product on a Verella background, shown first) and the untouched original
 * supplier photo (shown second). `image` is the folder name of the source.
 *
 * notes: "top | heart | base", comma-separated within a tier.
 */
export type Gender = "women" | "men" | "unisex";

export interface CatalogVariant {
  label: string;
  price: string;
}

export interface CatalogProduct {
  slug: string;
  brand: string;
  nameEn: string;
  nameAr: string;
  /** Price in EGP when the product has no size options. */
  price: string;
  /** Size options (e.g. 75ml). A single entry still shows the size on the page. */
  variants?: CatalogVariant[];
  gender: Gender | null;
  /** Category slugs; the first is the primary category. */
  categories: string[];
  descEn: string;
  descAr: string;
  notesEn?: string;
  notesAr?: string;
  /** Image folder(s) under public/products — first is the main photo. */
  images: string[];
  isBestSeller?: boolean;
  isFeaturedHome?: boolean;
}

const IBRAQ = "Ibraq · Ibrahim Al Qurashi";
const ASSAF = "Assaf";
const LAVERNE = "Laverne";
const DUKHOON = "Dukhoon Al Emaratiya";
const ARABIYAT = "Arabiyat Prestige";

export const CATALOG_PRODUCTS: CatalogProduct[] = [
  // ── IBRAQ musk collection ────────────────────────────────────────────────
  {
    slug: "special-musk",
    brand: IBRAQ,
    nameEn: "Special Musk",
    nameAr: "المسك الخاص",
    price: "1450.00",
    variants: [{ label: "75ml", price: "1450.00" }],
    gender: "unisex",
    categories: ["unisex", "musk"],
    descEn:
      "IBRAQ's signature white musk: soft musk and amber warmed by birch flower, with velvety suede and lily at the heart and a rose-tonka finish. Clean, quiet and endlessly wearable — the scent of fresh skin that stays with you all day.",
    descAr:
      "المسك الأبيض الأشهر من إبراق: مسك ناعم وعنبر مع زهرة البتولا، وقلب من الشامواه والزنبق، وختام ورد وتونكا. ريحة نظافة هادية تتلبس كل يوم وتفضل معاك طول اليوم.",
    notesEn: "Musk, amber, birch flower | Suede, lily | Rose, tonka bean",
    notesAr: "مسك، عنبر، زهرة البتولا | شامواه، زنبق | ورد، تونكا",
    images: ["p01-special-musk"],
    isBestSeller: true,
    isFeaturedHome: true,
  },
  {
    slug: "abaq-pomegranate-musk",
    brand: IBRAQ,
    nameEn: "Abaq Pomegranate Musk",
    nameAr: "مسك عبق الرمان",
    price: "1450.00",
    variants: [{ label: "75ml", price: "1450.00" }],
    gender: "unisex",
    categories: ["unisex", "musk"],
    descEn:
      "Juicy pomegranate and blackcurrant sparkle over bergamot and crisp apple, softened by a touch of caramel before settling into white musk and amber. Bright, fruity and radiant — made for sunny days.",
    descAr:
      "رمان وكشمش أسود بيلمعوا على برغموت وتفاح، مع لمسة كراميل قبل ما يستقروا على مسك أبيض وعنبر. عطر فاكهي منعش ومشرق للأيام المشمسة.",
    notesEn: "Blackcurrant, bergamot, apple | Caramel, cedarwood, patchouli | Musk, pomegranate, amber",
    notesAr: "كشمش أسود، برغموت، تفاح | كراميل، خشب الأرز، باتشولي | مسك، رمان، عنبر",
    images: ["p02-abaq-pomegranate-musk"],
    isFeaturedHome: true,
  },
  {
    slug: "raspberry-musk",
    brand: IBRAQ,
    nameEn: "Raspberry Musk",
    nameAr: "مسك التوت",
    price: "1450.00",
    variants: [{ label: "75ml", price: "1450.00" }],
    gender: "unisex",
    categories: ["unisex", "musk"],
    descEn:
      "Fresh raspberry and powdery iris open onto a creamy heart of vanilla and red berries, resting on soft musk. Sweet, playful and elegant — a fruity musk for every day.",
    descAr:
      "توت فرامبوا منعش وسوسن بودري، وقلب كريمي من الفانيليا والتوت الأحمر على قاعدة مسك ناعم. مسك فاكهي حلو وشيك لكل يوم.",
    notesEn: "Raspberry, iris | Vanilla, red berries | Musk, fruity notes",
    notesAr: "توت فرامبوا، سوسن | فانيليا، توت أحمر | مسك، نفحات فاكهية",
    images: ["p03-raspberry-musk"],
  },
  {
    slug: "al-fajr-musk",
    brand: IBRAQ,
    nameEn: "Al Fajr Musk",
    nameAr: "مسك الفجر",
    price: "1450.00",
    variants: [{ label: "75ml", price: "1450.00" }],
    gender: "unisex",
    categories: ["unisex", "musk"],
    descEn:
      "\"Dawn Musk\" — the first light of morning in a bottle. Red berries and bergamot give way to jasmine, lily and ylang-ylang, then a sweet, airy meringue and musk base. Fresh, floral and quietly gourmand.",
    descAr:
      "مسك الفجر — أول نور الصبح في زجاجة. توت أحمر وبرغموت بيفتحوا على ياسمين وزنبق ويلانغ يلانغ، وبعدين قاعدة مرينغ ومسك خفيفة وحلوة.",
    notesEn: "Red berries, bergamot | Lily, ylang-ylang, jasmine | Musk, patchouli, meringue",
    notesAr: "توت أحمر، برغموت | زنبق، يلانغ يلانغ، ياسمين | مسك، باتشولي، مرينغ",
    images: ["p04-al-fajr-musk"],
  },
  {
    slug: "al-shams-musk",
    brand: IBRAQ,
    nameEn: "Al Shams Musk",
    nameAr: "مسك الشمس",
    price: "1450.00",
    variants: [{ label: "75ml", price: "1450.00" }],
    gender: "unisex",
    categories: ["unisex", "musk"],
    descEn:
      "\"Musk of the Sun\" — golden and luminous. Cinnamon, cardamom and orange blossom glow over vanilla and elemi, with sweet almond, ambroxan and guaiac wood keeping the musk warm on the skin.",
    descAr:
      "مسك الشمس — دهبي ومضيء. قرفة وهيل وزهر برتقال على فانيليا ولُبان إليمي، ولوز حلو وأمبروكسان وخشب غاياك بيخلّوا المسك دافي على البشرة.",
    notesEn: "Cinnamon, cardamom, orange blossom, bergamot | Bourbon, elemi, vanilla | Sweet almond, musk, ambroxan, guaiac wood",
    notesAr: "قرفة، هيل، زهر برتقال، برغموت | بوربون، إليمي، فانيليا | لوز حلو، مسك، أمبروكسان، خشب غاياك",
    images: ["p05-al-shams-musk"],
  },
  {
    slug: "powder-musk",
    brand: IBRAQ,
    nameEn: "Powder Musk",
    nameAr: "مسك البودر",
    price: "1450.00",
    variants: [{ label: "75ml", price: "1450.00" }],
    gender: "unisex",
    categories: ["unisex", "musk"],
    descEn:
      "Musk and soft powder in perfect harmony. Jasmine, ylang-ylang and rose drift over cedar, orris and amber, finishing in a cloud of vanilla, tonka and white musk — the feeling of freshly clean, cared-for skin.",
    descAr:
      "مسك وبودرة ناعمة في توازن كامل. ياسمين ويلانغ يلانغ وورد على أرز وسوسن وعنبر، وختام سحابة فانيليا وتونكا ومسك أبيض — إحساس بشرة نضيفة ومرتاحة.",
    notesEn: "Jasmine, ylang-ylang, rose | Cedarwood, orris, amber | Musk, vanilla, tonka bean, powder",
    notesAr: "ياسمين، يلانغ يلانغ، ورد | خشب الأرز، سوسن، عنبر | مسك، فانيليا، تونكا، بودرة",
    images: ["p06-powder-musk"],
    isBestSeller: true,
  },
  {
    slug: "abaq-pomegranate-musk-duo",
    brand: IBRAQ,
    nameEn: "Abaq Pomegranate Musk — Oil & Perfume Duo",
    nameAr: "مسك عبق الرمان — طقم زيت وعطر",
    price: "700.00",
    gender: "unisex",
    categories: ["gift-sets", "musk"],
    descEn:
      "Abaq Pomegranate Musk twice over: a travel-size eau de parfum spray and a concentrated perfume oil. Layer the oil under the spray for a richer, longer-lasting trail — or keep one in your bag.",
    descAr:
      "مسك عبق الرمان مرتين: عطر سبراي بحجم السفر وزيت عطري مركّز. حط الزيت تحت السبراي لأثر أغنى وثبات أطول — أو خلّي واحد في شنطتك.",
    images: ["p07-abaq-pomegranate-musk-duo"],
  },
  {
    slug: "powder-musk-duo",
    brand: IBRAQ,
    nameEn: "Powder Musk — Oil & Perfume Duo",
    nameAr: "مسك البودر — طقم زيت وعطر",
    price: "700.00",
    gender: "unisex",
    categories: ["gift-sets", "musk"],
    descEn:
      "The soft, powdery Powder Musk as a pair: a travel-size eau de parfum spray and a concentrated perfume oil. Apply the oil first, spray on top, and enjoy the clean-skin feeling for longer.",
    descAr:
      "مسك البودر الناعم في طقم: عطر سبراي بحجم السفر وزيت عطري مركّز. حط الزيت الأول ورش العطر فوقه، واستمتع بإحساس النضافة لوقت أطول.",
    images: ["p08-powder-musk-duo"],
  },
  {
    slug: "special-musk-duo",
    brand: IBRAQ,
    nameEn: "Special Musk — Oil & Perfume Duo",
    nameAr: "المسك الخاص — طقم زيت وعطر",
    price: "700.00",
    gender: "unisex",
    categories: ["gift-sets", "musk"],
    descEn:
      "IBRAQ's best-loved white musk in its gift box: a travel-size eau de parfum spray with a concentrated perfume oil. An easy, elegant present — or a treat to yourself.",
    descAr:
      "المسك الأبيض الأحب من إبراق في علبة هدية: عطر سبراي بحجم السفر مع زيت عطري مركّز. هدية سهلة وشيك — أو دلع لنفسك.",
    images: ["p09-special-musk-duo"],
  },

  // ── IBRAQ Diamond collection ─────────────────────────────────────────────
  {
    slug: "black-diamond-incense",
    brand: IBRAQ,
    nameEn: "Black Diamond Incense",
    nameAr: "بلاك دايموند إنسنس",
    price: "1950.00",
    variants: [{ label: "150ml", price: "1950.00" }],
    gender: "unisex",
    categories: ["unisex", "oud-tobacco"],
    descEn:
      "Smoke and shadow, cut like a black diamond. Blackcurrant and a cool aquatic breeze lead into incense, vanilla and sandalwood, over a dark base of leather, oud and amber. Mysterious and magnetic.",
    descAr:
      "دخان وظل متقطّع زي الألماس الأسود. كشمش أسود ونسمة مائية بيفتحوا على بخور وفانيليا وصندل، فوق قاعدة غامقة من الجلد والعود والعنبر. غامض وجذّاب.",
    notesEn: "Blackcurrant, aquatic notes, birch | Incense, vanilla, sandalwood | Leather, oud, smoke, amber",
    notesAr: "كشمش أسود، نفحات مائية، بتولا | بخور، فانيليا، صندل | جلد، عود، دخان، عنبر",
    images: ["p10-black-diamond-incense"],
  },
  {
    slug: "pink-diamond-sakura",
    brand: IBRAQ,
    nameEn: "Pink Diamond Sakura",
    nameAr: "بينك دايموند ساكورا",
    price: "1950.00",
    variants: [{ label: "150ml", price: "1950.00" }],
    gender: "women",
    categories: ["women"],
    descEn:
      "Cherry blossoms in full bloom. Peony, orange blossom and mandarin open onto lily, rose and sakura, then settle into white musk, amber and sandalwood. Delicate, romantic and luminous.",
    descAr:
      "زهر الكرز في عز تفتّحه. فاوانيا وزهر برتقال ويوسفي بيفتحوا على زنبق وورد وساكورا، ويستقروا على مسك أبيض وعنبر وصندل. رقيق ورومانسي ومشرق.",
    notesEn: "Peony, orange blossom, mandarin | Lily, rose, cherry blossom | White musk, amber, sandalwood",
    notesAr: "فاوانيا، زهر برتقال، يوسفي | زنبق، ورد، زهر الكرز | مسك أبيض، عنبر، صندل",
    images: ["p11-pink-diamond-sakura"],
    isFeaturedHome: true,
  },
  {
    slug: "nude-coral-diamond",
    brand: IBRAQ,
    nameEn: "Nude Coral Diamond",
    nameAr: "نود كورال دايموند",
    price: "1950.00",
    variants: [{ label: "150ml", price: "1950.00" }],
    gender: "unisex",
    categories: ["unisex"],
    descEn:
      "Warm, sun-kissed skin. Saffron, apple and bergamot glow over orange blossom, creamy coconut and guaiac wood, melting into vanilla, amber and cashmeran. Soft, solar and addictive.",
    descAr:
      "بشرة دافية لمستها الشمس. زعفران وتفاح وبرغموت على زهر برتقال وجوز هند كريمي وخشب غاياك، بيدوبوا في فانيليا وعنبر وكاشميران. ناعم ومشمس ويشد.",
    notesEn: "Saffron, apple, bergamot | Orange blossom, coconut, guaiac wood | Vanilla, amber, cashmeran",
    notesAr: "زعفران، تفاح، برغموت | زهر برتقال، جوز هند، خشب غاياك | فانيليا، عنبر، كاشميران",
    images: ["p12-nude-coral-diamond"],
  },
  {
    slug: "emerald-soul-diamond",
    brand: IBRAQ,
    nameEn: "Emerald Soul Diamond",
    nameAr: "إميرالد سول دايموند",
    price: "1950.00",
    variants: [{ label: "150ml", price: "1950.00" }],
    gender: "unisex",
    categories: ["unisex"],
    descEn:
      "Green, bright and full of life. Bergamot and mandarin sparkle with white musk, a heart of fresh spices and lemon keeps it lively, and vanilla with amber gives it a smooth, lasting glow.",
    descAr:
      "أخضر ومشرق ومليان حياة. برغموت ويوسفي بيلمعوا مع مسك أبيض، وقلب من التوابل المنعشة والليمون، وفانيليا وعنبر بيدّوله لمعة ناعمة وثبات.",
    notesEn: "White musk, bergamot, mandarin | Spices, lemon | Vanilla, amber",
    notesAr: "مسك أبيض، برغموت، يوسفي | توابل، ليمون | فانيليا، عنبر",
    images: ["p13-emerald-soul-diamond"],
  },
  {
    slug: "white-regent-diamond",
    brand: IBRAQ,
    nameEn: "White Regent Diamond",
    nameAr: "وايت ريجنت دايموند",
    price: "1950.00",
    variants: [{ label: "150ml", price: "1950.00" }],
    gender: "unisex",
    categories: ["unisex"],
    descEn:
      "Refined and serene. Sandalwood, tea, fig and cardamom create a creamy, airy opening; iris and vetiver add polish; tonka, vanilla and patchouli close it softly. Elegant enough for every occasion.",
    descAr:
      "راقي وهادي. صندل وشاي وتين وهيل بيعملوا افتتاحية كريمية خفيفة، وسوسن ونجيل بيدّوه لمعة، وتونكا وفانيليا وباتشولي بيقفلوه بنعومة. شيك لكل مناسبة.",
    notesEn: "Sandalwood, tea, fig, cardamom | Iris, vetiver | Tonka bean, vanilla, patchouli",
    notesAr: "صندل، شاي، تين، هيل | سوسن، نجيل | تونكا، فانيليا، باتشولي",
    images: ["p14-white-regent-diamond"],
  },
  {
    slug: "purple-heart-diamond",
    brand: IBRAQ,
    nameEn: "Purple Heart Diamond",
    nameAr: "بيربل هارت دايموند",
    price: "1950.00",
    variants: [{ label: "150ml", price: "1950.00" }],
    gender: "unisex",
    categories: ["unisex"],
    descEn:
      "A sweet heart with a spark of spice. Vanilla, juicy pear and orange blossom meet pink pepper, almond and jasmine, grounded by cashmere wood, patchouli and cedar. Cosy and captivating.",
    descAr:
      "قلب حلو بلمسة توابل. فانيليا وكمثرى وزهر برتقال بيقابلوا فلفل وردي ولوز وياسمين، على قاعدة خشب الكشمير والباتشولي والأرز. دافي وآسر.",
    notesEn: "Vanilla, pear, orange blossom | Pink pepper, almond, jasmine | Cashmere wood, patchouli, cedarwood",
    notesAr: "فانيليا، كمثرى، زهر برتقال | فلفل وردي، لوز، ياسمين | خشب الكشمير، باتشولي، أرز",
    images: ["p15-purple-heart-diamond"],
  },

  // ── IBRAQ Tobacco collection (extrait de parfum) ────────────────────────
  {
    slug: "brazilian-tobacco",
    brand: IBRAQ,
    nameEn: "Brazilian Tobacco",
    nameAr: "التبغ البرازيلي",
    price: "1950.00",
    variants: [{ label: "100ml", price: "1950.00" }],
    gender: "unisex",
    categories: ["unisex", "oud-tobacco"],
    descEn:
      "An extrait with heat. Bergamot, pink pepper, red chilli and lavender open onto tobacco, oud, cedar and dark cherry, finishing on leather, patchouli and vetiver. Bold, spicy and unforgettable.",
    descAr:
      "إكستريه فيه حرارة. برغموت وفلفل وردي وشطة حمرا ولافندر بيفتحوا على تبغ وعود وأرز وكرز غامق، وختام جلد وباتشولي ونجيل. جريء وحار وما يتنسيش.",
    notesEn: "Bergamot, pink pepper, red chilli, lavender | Tobacco, oud, cedarwood, cherry | Leather, patchouli, vetiver",
    notesAr: "برغموت، فلفل وردي، شطة حمرا، لافندر | تبغ، عود، أرز، كرز | جلد، باتشولي، نجيل",
    images: ["p16-brazilian-tobacco"],
    isFeaturedHome: true,
  },
  {
    slug: "french-tobacco",
    brand: IBRAQ,
    nameEn: "French Tobacco",
    nameAr: "التبغ الفرنسي",
    price: "1950.00",
    variants: [{ label: "100ml", price: "1950.00" }],
    gender: "unisex",
    categories: ["unisex", "oud-tobacco"],
    descEn:
      "Tobacco with Parisian polish. Mandarin, blood orange and green apple brighten a heart of ginger, neroli, cinnamon and tobacco, with frankincense, guaiac wood and iris for a smooth, elegant finish.",
    descAr:
      "تبغ بلمسة باريسية. يوسفي وبرتقال دموي وتفاح أخضر بينوّروا قلب من الزنجبيل والنيرولي والقرفة والتبغ، ولُبان وخشب غاياك وسوسن لختام ناعم وأنيق.",
    notesEn: "Mandarin, blood orange, green apple | Ginger, neroli, cinnamon, tobacco | Lemongrass, frankincense, guaiac wood, iris",
    notesAr: "يوسفي، برتقال دموي، تفاح أخضر | زنجبيل، نيرولي، قرفة، تبغ | ليمون عشبي، لُبان، خشب غاياك، سوسن",
    images: ["p17-french-tobacco"],
  },
  {
    slug: "mexican-tobacco",
    brand: IBRAQ,
    nameEn: "Mexican Tobacco",
    nameAr: "التبغ المكسيكي",
    price: "1950.00",
    variants: [{ label: "100ml", price: "1950.00" }],
    gender: "unisex",
    categories: ["unisex", "oud-tobacco"],
    descEn:
      "Dark chocolate and cedar set a rich, gourmand tone; lilac and cinnamon add warmth; tobacco, amber and rose bring it home. Sweet, spicy and deeply comforting.",
    descAr:
      "شوكولاتة غامقة وأرز بيبدأوا بنبرة غنية، وليلك وقرفة بيضيفوا دفا، وتبغ وعنبر وورد بيقفلوه. حلو وحار ومريح جدًا.",
    notesEn: "Dark chocolate, cedarwood | Lilac, cinnamon | Tobacco, amber, rose",
    notesAr: "شوكولاتة غامقة، أرز | ليلك، قرفة | تبغ، عنبر، ورد",
    images: ["p18-mexican-tobacco"],
  },
  {
    slug: "spanish-tobacco",
    brand: IBRAQ,
    nameEn: "Spanish Tobacco",
    nameAr: "التبغ الإسباني",
    price: "1950.00",
    variants: [{ label: "100ml", price: "1950.00" }],
    gender: "unisex",
    categories: ["unisex", "oud-tobacco"],
    descEn:
      "Saffron and tonka with a cool aquatic twist lead into a heart of cocoa, amber and tobacco, resting on iris and warm woods. Smooth, oriental and effortlessly refined.",
    descAr:
      "زعفران وتونكا بلمسة مائية منعشة بيفتحوا على قلب من الكاكاو والعنبر والتبغ، على قاعدة سوسن وأخشاب دافية. شرقي ناعم وراقي من غير مجهود.",
    notesEn: "Aquatic notes, tonka bean, saffron | Cocoa, amber, tobacco | Iris, woody notes",
    notesAr: "نفحات مائية، تونكا، زعفران | كاكاو، عنبر، تبغ | سوسن، أخشاب",
    images: ["p19-spanish-tobacco"],
  },
  {
    slug: "greek-tobacco",
    brand: IBRAQ,
    nameEn: "Greek Tobacco",
    nameAr: "التبغ اليوناني",
    price: "1950.00",
    variants: [{ label: "100ml", price: "1950.00" }],
    gender: "unisex",
    categories: ["unisex", "oud-tobacco"],
    descEn:
      "The lightest of the tobaccos. Lychee, narcissus and rose open onto apricot, orange blossom and iris, with peony, musk and a soft veil of tobacco. Floral, fruity and sunny.",
    descAr:
      "أخف عطور التبغ. ليتشي ونرجس وورد بيفتحوا على مشمش وزهر برتقال وسوسن، مع فاوانيا ومسك وطبقة تبغ خفيفة. زهري وفاكهي ومشمس.",
    notesEn: "Lychee, narcissus, rose | Apricot, orange blossom, iris | Peony, musk, tobacco",
    notesAr: "ليتشي، نرجس، ورد | مشمش، زهر برتقال، سوسن | فاوانيا، مسك، تبغ",
    images: ["p20-greek-tobacco"],
  },
  {
    slug: "balas-rose",
    brand: IBRAQ,
    nameEn: "Balas Rose",
    nameAr: "بالاس روز",
    price: "1950.00",
    variants: [{ label: "150ml", price: "1950.00" }],
    gender: "unisex",
    categories: ["unisex"],
    descEn:
      "A royal rose, ruby-red. Rose, saffron and raspberry open richly, suede, jasmine and vanilla soften the heart, and cedar, musk and birch give it a regal, woody finish. Warm, elegant and full of character.",
    descAr:
      "وردة ملكية بلون الياقوت. ورد وزعفران وتوت بيفتحوا بغنى، وشامواه وياسمين وفانيليا بينعّموا القلب، وأرز ومسك وبتولا بيقفلوه بلمسة خشبية ملكية.",
    notesEn: "Rose, saffron, raspberry | Suede, jasmine, vanilla | Cedarwood, musk, birch",
    notesAr: "ورد، زعفران، توت | شامواه، ياسمين، فانيليا | أرز، مسك، بتولا",
    images: ["p21-balas-rose"],
    isBestSeller: true,
  },
  {
    slug: "fondue-lava-lush",
    brand: ARABIYAT,
    nameEn: "Fondue — Lava Lush",
    nameAr: "فوندو — لافا لاش",
    price: "1950.00",
    variants: [{ label: "100ml", price: "1950.00" }],
    gender: "unisex",
    categories: ["unisex"],
    descEn:
      "Creamy and cosy with a sea breeze. A marine accord meets milky softness, then melts into coconut and sugar over a warm vanilla-amber base. Fresh and gourmand at the same time.",
    descAr:
      "كريمي ودافي بنسمة بحر. نفحة بحرية بتقابل نعومة الحليب، وبعدين بتدوب في جوز هند وسكر فوق قاعدة فانيليا وعنبر دافية. منعش وحلو في نفس الوقت.",
    notesEn: "Marine notes, milk | Coconut, sugar | Amber, vanilla",
    notesAr: "نفحات بحرية، حليب | جوز هند، سكر | عنبر، فانيليا",
    images: ["p22-fondue-lava-lush"],
  },

  // ── ASSAF ───────────────────────────────────────────────────────────────
  {
    slug: "assaf-sunglasses-aura-set",
    brand: ASSAF,
    nameEn: "Assaf Sunglasses & Aura Set",
    nameAr: "طقم نظارة عساف وعطر أورا",
    price: "3500.00",
    gender: "unisex",
    categories: ["gift-sets", "accessories"],
    descEn:
      "Assaf's statement pairing: the octagonal sunglasses with blue-tinted UV lenses and the Aura eau de parfum — citrus, spice and airy woods in the sculpted Pegasus bottle. A complete look, ready to gift.",
    descAr:
      "ثنائي عساف المميز: النظارة الثمانية بعدسات زرقا واقية من الأشعة، وعطر أورا — حمضيات وتوابل وأخشاب خفيفة في زجاجة بيغاسوس المنحوتة. لوك كامل جاهز للإهداء.",
    images: ["p23-assaf-sunglasses-aura-set"],
  },
  {
    slug: "assaf-sunglasses",
    brand: ASSAF,
    nameEn: "Assaf Sunglasses",
    nameAr: "نظارة عساف الشمسية",
    price: "1800.00",
    gender: "unisex",
    categories: ["accessories", "unisex"],
    descEn:
      "Octagonal metal-frame sunglasses with blue-tinted, UV-protective lenses and a slim double bridge. Light, sharp and made to stand out.",
    descAr:
      "نظارة شمسية بإطار معدني ثماني الشكل وعدسات زرقا واقية من الأشعة فوق البنفسجية وجسر مزدوج رفيع. خفيفة وحادة ومعمولة عشان تلفت النظر.",
    images: ["p24-assaf-sunglasses"],
  },
  {
    slug: "pink-queen",
    brand: ASSAF,
    nameEn: "Pink Queen",
    nameAr: "بينك كوين",
    price: "2050.00",
    gender: "women",
    categories: ["women"],
    descEn:
      "Sweet, confident femininity. Bergamot and rose open brightly, caramel and peony make the heart irresistible, and vanilla with musk leaves a soft, lingering trail. Crowned by its blush-pink latticed cap.",
    descAr:
      "أنوثة حلوة وواثقة. برغموت وورد بيفتحوا بإشراق، وكراميل وفاوانيا بيخلّوا القلب ما يتقاومش، وفانيليا ومسك بيسيبوا أثر ناعم. متوّج بغطا وردي مشبّك.",
    notesEn: "Bergamot, rose | Caramel, peony | Vanilla, musk",
    notesAr: "برغموت، ورد | كراميل، فاوانيا | فانيليا، مسك",
    images: ["p25-pink-queen"],
  },
  {
    slug: "frankel-aventus-black-elixir",
    brand: ASSAF,
    nameEn: "Frankel Aventus Black Elixir",
    nameAr: "فرانكل أفينتوس بلاك إليكسير",
    price: "2250.00",
    variants: [{ label: "200ml", price: "2250.00" }],
    gender: "men",
    categories: ["men"],
    descEn:
      "Fresh meets dark. Lemon and iris open cleanly, vetiver, violet and basil add a green, powdery edge, and cedar, vanilla, amber and musk give it a smooth, masculine depth.",
    descAr:
      "انتعاش مع غموض. ليمون وسوسن بيفتحوا بنضافة، ونجيل وبنفسج وريحان بيضيفوا لمسة خضرا بودرية، وأرز وفانيليا وعنبر ومسك بيدّوه عمق رجالي ناعم.",
    notesEn: "Lemon, iris | Vetiver, violet, basil | Cedarwood, vanilla, amber, musk",
    notesAr: "ليمون، سوسن | نجيل، بنفسج، ريحان | أرز، فانيليا، عنبر، مسك",
    images: ["p26-frankel-aventus-black-elixir"],
    isBestSeller: true,
  },
  {
    slug: "boom-blue",
    brand: ASSAF,
    nameEn: "Boom Blue",
    nameAr: "بوم بلو",
    price: "2250.00",
    variants: [{ label: "200ml", price: "2250.00" }],
    gender: "men",
    categories: ["men"],
    descEn:
      "Crisp and energetic. Apple, pear and a hint of cumin open fruity-spicy, orange blossom, patchouli and labdanum build the heart, and vetiver, amber and sandalwood keep it warm and woody.",
    descAr:
      "منعش ومليان طاقة. تفاح وكمثرى ولمسة كمون بيفتحوا فاكهي حار، وزهر برتقال وباتشولي ولابدانوم بيبنوا القلب، ونجيل وعنبر وصندل بيخلّوه دافي وخشبي.",
    notesEn: "Apple, pear, cumin | Orange blossom, patchouli, labdanum | Vetiver, amber, sandalwood",
    notesAr: "تفاح، كمثرى، كمون | زهر برتقال، باتشولي، لابدانوم | نجيل، عنبر، صندل",
    images: ["p27-boom-blue"],
  },
  {
    slug: "ibraq-mini-musk-set",
    brand: IBRAQ,
    nameEn: "Mini Musk Collection",
    nameAr: "مجموعة المسك الميني",
    price: "1850.00",
    gender: "unisex",
    categories: ["gift-sets", "musk"],
    descEn:
      "Six of IBRAQ's musks in mini bottles, boxed together — from clean white musk to fruity pomegranate and raspberry. The perfect way to discover your musk, or to gift the whole collection.",
    descAr:
      "ست أنواع من مسك إبراق في زجاجات ميني في علبة واحدة — من المسك الأبيض النضيف لحد الرمان والتوت. أحلى طريقة تكتشف بيها مسكك، أو تهادي بالمجموعة كلها.",
    images: ["p28-ibraq-mini-musk-set"],
  },
  {
    slug: "arrogate-pink-diva",
    brand: ASSAF,
    nameEn: "Arrogate Pink Diva",
    nameAr: "أروجيت بينك ديفا",
    price: "2450.00",
    variants: [{ label: "200ml", price: "2450.00" }],
    gender: "women",
    categories: ["women"],
    descEn:
      "Radiant and fruity-floral. Orange, raspberry and peach burst open, rose, iris and gardenia bloom in the heart, and sandalwood, musk and patchouli keep it glowing. A true diva's signature.",
    descAr:
      "مشرق وفاكهي زهري. برتقال وتوت وخوخ بيفتحوا بحيوية، وورد وسوسن وغاردينيا بيتفتحوا في القلب، وصندل ومسك وباتشولي بيخلّوه يلمع. بصمة ديفا بجد.",
    notesEn: "Orange, raspberry, peach | Rose, iris, gardenia | Sandalwood, musk, patchouli",
    notesAr: "برتقال، توت، خوخ | ورد، سوسن، غاردينيا | صندل، مسك، باتشولي",
    images: ["p29-arrogate-pink-diva"],
  },
  {
    slug: "flower-powder-bloom",
    brand: ASSAF,
    nameEn: "Flower Powder Bloom",
    nameAr: "فلاور باودر بلوم",
    price: "800.00",
    gender: "women",
    categories: ["accessories", "women"],
    descEn:
      "A perfumed body powder with a fruity-floral scent of jasmine, cherry and ylang-ylang, made with 90% natural ingredients. Its compact, wave-shaped case — inspired by desert sands — has a mirror inside for touch-ups on the go.",
    descAr:
      "بودرة معطّرة للجسم بريحة زهرية فاكهية من الياسمين والكرز واليلانغ يلانغ، بتركيبة 90% مكونات طبيعية. علبتها المدمجة على شكل موجة مستوحاة من رمال الصحرا، وجواها مراية للتظبيط في أي وقت.",
    notesEn: "Jasmine, cherry, ylang-ylang",
    notesAr: "ياسمين، كرز، يلانغ يلانغ",
    images: ["p30-flower-powder-bloom"],
  },
  {
    slug: "glitch",
    brand: ASSAF,
    nameEn: "Glitch",
    nameAr: "جليتش",
    price: "2650.00",
    gender: "unisex",
    categories: ["unisex"],
    descEn:
      "From Assaf's Arrogate collection. Raspberry and grapefruit crackle with energy, vetiver and orange blossom add a fresh floral pulse, and ambroxan with vanilla leaves a smooth, magnetic trail.",
    descAr:
      "من مجموعة أروجيت من عساف. توت وجريب فروت مليانين طاقة، ونجيل وزهر برتقال بيضيفوا نبضة زهرية منعشة، وأمبروكسان وفانيليا بيسيبوا أثر ناعم وجذّاب.",
    notesEn: "Raspberry, grapefruit | Vetiver, orange blossom | Ambroxan, vanilla",
    notesAr: "توت، جريب فروت | نجيل، زهر برتقال | أمبروكسان، فانيليا",
    images: ["p31-glitch"],
    isFeaturedHome: true,
  },
  {
    slug: "arrogate-pink",
    brand: ASSAF,
    nameEn: "Arrogate Pink",
    nameAr: "أروجيت بينك",
    price: "2350.00",
    variants: [{ label: "200ml", price: "2350.00" }],
    gender: "women",
    categories: ["women"],
    descEn:
      "Soft pink luxury. Orange blossom, neroli and almond open delicately, violet, jasmine and apricot form a luminous heart, and musk with sandalwood makes it last. Graceful and feminine.",
    descAr:
      "فخامة وردي ناعمة. زهر برتقال ونيرولي ولوز بيفتحوا برقة، وبنفسج وياسمين ومشمش بيعملوا قلب مضيء، ومسك وصندل بيثبّتوه. أنثوي ورقيق.",
    notesEn: "Orange blossom, neroli, almond | Violet, jasmine, apricot | Musk, jasmine, sandalwood",
    notesAr: "زهر برتقال، نيرولي، لوز | بنفسج، ياسمين، مشمش | مسك، ياسمين، صندل",
    images: ["p32-arrogate-pink"],
    isFeaturedHome: true,
  },
  {
    slug: "miss-gris",
    brand: ASSAF,
    nameEn: "Miss Gris",
    nameAr: "ميس جريس",
    price: "2350.00",
    gender: "women",
    categories: ["women"],
    descEn:
      "Quiet elegance in powder pink. Pear, saffron and bergamot open softly, rose, jasmine and white tea bloom at the heart, and vanilla, sandalwood, frankincense and grey amber give it a warm, graceful finish.",
    descAr:
      "أناقة هادية بلون وردي بودري. كمثرى وزعفران وبرغموت بيفتحوا بنعومة، وورد وياسمين وشاي أبيض في القلب، وفانيليا وصندل ولُبان وعنبر رمادي لختام دافي ورقيق.",
    notesEn: "Pear, saffron, bergamot | Rose, jasmine, white tea | Vanilla, sandalwood, frankincense, grey amber",
    notesAr: "كمثرى، زعفران، برغموت | ورد، ياسمين، شاي أبيض | فانيليا، صندل، لُبان، عنبر رمادي",
    images: ["p33-miss-gris"],
  },
  {
    slug: "risk-comete",
    brand: ASSAF,
    nameEn: "Risk Comète",
    nameAr: "ريسك كوميت",
    price: "2350.00",
    gender: "unisex",
    categories: ["unisex"],
    descEn:
      "From the Arrogate collection: juicy pear and roasted nuts, a creamy heart of rose, lily of the valley and coconut, and a smooth sandalwood-musk base. Sweet, bright and daring.",
    descAr:
      "من مجموعة أروجيت: كمثرى ومكسرات محمصة، وقلب كريمي من الورد وزنبق الوادي وجوز الهند، وقاعدة صندل ومسك ناعمة. حلو ومشرق وجريء.",
    notesEn: "Pear, nuts | Rose, lily of the valley, coconut | Sandalwood, musk",
    notesAr: "كمثرى، مكسرات | ورد، زنبق الوادي، جوز هند | صندل، مسك",
    images: ["p34-risk-comete"],
  },
  {
    slug: "aura-assaf",
    brand: ASSAF,
    nameEn: "Aura",
    nameAr: "أورا",
    price: "2150.00",
    gender: "unisex",
    categories: ["unisex"],
    descEn:
      "From Assaf's Pegasus collection, in its frosted winged-horse bottle. Lemon, bergamot, elemi, pepper, thyme and cardamom open fresh and aromatic, over vetiver, cedar and amberwood, with patchouli, musk and ambergris beneath.",
    descAr:
      "من مجموعة بيغاسوس من عساف، في زجاجة الحصان المجنّح المطفية. ليمون وبرغموت وإليمي وفلفل وزعتر وهيل بيفتحوا منعش وعطري، على نجيل وأرز وخشب العنبر، وتحتهم باتشولي ومسك وعنبر.",
    notesEn: "Lemon, bergamot, elemi, pepper, thyme, cardamom | Vetiver, cedarwood, amberwood | Patchouli, musk, ambergris",
    notesAr: "ليمون، برغموت، إليمي، فلفل، زعتر، هيل | نجيل، أرز، خشب العنبر | باتشولي، مسك، عنبر",
    images: ["p35-aura-assaf"],
  },

  // ── LAVERNE ─────────────────────────────────────────────────────────────
  {
    slug: "musk-garden",
    brand: LAVERNE,
    nameEn: "Musk Garden",
    nameAr: "مسك جاردن",
    price: "1950.00",
    variants: [
      { label: "100ml", price: "1950.00" },
      { label: "200ml", price: "2300.00" },
    ],
    gender: "unisex",
    categories: ["unisex", "musk"],
    descEn:
      "A garden after the rain. Rhubarb, blackberry, apple and peach open crisp and juicy, musk, lily of the valley, violet and rose bloom at the heart, and musk, vanilla and sandalwood keep it soft all day. By perfumer Nathalie Lorson.",
    descAr:
      "جنينة بعد المطر. راوند وتوت أسود وتفاح وخوخ بيفتحوا منعشين، ومسك وزنبق الوادي وبنفسج وورد في القلب، ومسك وفانيليا وصندل بيخلّوه ناعم طول اليوم. من ابتكار ناتالي لورسون.",
    notesEn: "Rhubarb, blackberry, apple, peach | Musk, lily of the valley, violet, rose | Musk, vanilla, sandalwood",
    notesAr: "راوند، توت أسود، تفاح، خوخ | مسك، زنبق الوادي، بنفسج، ورد | مسك، فانيليا، صندل",
    images: ["p36-musk-garden", "p41-musk-garden-100ml"],
    isBestSeller: true,
    isFeaturedHome: true,
  },
  {
    slug: "laverne-little-garden",
    brand: LAVERNE,
    nameEn: "The Little Garden Set",
    nameAr: "طقم ذا ليتل جاردن",
    price: "1950.00",
    gender: null,
    categories: ["gift-sets"],
    descEn:
      "Laverne's discovery set: five of the house's fragrances in mini bottles, gathered in an illustrated gift box. Try them all, find your favourite, or give the whole garden.",
    descAr:
      "طقم الاكتشاف من لافيرن: خمس عطور من الدار في زجاجات ميني، في علبة هدية مرسومة. جرّبهم كلهم، لاقي المفضل عندك، أو هادي بالجنينة كلها.",
    images: ["p37-laverne-little-garden"],
  },
  {
    slug: "bella",
    brand: LAVERNE,
    nameEn: "Bella",
    nameAr: "بيلا",
    price: "2300.00",
    variants: [{ label: "200ml", price: "2300.00" }],
    gender: "women",
    categories: ["women"],
    descEn:
      "Sweet, bright and poetic. Mandarin, peach, bergamot, pear and pink pepper sparkle, tuberose, orange blossom and rose bloom richly, and patchouli, musk, sandalwood and vanilla add warmth. By Nathalie Lorson.",
    descAr:
      "حلو ومشرق وشاعري. يوسفي وخوخ وبرغموت وكمثرى وفلفل وردي بيلمعوا، ومسك الروم وزهر برتقال وورد بيتفتحوا بغنى، وباتشولي ومسك وصندل وفانيليا بيضيفوا دفا. من ناتالي لورسون.",
    notesEn: "Mandarin, peach, bergamot, pear, pink pepper | Tuberose, orange blossom, rose | Patchouli, musk, sandalwood, vanilla",
    notesAr: "يوسفي، خوخ، برغموت، كمثرى، فلفل وردي | مسك الروم، زهر برتقال، ورد | باتشولي، مسك، صندل، فانيليا",
    images: ["p38-bella"],
  },
  {
    slug: "dare-7am",
    brand: LAVERNE,
    nameEn: "Dare 7AM",
    nameAr: "دير 7 صباحًا",
    price: "1600.00",
    gender: "women",
    categories: ["women"],
    descEn:
      "Made for early mornings. Peach, apple, bergamot and lemon wake you up, jasmine, orange blossom and rose keep it soft, and musk, Australian sandalwood, cedar and amber carry it through the day.",
    descAr:
      "معمول للصبح بدري. خوخ وتفاح وبرغموت وليمون بيصحّوك، وياسمين وزهر برتقال وورد بيخلّوه ناعم، ومسك وصندل أسترالي وأرز وعنبر بيكمّلوا معاك اليوم.",
    notesEn: "Peach, apple, bergamot, lemon | Jasmine, orange blossom, rose | Musk, sandalwood, cedarwood, amber",
    notesAr: "خوخ، تفاح، برغموت، ليمون | ياسمين، زهر برتقال، ورد | مسك، صندل، أرز، عنبر",
    images: ["p39-dare-7am"],
  },
  {
    slug: "tyrant",
    brand: LAVERNE,
    nameEn: "Tyrant",
    nameAr: "تايرنت",
    price: "2300.00",
    variants: [{ label: "200ml", price: "2300.00" }],
    gender: "men",
    categories: ["men"],
    descEn:
      "Commanding and aromatic. Bergamot, lavender and cypress open crisp and fresh, jasmine and sandalwood smooth the heart, and amber, vetiver and vanilla leave a warm, woody presence that lasts.",
    descAr:
      "قوي وعطري. برغموت ولافندر وسرو بيفتحوا منعشين، وياسمين وصندل بينعّموا القلب، وعنبر ونجيل وفانيليا بيسيبوا حضور خشبي دافي بيطوّل.",
    notesEn: "Bergamot, lavender, cypress | Jasmine, sandalwood | Amber, vetiver, vanilla",
    notesAr: "برغموت، لافندر، سرو | ياسمين، صندل | عنبر، نجيل، فانيليا",
    images: ["p40-tyrant"],
  },

  // ── Gift sets ───────────────────────────────────────────────────────────
  {
    slug: "diamond-grey-box",
    brand: IBRAQ,
    nameEn: "Diamond Collection — Grey Box",
    nameAr: "مجموعة دايموند — العلبة الرمادي",
    price: "3100.00",
    gender: "unisex",
    categories: ["gift-sets"],
    descEn:
      "Three Diamond fragrances in a grey presentation box: Emerald Soul (green citrus), Nude Coral (warm, solar coconut) and White Regent (creamy tea, fig and iris). A luxurious, ready-to-give trio.",
    descAr:
      "تلات عطور من مجموعة دايموند في علبة رمادي: إميرالد سول (حمضيات خضرا)، ونود كورال (جوز هند دافي ومشمس)، ووايت ريجنت (شاي وتين وسوسن كريمي). ثلاثي فاخر جاهز للإهداء.",
    images: ["p42-diamond-grey-box"],
  },
  {
    slug: "diamond-blue-box",
    brand: IBRAQ,
    nameEn: "Diamond Collection — Blue Box",
    nameAr: "مجموعة دايموند — العلبة الزرقا",
    price: "3100.00",
    gender: "unisex",
    categories: ["gift-sets"],
    descEn:
      "Three Diamond fragrances in a royal-blue presentation box, including the smoky Black Diamond Incense — a trio that moves from crisp and marine to deep, oriental incense.",
    descAr:
      "تلات عطور من مجموعة دايموند في علبة زرقا ملكية، منهم بلاك دايموند إنسنس المدخّن — ثلاثي بيتنقّل من المنعش والبحري لحد البخور الشرقي العميق.",
    images: ["p43-diamond-blue-box"],
  },
  {
    slug: "diamond-maroon-box",
    brand: IBRAQ,
    nameEn: "Diamond Collection — Maroon Box",
    nameAr: "مجموعة دايموند — العلبة العنابي",
    price: "3100.00",
    gender: "unisex",
    categories: ["gift-sets"],
    descEn:
      "Three jewel-toned Diamond fragrances in a regal maroon box: Balas Rose, Pink Diamond Sakura and Purple Heart Diamond — rose, cherry blossom and sweet spice, together.",
    descAr:
      "تلات عطور دايموند بألوان الجواهر في علبة عنابي ملكية: بالاس روز، وبينك دايموند ساكورا، وبيربل هارت دايموند — ورد وزهر كرز وتوابل حلوة مع بعض.",
    images: ["p44-diamond-maroon-box"],
    isFeaturedHome: true,
  },
  {
    slug: "tobacco-collection",
    brand: IBRAQ,
    nameEn: "Tobacco Collection",
    nameAr: "مجموعة التبغ",
    price: "3150.00",
    gender: "unisex",
    categories: ["gift-sets", "oud-tobacco"],
    descEn:
      "A world tour of tobacco: nine IBRAQ extraits in mini bottles, laid out in a map-lined box — Brazilian, French, Mexican, Spanish, Greek and more. The ultimate gift for tobacco lovers.",
    descAr:
      "رحلة حول العالم في التبغ: تسع إكستريهات من إبراق في زجاجات ميني، في علبة مبطّنة بخريطة — برازيلي وفرنسي ومكسيكي وإسباني ويوناني وغيرهم. أحسن هدية لعشاق التبغ.",
    images: ["p45-tobacco-collection"],
  },
  {
    slug: "mini-summer-collection",
    brand: IBRAQ,
    nameEn: "Mini Summer Collection",
    nameAr: "مجموعة الصيف الميني",
    price: "1550.00",
    gender: "unisex",
    categories: ["gift-sets"],
    descEn:
      "Six 20ml summer fragrances inspired by the coast — Chasing Waves, Red Coral, Sea Breeze, Sunrise Melody, Ocean Whisper and Riviera Sunset. Fresh, bright and perfect for travel.",
    descAr:
      "ست عطور صيفية 20 مل مستوحاة من الساحل — تشيسينج ويفز، ريد كورال، سي بريز، صن رايز ميلودي، أوشن ويسبر، وريفييرا صن ست. منعشة ومشرقة ومثالية للسفر.",
    images: ["p46-mini-summer-collection"],
  },
  {
    slug: "musk-duhn-collection",
    brand: IBRAQ,
    nameEn: "Musk Collection — Musk Duhn 5 in 1",
    nameAr: "مجموعة المسك — مسك دهن 5 في 1",
    price: "1950.00",
    gender: "unisex",
    categories: ["gift-sets", "musk"],
    descEn:
      "Five concentrated musk oils in one box — including Special, Powder, Raspberry and Blueberry musk. Long-lasting, alcohol-free perfume oils to wear alone or layer under your favourite spray.",
    descAr:
      "خمس زيوت مسك مركّزة في علبة واحدة — منهم المسك الخاص والبودر والتوت والتوت الأزرق. زيوت عطرية ثابتة تلبسها لوحدها أو تحت عطرك المفضل.",
    images: ["p47-musk-duhn-collection"],
  },

  // ── DUKHOON AL EMARATIYA ─────────────────────────────────────────────────
  {
    slug: "signature-rose-gold",
    brand: DUKHOON,
    nameEn: "Signature Rose Gold",
    nameAr: "سيجنتشر روز جولد",
    price: "1850.00",
    gender: "unisex",
    categories: ["unisex"],
    descEn:
      "Saffron, orange and cinnamon open warm and glowing, caramel, amber and rose give it a rich, sweet heart, and tonka and vanilla wrap it up softly. Oriental and inviting.",
    descAr:
      "زعفران وبرتقال وقرفة بيفتحوا دافيين ولامعين، وكراميل وعنبر وورد بيدّوه قلب غني وحلو، وتونكا وفانيليا بيقفلوه بنعومة. شرقي ويشد.",
    notesEn: "Saffron, orange, cinnamon | Caramel, amber, rose | Tonka bean, vanilla",
    notesAr: "زعفران، برتقال، قرفة | كراميل، عنبر، ورد | تونكا، فانيليا",
    images: ["p48-signature-rose-gold"],
  },
  {
    slug: "signature-gold",
    brand: DUKHOON,
    nameEn: "Signature Gold",
    nameAr: "سيجنتشر جولد",
    price: "1850.00",
    gender: "unisex",
    categories: ["unisex"],
    descEn:
      "Luxury with a golden glow. Honey and white flowers open sweetly, citrus and caramel balance fresh and warm, and patchouli with woods leaves a deep, lasting trail.",
    descAr:
      "فخامة بلمعة دهبي. عسل وورود بيضا بيفتحوا بحلاوة، وحمضيات وكراميل بيوازنوا بين الانتعاش والدفا، وباتشولي وأخشاب بيسيبوا أثر عميق وثابت.",
    notesEn: "Honey, white flowers | Citrus, caramel | Patchouli, woods",
    notesAr: "عسل، ورود بيضا | حمضيات، كراميل | باتشولي، أخشاب",
    images: ["p49-signature-gold"],
    isBestSeller: true,
  },
  {
    slug: "khalifa",
    brand: DUKHOON,
    nameEn: "Khalifa",
    nameAr: "خليفة",
    price: "1850.00",
    gender: "unisex",
    categories: ["unisex"],
    descEn:
      "Inspired by French flower gardens. Bergamot, clove and pink pepper open fresh and spicy, rose and jasmine add elegance, and vanilla, musk and a cool touch of mint finish it. For day and night.",
    descAr:
      "مستوحى من حدائق الورد الفرنسية. برغموت وقرنفل وفلفل وردي بيفتحوا منعش وحار، وورد وياسمين بيضيفوا أناقة، وفانيليا ومسك ولمسة نعناع بيقفلوه. للنهار والليل.",
    notesEn: "Bergamot, clove, pink pepper | Rose, jasmine | Vanilla, musk, mint",
    notesAr: "برغموت، قرنفل، فلفل وردي | ورد، ياسمين | فانيليا، مسك، نعناع",
    images: ["p50-khalifa"],
    isFeaturedHome: true,
  },
  {
    slug: "al-hilal-9",
    brand: DUKHOON,
    nameEn: "Al Hilal 9",
    nameAr: "الهلال 9",
    price: "1850.00",
    gender: "unisex",
    categories: ["unisex"],
    descEn:
      "Made for fans, in Al Hilal royal blue. Amber and white flowers open, citrus brightens the heart, and woods with sweet notes keep it smooth and long-lasting.",
    descAr:
      "معمول للمشجعين، بأزرق الهلال الملكي. عنبر وورود بيضا بيفتحوا، وحمضيات بتنوّر القلب، وأخشاب ونفحات حلوة بتخلّيه ناعم وثابت.",
    notesEn: "Amber, white flowers | Citrus | Woods, sweet notes",
    notesAr: "عنبر، ورود بيضا | حمضيات | أخشاب، نفحات حلوة",
    images: ["p51-al-hilal-9"],
  },
  {
    slug: "private-2-december",
    brand: DUKHOON,
    nameEn: "Private 2 December",
    nameAr: "برايفت 2 ديسمبر",
    price: "1850.00",
    gender: "unisex",
    categories: ["unisex"],
    descEn:
      "Created for the UAE's National Day. Mandarin, orange and magnolia open brightly, patchouli, amber and labdanum warm the heart, and vetiver, cedar and juniper give it a noble, woody finish.",
    descAr:
      "معمول لليوم الوطني الإماراتي. يوسفي وبرتقال وماغنوليا بيفتحوا بإشراق، وباتشولي وعنبر ولابدانوم بيدفّوا القلب، ونجيل وأرز وعرعر بيقفلوه بلمسة خشبية راقية.",
    notesEn: "Mandarin, orange, magnolia | Patchouli, amber, labdanum | Vetiver, cedarwood, juniper",
    notesAr: "يوسفي، برتقال، ماغنوليا | باتشولي، عنبر، لابدانوم | نجيل، أرز، عرعر",
    images: ["p52-private-2-december"],
  },
  {
    slug: "tiamo",
    brand: DUKHOON,
    nameEn: "Tiamo",
    nameAr: "تيامو",
    price: "1850.00",
    gender: "unisex",
    categories: ["unisex"],
    descEn:
      "\"I love you\" in a bottle. Bergamot, peach blossom and white flowers open tenderly, patchouli, cranberry and amber deepen the heart, and violet with leather adds a romantic, velvety finish.",
    descAr:
      "\"بحبك\" في زجاجة. برغموت وزهر خوخ وورود بيضا بيفتحوا برقة، وباتشولي وتوت بري وعنبر بيعمّقوا القلب، وبنفسج وجلد بيضيفوا ختام رومانسي مخملي.",
    notesEn: "Bergamot, peach blossom, white flowers | Patchouli, cranberry, amber | Violet, leather",
    notesAr: "برغموت، زهر خوخ، ورود بيضا | باتشولي، توت بري، عنبر | بنفسج، جلد",
    images: ["p53-tiamo"],
    isFeaturedHome: true,
  },
  {
    slug: "gold-tears",
    brand: DUKHOON,
    nameEn: "Gold Tears",
    nameAr: "جولد تيرز",
    price: "1850.00",
    gender: "unisex",
    categories: ["unisex"],
    descEn:
      "Soft musk, French rose and a bouquet of flowers, resting on smooth vanilla. Floral, woody and musky — simple, elegant and easy to love.",
    descAr:
      "مسك ناعم وورد فرنساوي وباقة ورود، على قاعدة فانيليا ناعمة. زهري وخشبي ومسكي — بسيط وأنيق وسهل تحبه.",
    notesEn: "Musk | French rose, floral notes | Vanilla",
    notesAr: "مسك | ورد فرنساوي، نفحات زهرية | فانيليا",
    images: ["p54-gold-tears"],
  },
  {
    slug: "pinkish",
    brand: DUKHOON,
    nameEn: "Pinkish",
    nameAr: "بينكش",
    price: "1850.00",
    gender: "women",
    categories: ["women"],
    descEn:
      "Fresh, floral and fruity with a soft feminine touch. White peach, bergamot and mandarin sparkle over orange blossom and lily of the valley, finishing on musk, ambroxan and vanilla. Perfect for every day.",
    descAr:
      "منعش وزهري وفاكهي بلمسة أنثوية ناعمة. خوخ أبيض وبرغموت ويوسفي بيلمعوا على زهر برتقال وزنبق الوادي، وختام مسك وأمبروكسان وفانيليا. مثالي لكل يوم.",
    notesEn: "Aldehydes, white peach, bergamot, mandarin | Orange blossom, lily of the valley, vetiver | Musk, ambroxan, akigalawood, vanilla",
    notesAr: "ألدهيدات، خوخ أبيض، برغموت، يوسفي | زهر برتقال، زنبق الوادي، نجيل | مسك، أمبروكسان، أكيجالاوود، فانيليا",
    images: ["p55-pinkish"],
  },
  {
    slug: "aura-dukhoon",
    brand: DUKHOON,
    nameEn: "Aura",
    nameAr: "أورا",
    price: "1850.00",
    gender: "unisex",
    categories: ["unisex"],
    descEn:
      "Amber-coloured and glowing. Fruits, saffron and peach open warmly, caramel, jasmine and rose build a sweet floral heart, and patchouli, amber and musk give it lasting depth.",
    descAr:
      "لونه عنبري ولامع. فواكه وزعفران وخوخ بيفتحوا بدفا، وكراميل وياسمين وورد بيبنوا قلب زهري حلو، وباتشولي وعنبر ومسك بيدّوه عمق وثبات.",
    notesEn: "Fruits, saffron, peach | Caramel, jasmine, rose | Patchouli, amber, musk",
    notesAr: "فواكه، زعفران، خوخ | كراميل، ياسمين، ورد | باتشولي، عنبر، مسك",
    images: ["p56-aura-dukhoon"],
  },
  {
    slug: "queen",
    brand: DUKHOON,
    nameEn: "Queen",
    nameAr: "كوين",
    price: "1850.00",
    gender: "women",
    categories: ["women"],
    descEn:
      "Pure luxury. Bergamot, pink pepper and pear blossom open radiantly, jasmine, tuberose, ylang-ylang and spice form a warm floral heart, and patchouli, cashmere, musk and amber give it a rich, lasting signature.",
    descAr:
      "فخامة خالصة. برغموت وفلفل وردي وزهر كمثرى بيفتحوا بإشراق، وياسمين ومسك الروم ويلانغ يلانغ وتوابل بيعملوا قلب زهري دافي، وباتشولي وكشمير ومسك وعنبر بيدّوه بصمة غنية وثابتة.",
    notesEn: "Bergamot, pink pepper, pear blossom | Jasmine, spices, tuberose, ylang-ylang | Patchouli, cashmere, musk, amber",
    notesAr: "برغموت، فلفل وردي، زهر كمثرى | ياسمين، توابل، مسك الروم، يلانغ يلانغ | باتشولي، كشمير، مسك، عنبر",
    images: ["p57-queen"],
  },
  {
    slug: "dukhoon-rose",
    brand: DUKHOON,
    nameEn: "Rose",
    nameAr: "روز",
    price: "1950.00",
    gender: "unisex",
    categories: ["unisex"],
    descEn:
      "An oriental rose with a spicy glow. Mandarin, pink pepper and cardamom open brightly, rose, patchouli and jasmine form the heart, and vanilla with musk keeps it warm and soft.",
    descAr:
      "وردة شرقية بلمعة توابل. يوسفي وفلفل وردي وهيل بيفتحوا بإشراق، وورد وباتشولي وياسمين في القلب، وفانيليا ومسك بيخلّوه دافي وناعم.",
    notesEn: "Mandarin, pink pepper, cardamom | Rose, patchouli, jasmine | Vanilla, musk",
    notesAr: "يوسفي، فلفل وردي، هيل | ورد، باتشولي، ياسمين | فانيليا، مسك",
    images: ["p58-dukhoon-rose"],
  },
  {
    slug: "kahilan",
    brand: DUKHOON,
    nameEn: "Kahilan",
    nameAr: "كحيلان",
    price: "1850.00",
    gender: "unisex",
    categories: ["unisex", "oud-tobacco"],
    descEn:
      "Inspired by the desert. Bergamot and red berries open, vetiver adds an earthy calm, and amber, white oud and caramel leave a warm, golden, sweet-woody trail.",
    descAr:
      "مستوحى من الصحرا. برغموت وتوت أحمر بيفتحوا، ونجيل بيضيف هدوء ترابي، وعنبر وعود أبيض وكراميل بيسيبوا أثر دهبي دافي حلو وخشبي.",
    notesEn: "Bergamot, red berries | Vetiver | Amber, white oud, caramel",
    notesAr: "برغموت، توت أحمر | نجيل | عنبر، عود أبيض، كراميل",
    images: ["p59-kahilan"],
  },
  {
    slug: "haneet",
    brand: DUKHOON,
    nameEn: "Haneet",
    nameAr: "حنيت",
    price: "1850.00",
    gender: "women",
    categories: ["women"],
    descEn:
      "Bright and tender. Lemon and bergamot open with energy, an elegant bouquet of flowers adds charm, and warm woods give it a soft, lingering finish.",
    descAr:
      "مشرق ورقيق. ليمون وبرغموت بيفتحوا بطاقة، وباقة ورود أنيقة بتضيف جاذبية، وأخشاب دافية بتدّيه ختام ناعم بيطوّل.",
    notesEn: "Lemon, bergamot | Floral notes | Woody notes",
    notesAr: "ليمون، برغموت | نفحات زهرية | أخشاب",
    images: ["p60-haneet"],
  },
  {
    slug: "vanilla-wood",
    brand: DUKHOON,
    nameEn: "Vanilla Wood",
    nameAr: "فانيلا وود",
    price: "1850.00",
    gender: "unisex",
    categories: ["unisex"],
    descEn:
      "Spiced vanilla on warm wood. Cardamom, cinnamon, orange blossom and bergamot open aromatic, creamy vanilla sits at the heart, and cocoa, amber, musk and woods make it rich and cosy.",
    descAr:
      "فانيليا متبّلة على خشب دافي. هيل وقرفة وزهر برتقال وبرغموت بيفتحوا عطري، وفانيليا كريمية في القلب، وكاكاو وعنبر ومسك وأخشاب بيخلّوه غني ودافي.",
    notesEn: "Cardamom, cinnamon, orange blossom, bergamot | Vanilla | Cocoa, amber, musk, woody notes",
    notesAr: "هيل، قرفة، زهر برتقال، برغموت | فانيليا | كاكاو، عنبر، مسك، أخشاب",
    images: ["p61-vanilla-wood"],
  },
  {
    slug: "signature-white",
    brand: DUKHOON,
    nameEn: "Signature White",
    nameAr: "سيجنتشر وايت",
    price: "1950.00",
    gender: "unisex",
    categories: ["unisex"],
    descEn:
      "Modern elegance. Cardamom, pineapple, patchouli and caramel open spicy-sweet, jasmine, rose and iris add refinement, and musk, tonka, vanilla and sandalwood give it a smooth, clean finish.",
    descAr:
      "أناقة عصرية. هيل وأناناس وباتشولي وكراميل بيفتحوا حار وحلو، وياسمين وورد وسوسن بيضيفوا رقي، ومسك وتونكا وفانيليا وصندل بيقفلوه بنضافة ونعومة.",
    notesEn: "Cardamom, pineapple, patchouli, caramel | Jasmine, rose, iris | Musk, tonka bean, vanilla, sandalwood",
    notesAr: "هيل، أناناس، باتشولي، كراميل | ياسمين، ورد، سوسن | مسك، تونكا، فانيليا، صندل",
    images: ["p62-signature-white"],
  },
  {
    slug: "solo",
    brand: DUKHOON,
    nameEn: "Solo",
    nameAr: "سولو",
    price: "1950.00",
    gender: "unisex",
    categories: ["unisex"],
    descEn:
      "A statement in amber and gold. SOLO's studded, faceted glass glows from honey-gold to deep orange under a jewelled gold cap — a bold, radiant bottle for those who like to stand on their own.",
    descAr:
      "بصمة بلون الكهرمان والدهب. زجاجة سولو المرصّعة بتتدرّج من العسلي للبرتقالي الغامق تحت غطا دهبي زي الجوهرة — زجاجة جريئة ومشرقة للي بيحب يتميّز.",
    images: ["p63-solo"],
  },
];
