"use server";

import { revalidatePath } from "next/cache";
import { desc, eq } from "drizzle-orm";
import {
  db,
  media,
  storeProductMedia,
  storeCategories,
  storeHeroImages,
  menuItems,
  menuCategories,
  menuHeroImages,
  banners,
} from "@verella/db";
import { presignUploadSchema } from "@verella/core";
import { guardPermission } from "@/lib/auth/rbac";
import { logActivity } from "@/lib/activity/log";
import {
  createSignedUploadParams,
  deliveryUrl,
  destroyAsset,
  isStorageConfigured,
  STORAGE_NOT_CONFIGURED_ERROR,
} from "./cloudinary";

// Formats Cloudinary reports back after a successful image upload — it has
// already validated the actual file content by this point (far more robust
// than our old magic-byte sniff of the first few bytes), so this is just a
// sanity check that we're not being asked to register something unexpected.
const ACCEPTED_FORMATS = new Set(["jpg", "jpeg", "png", "webp", "gif"]);

export async function presignMediaUploadAction(input: unknown) {
  const guard = await guardPermission("media.manage");
  if ("error" in guard) return guard;

  if (!isStorageConfigured()) return { error: STORAGE_NOT_CONFIGURED_ERROR };

  const parsed = presignUploadSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid upload request." };

  const { folder, isPrivate } = parsed.data;
  const params = createSignedUploadParams(folder ?? "library", isPrivate);

  return { success: true as const, ...params };
}

export interface ConfirmMediaUploadInput {
  publicId: string;
  format: string;
  width?: number;
  height?: number;
  bytes: number;
  alt?: string;
  title?: string;
  folder?: string;
  isPrivate: boolean;
}

export async function confirmMediaUploadAction(input: ConfirmMediaUploadInput) {
  const guard = await guardPermission("media.manage");
  if ("error" in guard) return guard;

  if (!ACCEPTED_FORMATS.has(input.format.toLowerCase())) {
    await destroyAsset(input.publicId, input.isPrivate).catch(() => {});
    return { error: "Uploaded file does not appear to be a supported image type." };
  }

  const url = input.isPrivate ? "" : deliveryUrl(input.publicId);
  const [row] = await db
    .insert(media)
    .values({
      disk: "cloudinary",
      bucket: process.env.CLOUDINARY_CLOUD_NAME ?? "",
      objectKey: input.publicId,
      url,
      mime: `image/${input.format.toLowerCase() === "jpg" ? "jpeg" : input.format.toLowerCase()}`,
      width: input.width,
      height: input.height,
      sizeBytes: input.bytes,
      alt: input.alt,
      title: input.title,
      folder: input.folder,
      isPrivate: input.isPrivate,
      uploadedBy: Number(guard.id),
    })
    .$returningId();

  await logActivity({ actorUserId: Number(guard.id), action: "media.uploaded", entityType: "media", entityId: row.id });
  revalidatePath("/admin/media");
  return { success: true as const, id: row.id, url };
}

export async function listPublicMediaAction() {
  const guard = await guardPermission("media.view");
  if ("error" in guard) return guard;

  const rows = await db
    .select({ id: media.id, url: media.url, alt: media.alt, title: media.title })
    .from(media)
    .where(eq(media.isPrivate, false))
    .orderBy(desc(media.createdAt))
    .limit(60);

  return { success: true as const, items: rows };
}

/** Everywhere a media row can be referenced from — used to block deletion while still in use. */
async function findMediaUsage(id: number): Promise<string | null> {
  const [
    productMedia,
    categoryImage,
    storeHero,
    itemImage,
    menuCategoryImage,
    menuHero,
    banner,
  ] = await Promise.all([
    db.select({ id: storeProductMedia.id }).from(storeProductMedia).where(eq(storeProductMedia.mediaId, id)).limit(1),
    db.select({ id: storeCategories.id }).from(storeCategories).where(eq(storeCategories.imageMediaId, id)).limit(1),
    db.select({ id: storeHeroImages.id }).from(storeHeroImages).where(eq(storeHeroImages.mediaId, id)).limit(1),
    db.select({ id: menuItems.id }).from(menuItems).where(eq(menuItems.imageMediaId, id)).limit(1),
    db.select({ id: menuCategories.id }).from(menuCategories).where(eq(menuCategories.imageMediaId, id)).limit(1),
    db.select({ id: menuHeroImages.id }).from(menuHeroImages).where(eq(menuHeroImages.mediaId, id)).limit(1),
    db.select({ id: banners.id }).from(banners).where(eq(banners.mediaId, id)).limit(1),
  ]);

  if (productMedia.length) return "a store product";
  if (categoryImage.length) return "a store category";
  if (storeHero.length) return "the store's hero images";
  if (itemImage.length) return "a menu item";
  if (menuCategoryImage.length) return "a menu category";
  if (menuHero.length) return "the menu's hero images";
  if (banner.length) return "a homepage banner";
  return null;
}

export async function deleteMediaAction(id: number) {
  const guard = await guardPermission("media.manage");
  if ("error" in guard) return guard;

  const [row] = await db.select().from(media).where(eq(media.id, id)).limit(1);
  if (!row) return { error: "Media not found." };

  const usage = await findMediaUsage(id);
  if (usage) return { error: `This image is still used by ${usage} — remove it there first before deleting.` };

  // Delete the DB row before the remote asset: if something still references
  // this media (a table findMediaUsage doesn't know about, or a race), the
  // FK constraint rejects the delete and we never touch Cloudinary — so a
  // product's image can never be silently broken by a media deletion.
  try {
    await db.delete(media).where(eq(media.id, id));
  } catch {
    return { error: "This image is still in use elsewhere — remove it there first before deleting." };
  }
  await destroyAsset(row.objectKey, row.isPrivate);

  await logActivity({ actorUserId: Number(guard.id), action: "media.deleted", entityType: "media", entityId: id });
  revalidatePath("/admin/media");
  return { success: true as const };
}
