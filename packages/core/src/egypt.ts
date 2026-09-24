/**
 * Egypt's 27 governorates. `name` (English) is the stable value stored on
 * addresses and used as the key in the per-governorate delivery fee table;
 * `ar` is display-only.
 */
export const EGYPT_GOVERNORATES = [
  { name: "Cairo", ar: "القاهرة" },
  { name: "Giza", ar: "الجيزة" },
  { name: "Alexandria", ar: "الإسكندرية" },
  { name: "Qalyubia", ar: "القليوبية" },
  { name: "Dakahlia", ar: "الدقهلية" },
  { name: "Sharqia", ar: "الشرقية" },
  { name: "Gharbia", ar: "الغربية" },
  { name: "Monufia", ar: "المنوفية" },
  { name: "Beheira", ar: "البحيرة" },
  { name: "Kafr El Sheikh", ar: "كفر الشيخ" },
  { name: "Damietta", ar: "دمياط" },
  { name: "Port Said", ar: "بورسعيد" },
  { name: "Ismailia", ar: "الإسماعيلية" },
  { name: "Suez", ar: "السويس" },
  { name: "Faiyum", ar: "الفيوم" },
  { name: "Beni Suef", ar: "بني سويف" },
  { name: "Minya", ar: "المنيا" },
  { name: "Asyut", ar: "أسيوط" },
  { name: "Sohag", ar: "سوهاج" },
  { name: "Qena", ar: "قنا" },
  { name: "Luxor", ar: "الأقصر" },
  { name: "Aswan", ar: "أسوان" },
  { name: "Red Sea", ar: "البحر الأحمر" },
  { name: "New Valley", ar: "الوادي الجديد" },
  { name: "Matrouh", ar: "مطروح" },
  { name: "North Sinai", ar: "شمال سيناء" },
  { name: "South Sinai", ar: "جنوب سيناء" },
] as const;

export type GovernorateName = (typeof EGYPT_GOVERNORATES)[number]["name"];

export const GOVERNORATE_NAMES = EGYPT_GOVERNORATES.map((g) => g.name) as [GovernorateName, ...GovernorateName[]];

export function governorateLabel(name: string, locale: "en" | "ar"): string {
  const g = EGYPT_GOVERNORATES.find((x) => x.name === name);
  if (!g) return name;
  return locale === "ar" ? g.ar : g.name;
}
