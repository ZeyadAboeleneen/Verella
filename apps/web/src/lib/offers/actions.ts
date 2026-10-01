"use server";

import { revalidatePath, updateTag } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, offers } from "@verella/db";
import { guardPermission, type ActionResult } from "@/lib/auth/rbac";
import { logActivity } from "@/lib/activity/log";
import { OFFERS_CACHE_TAG } from "./queries";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || null)
    .nullable()
    .optional();

const offerSchema = z
  .object({
    titleAr: z.string().trim().min(1, "Arabic title is required").max(160),
    titleEn: z.string().trim().min(1, "English title is required").max(160),
    bodyAr: optionalText(600),
    bodyEn: optionalText(600),
    highlightAr: optionalText(40),
    highlightEn: optionalText(40),
    ctaLabelAr: optionalText(60),
    ctaLabelEn: optionalText(60),
    linkUrl: optionalText(500).refine((v) => !v || v.startsWith("/") || /^https?:\/\//.test(v), {
      message: "Link must start with / (a page on the site) or https://",
    }),
    code: optionalText(50).transform((v) => (v ? v.toUpperCase() : v)),
    imageMediaId: z.number().int().positive().nullable().optional(),
    showInBar: z.boolean(),
    showInCards: z.boolean(),
    isActive: z.boolean(),
    startsAt: z.string().optional().nullable(),
    endsAt: z.string().optional().nullable(),
    sortOrder: z.number().int().min(0).max(9999),
  })
  .refine((o) => o.showInBar || o.showInCards, { message: "Choose where to show it: the top bar, the home-page cards, or both." })
  .refine((o) => !o.startsAt || !o.endsAt || new Date(o.endsAt) > new Date(o.startsAt), { message: "End date must be after the start date." });

export type OfferInput = z.input<typeof offerSchema>;

const toDate = (v: string | null | undefined) => (v ? new Date(v) : null);

function revalidateOffers() {
  updateTag(OFFERS_CACHE_TAG);
  revalidatePath("/admin/offers");
  revalidatePath("/", "layout");
}

function values(data: z.output<typeof offerSchema>) {
  return {
    titleAr: data.titleAr,
    titleEn: data.titleEn,
    bodyAr: data.bodyAr ?? null,
    bodyEn: data.bodyEn ?? null,
    highlightAr: data.highlightAr ?? null,
    highlightEn: data.highlightEn ?? null,
    ctaLabelAr: data.ctaLabelAr ?? null,
    ctaLabelEn: data.ctaLabelEn ?? null,
    linkUrl: data.linkUrl ?? null,
    code: data.code ?? null,
    imageMediaId: data.imageMediaId ?? null,
    showInBar: data.showInBar,
    showInCards: data.showInCards,
    isActive: data.isActive,
    startsAt: toDate(data.startsAt),
    endsAt: toDate(data.endsAt),
    sortOrder: data.sortOrder,
  };
}

export async function createOfferAction(input: OfferInput): Promise<ActionResult<{ id: number }>> {
  const guard = await guardPermission("discounts.manage");
  if ("error" in guard) return guard;
  const parsed = offerSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const [row] = await db.insert(offers).values(values(parsed.data)).$returningId();
  await logActivity({ actorUserId: Number(guard.id), action: "offer.created", entityType: "offer", entityId: row.id });
  revalidateOffers();
  return { success: true, data: { id: row.id } };
}

export async function updateOfferAction(id: number, input: OfferInput): Promise<ActionResult> {
  const guard = await guardPermission("discounts.manage");
  if ("error" in guard) return guard;
  const parsed = offerSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  await db.update(offers).set(values(parsed.data)).where(eq(offers.id, id));
  await logActivity({ actorUserId: Number(guard.id), action: "offer.updated", entityType: "offer", entityId: id });
  revalidateOffers();
  return { success: true };
}

export async function toggleOfferAction(id: number, isActive: boolean): Promise<ActionResult> {
  const guard = await guardPermission("discounts.manage");
  if ("error" in guard) return guard;
  await db.update(offers).set({ isActive }).where(eq(offers.id, id));
  revalidateOffers();
  return { success: true };
}

export async function deleteOfferAction(id: number): Promise<ActionResult> {
  const guard = await guardPermission("discounts.manage");
  if ("error" in guard) return guard;
  await db.delete(offers).where(eq(offers.id, id));
  await logActivity({ actorUserId: Number(guard.id), action: "offer.deleted", entityType: "offer", entityId: id });
  revalidateOffers();
  return { success: true };
}
