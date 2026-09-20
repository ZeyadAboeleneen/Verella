/**
 * Fallback content for the homepage's admin-manageable blocks (Shop by
 * Category cards, Instagram photos) — shown until an admin overrides a slot
 * from Admin → Home Page, and used to pre-fill the editor there. `mediaId: 0`
 * is a placeholder (these defaults aren't uploaded media library rows) — safe
 * because saves are validated on `imageUrl`, not `mediaId`.
 */
import type { CategoryCardKey, CategoryCardPayload, InstagramPhotoKey, InstagramPhotoPayload } from "./queries";

export const DEFAULT_CATEGORY_CARDS: Record<CategoryCardKey, CategoryCardPayload> = {
  category_1: {
    mediaId: 0,
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCnLyE0AV2PpaHpAIsGnofk40-Valox_QyotcE-o57h6ajtSIqenIHsx0B9mLuf5h8GSKz0DoP_1Cb8NHBGPZGoedrVnqSrEGgVC9aonl9OK5ZyHsTEo22s1bdOoDoa8KPurZHAGWzfojggBSSYP7kB6WYZyZ6vbMs8xZ--X6z8yBATLGnBbW_2iK2haSA9K_sCVuh2eNYXEwe6PRomI0XG1Ezt_nzKujIr-RSQlY2QbCbSutEejj1KLrjcAp_q0fSfty_mfqO8Exm-",
    titleEn: "Coffee Beans",
    titleAr: "حبوب القهوة",
    descriptionEn: "Explore our world-class origins and signature house blends.",
    descriptionAr: "استكشف أصولنا العالمية وخلطاتنا المميزة.",
    linkUrl: "/coffee",
  },
  category_2: {
    mediaId: 0,
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAtHJO0P8lnQRgLkZnHiguKhs_L21LPF-xDZvzmr2trJ7KmpFR_hwwIf1zcxrNys4ORwC0tdjlJR4T7U_7d6Appl-R2awVjPZxpR81qcuTx8HhgMdz7tio5QUxPSMycuQ6HxZkVwBiu5jp8H9sTR6edkTYOTlujLoop-J4WUshVgHSjETPfi9TB8ffq3_VG-JCyYcR2SvJB1KSlIvqRar7kagI0IWN1-oruYe-iwd7kdM4LKVEdcKa4QfLCasHCj_IYgYoaATeIJtxq",
    titleEn: "Turkish Coffee",
    titleAr: "قهوة تركية",
    descriptionEn: "Rich, aromatic, and brewed the traditional way.",
    descriptionAr: "غنية وعطرية، تُحضّر بالطريقة التقليدية.",
    linkUrl: "/store",
  },
  category_3: {
    mediaId: 0,
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCEsHAR7ODVNAYkY6yPqfb-mAh84mmOmZpi4nwE7VIK-bpflOMRsneh4VbqJo-ZkzeDu-s74yuFnTw0lYtePbpgOSNkjXMlQtEL473pdpfPoeXwyzv9g38iHy1Dyab5GYzbQCFKbT205kDWQNi6JSc44tMEcTN25nPQAfNeFUW_zNcIa2NKlwW8OCJiLEQeZCYnmEK3qk_jg83FJKQz2-8eEhNKF-grCgxpz5TSZjrU6uVvw0Cv3qnls-IKZNK5Wn-1cz5cmU_8JVkg",
    titleEn: "Espresso",
    titleAr: "إسبريسو",
    descriptionEn: "Bold shots crafted for the modern coffee lover.",
    descriptionAr: "جرعات قوية لعشاق القهوة العصريين.",
    linkUrl: "/store",
  },
};

export const DEFAULT_INSTAGRAM_PHOTOS: Record<InstagramPhotoKey, InstagramPhotoPayload> = {
  instagram_1: {
    mediaId: 0,
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuC-mC26bB2x66nsnPViuVeNaB6IzJi0vUPNLCZhx6E1W8WrRky2jm8WW_CLp9MfJE5VXnq8pZna0plcHgeQRGQx1OZRqLliJmkEJMFuZbYT8_48gS87ZXDqUNjInaZ5muf5veLkac3Q78uafAD9yAYLIte1T3Pk8a08kuDChkMvuW6nh7FMObHznsnRUSkPCgKBdZWQ8X1PPEzvjEDLLe04w6j4k0aCDUA9VqolFvfg5nfzM_liwhnhBeZ-rB3xMCj_AAri5Xh-Mfca",
    linkUrl: "",
  },
  instagram_2: {
    mediaId: 0,
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBGDm2Espjkau2eZBUoPSyhwhnu5PClVqC6GcTsZz--ZpkWD7AaDOrfMzradikpV6CS7IhOIRnrFll_0NWnJLxwiTeZaNPZ3akrjbKMvz7Yvw0wadaya3HWemdtfZh_uJong7cx85qh6Xzjt5EvLx-Ef1o6OD6R42W4zOqL8oburJD-WiNYxpRysHSec392zNgnO0bMh9D58IcDD8NwHcUX7_4Pk0emwv1LWGi5M3qgzmGlYi7OZ8oV-fsf3YAePOV9_kZh49xezhOj",
    linkUrl: "",
  },
  instagram_3: {
    mediaId: 0,
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAjH39DFRbhHp5O_oXN8twAV6J2Etj923ufUIyyAWvU6VzhsTgVZh8R01mu8BP2QXHtABshvLF9eAr5YSKHK829voUsbeTpiIWxDOC-JEvyoE5FbAnGNZYP3xuLNveiE9fiXCb3in0JtjxFtBRyZbdvLMooXj-8raCyHsDYoBe-ZADDgyXVjHCmCfqjXH7E9rGHxRGTEZ3alId1XeB1flfG-qeBWU7Uqi7fBS2niO8YtzJs_Tb1wYKfUYmRklA2apGsnk2TgreRvxfC",
    linkUrl: "",
  },
  instagram_4: {
    mediaId: 0,
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBg-8QEfNfLQXHok6C-2tosGWXorttjKPcNSsUkF-sq231VQHkX1mWNHVEawhKGnqSguepMcfxOsc5XtY1cwamwk2e4Qnyl0zkGBojYc57st6CkBiwValZqvP6vh_C-XfrsBKeT1xPZ9d9Vhy5ppcKMBB51WZw1-StGh-FnKW35HN6gXtMNlHInXhvX95lUaS_RBj8AFX5jVepaBy3JW6m1UmB00fk1eTgb1aQ5Vvk7mhc63Tvt5Ug0xNFE48j2JnnvC9deDYQKC0jO",
    linkUrl: "",
  },
};
