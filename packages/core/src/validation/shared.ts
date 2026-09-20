import { z } from "zod";

export const SUPPORTED_LOCALES = ["en", "ar"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

export const slugSchema = z
  .string()
  .min(1)
  .max(150)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Lowercase letters, numbers and hyphens only");

/** Form-friendly: accepts a number or numeric string, always outputs a 2dp decimal string for the DB. */
export const decimalString = z.coerce.number().min(0).transform((n) => n.toFixed(2));

export const nullableDecimalString = z
  .union([decimalString, z.literal(""), z.null(), z.undefined()])
  .transform((v) => (v === "" || v === null || v === undefined ? null : v));

/** English required, Arabic optional — matches how content is authored: EN first, AR filled in when ready. */
export const requiredLocalizedText = (max: number) =>
  z.object({
    en: z.string().min(1, "English text is required").max(max),
    ar: z.string().max(max).optional().or(z.literal("")),
  });

export const optionalLocalizedText = (max: number) =>
  z.object({
    en: z.string().max(max).optional().or(z.literal("")),
    ar: z.string().max(max).optional().or(z.literal("")),
  });

export type LocalizedText = { en: string; ar?: string };
