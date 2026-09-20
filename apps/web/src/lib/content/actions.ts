"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db, banners, bannerTranslations, contentBlocks } from "@verella/db";
import { guardPermission, type ActionResult } from "@/lib/auth/rbac";
import {
  CATEGORY_CARD_KEYS,
  INSTAGRAM_PHOTO_KEYS,
  type AboutHeroPayload,
  type CategoryCardKey,
  type CategoryCardPayload,
  type InstagramPhotoKey,
  type InstagramPhotoPayload,
} from "@/lib/content/queries";

export interface BannerInput {
  mediaId: number;
  /** Button 1 destination + label. */
  linkUrl?: string;
  ctaTextEn?: string;
  ctaTextAr?: string;
  /** Button 2 (optional) — a slide can offer up to two CTAs. */
  link2Url?: string;
  ctaText2En?: string;
  ctaText2Ar?: string;
  /** Makes the slide image itself clickable, independent of the buttons. */
  imageLinkUrl?: string;
  placement: string;
  titleEn?: string;
  titleAr?: string;
  subtitleEn?: string;
  subtitleAr?: string;
  isActive: boolean;
  sortOrder: number;
}

function revalidateContent() {
  revalidatePath("/admin/content");
  revalidatePath("/");
}

export async function createBannerAction(input: BannerInput): Promise<ActionResult<{ id: number }>> {
  const guard = await guardPermission("content.manage");
  if ("error" in guard) return guard;

  const id = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(banners)
      .values({
        mediaId: input.mediaId,
        linkUrl: input.linkUrl || null,
        link2Url: input.link2Url || null,
        imageLinkUrl: input.imageLinkUrl || null,
        placement: input.placement,
        isActive: input.isActive,
        sortOrder: input.sortOrder,
      })
      .$returningId();

    if (input.titleEn || input.subtitleEn || input.ctaTextEn || input.ctaText2En) {
      await tx.insert(bannerTranslations).values({
        bannerId: row.id,
        locale: "en",
        title: input.titleEn || null,
        subtitle: input.subtitleEn || null,
        ctaText: input.ctaTextEn || null,
        ctaText2: input.ctaText2En || null,
      });
    }
    if (input.titleAr || input.subtitleAr || input.ctaTextAr || input.ctaText2Ar) {
      await tx.insert(bannerTranslations).values({
        bannerId: row.id,
        locale: "ar",
        title: input.titleAr || null,
        subtitle: input.subtitleAr || null,
        ctaText: input.ctaTextAr || null,
        ctaText2: input.ctaText2Ar || null,
      });
    }
    return row.id;
  });

  revalidateContent();
  return { success: true, data: { id } };
}

export async function toggleBannerActiveAction(id: number, isActive: boolean): Promise<ActionResult> {
  const guard = await guardPermission("content.manage");
  if ("error" in guard) return guard;

  await db.update(banners).set({ isActive }).where(eq(banners.id, id));
  revalidateContent();
  return { success: true };
}

export async function deleteBannerAction(id: number): Promise<ActionResult> {
  const guard = await guardPermission("content.manage");
  if ("error" in guard) return guard;

  await db.delete(banners).where(eq(banners.id, id));
  revalidateContent();
  return { success: true };
}

/** Persist a new display order — index in the array becomes the sortOrder. */
export async function reorderBannersAction(orderedIds: number[]): Promise<ActionResult> {
  const guard = await guardPermission("content.manage");
  if ("error" in guard) return guard;

  await db.transaction(async (tx) => {
    for (let i = 0; i < orderedIds.length; i++) {
      await tx.update(banners).set({ sortOrder: i }).where(eq(banners.id, orderedIds[i]));
    }
  });
  revalidateContent();
  return { success: true };
}

// ─── Generic content blocks — About hero, homepage category cards, homepage
// Instagram photos. Each block is identified by (page, blockKey), which is
// unique in the schema, so every save is a single upsert — no separate
// create/update paths, no ids to track from the client.
async function upsertContentBlock(page: string, blockKey: string, type: string, payload: Record<string, unknown>) {
  await db
    .insert(contentBlocks)
    .values({ page, blockKey, type, payload })
    .onDuplicateKeyUpdate({ set: { payload, type } });
}

export async function saveAboutHeroAction(input: AboutHeroPayload): Promise<ActionResult> {
  const guard = await guardPermission("content.manage");
  if ("error" in guard) return guard;
  if (!input.imageUrl?.trim()) return { error: "Choose an image first." };

  await upsertContentBlock("about", "hero", "image", { ...input });
  revalidatePath("/admin/about");
  revalidatePath("/about");
  return { success: true };
}

export async function saveCategoryCardAction(key: CategoryCardKey, input: CategoryCardPayload): Promise<ActionResult> {
  const guard = await guardPermission("content.manage");
  if ("error" in guard) return guard;
  if (!CATEGORY_CARD_KEYS.includes(key)) return { error: "Invalid card." };
  if (!input.imageUrl?.trim()) return { error: "Choose an image first." };
  if (!input.titleEn.trim()) return { error: "An English title is required." };

  await upsertContentBlock("home", key, "category_card", { ...input });
  revalidatePath("/admin/content");
  revalidatePath("/");
  return { success: true };
}

export async function saveInstagramPhotoAction(key: InstagramPhotoKey, input: InstagramPhotoPayload): Promise<ActionResult> {
  const guard = await guardPermission("content.manage");
  if ("error" in guard) return guard;
  if (!INSTAGRAM_PHOTO_KEYS.includes(key)) return { error: "Invalid photo slot." };
  if (!input.imageUrl?.trim()) return { error: "Choose an image first." };

  await upsertContentBlock("home", key, "instagram_photo", { ...input });
  revalidatePath("/admin/content");
  revalidatePath("/");
  return { success: true };
}
