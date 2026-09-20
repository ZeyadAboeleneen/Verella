import "server-only";
import { cookies } from "next/headers";
import { SUPPORTED_LOCALES, DEFAULT_LOCALE, type Locale } from "@verella/core";
import { LOCALE_COOKIE } from "./constants";
import en from "./dictionaries/en.json";
import ar from "./dictionaries/ar.json";

export type { Locale };
export { SUPPORTED_LOCALES, DEFAULT_LOCALE };

const dictionaries = { en, ar } as const;
export type Dictionary = typeof en;

export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  return SUPPORTED_LOCALES.includes(value as Locale) ? (value as Locale) : DEFAULT_LOCALE;
}

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}

export async function getDict(): Promise<Dictionary> {
  return getDictionary(await getLocale());
}

export function dir(locale: Locale): "rtl" | "ltr" {
  return locale === "ar" ? "rtl" : "ltr";
}
