import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { revalidatePath, revalidateTag } from "next/cache";
import { CATALOG_CACHE_TAG } from "@/lib/store/queries";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db, media, settings, storeProductMedia, storeProducts } from "@verella/db";
import { removeBackground } from "./background-removal";
import { composeStyledImage } from "./styled-image";
import { isStorageConfigured, uploadStream } from "./cloudinary";

/** Media made by this module: folder "styled", title "styled-of:<source media id>". */
const STYLED_FOLDER = "styled";
const styledTitle = (sourceId: number) => `styled-of:${sourceId}`;

/** An AI photo: made by this module, or a launch-catalog "…/styled.webp". */
export function isStyledMedia(m: { folder: string | null; url: string | null }): boolean {
  return m.folder === STYLED_FOLDER || /\/styled\.[a-z]+$/i.test(m.url ?? "");
}

/** Admin → Settings switch for all AI backgrounds (on unless switched off). */
export async function isAiBackgroundsEnabled(): Promise<boolean> {
  const [row] = await db
    .select({ value: settings.value })
    .from(settings)
    .where(and(eq(settings.group, "site"), eq(settings.key, "ai_backgrounds")))
    .limit(1);
  return row?.value !== false;
}

/**
 * Take every AI photo off a product so the admin's own first photo is the main
 * one again (the AI images stay in the Media Library).
 */
export async function removeStyledImagesFromProduct(productId: number): Promise<void> {
  const linked = await db
    .select({ mediaId: media.id, folder: media.folder, url: media.url })
    .from(storeProductMedia)
    .innerJoin(media, eq(media.id, storeProductMedia.mediaId))
    .where(eq(storeProductMedia.productId, productId))
    .orderBy(asc(storeProductMedia.sortOrder));
  const styled = linked.filter(isStyledMedia).map((m) => m.mediaId);
  if (!styled.length) return;
  const rest = linked.filter((m) => !isStyledMedia(m));
  await db.transaction(async (tx) => {
    await tx.delete(storeProductMedia).where(and(eq(storeProductMedia.productId, productId), inArray(storeProductMedia.mediaId, styled)));
    for (const [i, m] of rest.entries()) {
      await tx
        .update(storeProductMedia)
        .set({ sortOrder: i, isPrimary: i === 0 })
        .where(and(eq(storeProductMedia.productId, productId), eq(storeProductMedia.mediaId, m.mediaId)));
    }
  });
}

/**
 * Cut out one photo and put it on the Verella backdrop; saved as a media row
 * ("styled-of:<source id>") so the product save later reuses it instantly.
 * The backdrop depends only on the source photo, so preview = final result.
 */
async function makeStyledMedia(sourceMediaId: number, sourceUrl: string): Promise<{ id: number; url: string }> {
  const started = Date.now();
  const cutout = await removeBackground(await readSource(sourceUrl));
  const { buffer } = await composeStyledImage(cutout, { seed: `media-${sourceMediaId}` });
  const uploaded = await uploadStream(Readable.from(buffer), { folder: "products/styled", isPrivate: false });
  const [row] = await db
    .insert(media)
    .values({
      disk: "cloudinary",
      bucket: process.env.CLOUDINARY_CLOUD_NAME ?? "",
      objectKey: uploaded.publicId,
      url: uploaded.url,
      mime: `image/${uploaded.format === "jpg" ? "jpeg" : uploaded.format}`,
      width: uploaded.width,
      height: uploaded.height,
      sizeBytes: uploaded.bytes,
      title: styledTitle(sourceMediaId),
      folder: STYLED_FOLDER,
      isPrivate: false,
    })
    .$returningId();
  console.info(`[styled-image] media ${sourceMediaId}: made in ${((Date.now() - started) / 1000).toFixed(0)}s`);
  return { id: row.id, url: uploaded.url };
}

/** Photos being previewed right now — the same photo isn't processed twice at once. */
const previewing = new Map<number, Promise<{ id: number; url: string }>>();

/**
 * The AI version of one photo, for the product form's preview: reuses one made
 * before, otherwise makes it now (slow: about a minute the first time).
 */
export async function getOrCreateStyledPreview(sourceMediaId: number): Promise<{ id: number; url: string } | { error: string }> {
  if (!isStorageConfigured()) return { error: "Image storage isn't configured." };
  if (!(await isAiBackgroundsEnabled())) return { error: "AI backgrounds are switched off in Settings." };
  const [source] = await db
    .select({ id: media.id, url: media.url, folder: media.folder, isPrivate: media.isPrivate })
    .from(media)
    .where(eq(media.id, sourceMediaId))
    .limit(1);
  if (!source?.url || source.isPrivate) return { error: "Photo not found." };
  if (isStyledMedia(source)) return { id: source.id, url: source.url };

  const [existing] = await db
    .select({ id: media.id, url: media.url })
    .from(media)
    .where(and(eq(media.folder, STYLED_FOLDER), eq(media.title, styledTitle(sourceMediaId))))
    .limit(1);
  if (existing?.url) return { id: existing.id, url: existing.url };

  let job = previewing.get(sourceMediaId);
  if (!job) {
    job = makeStyledMedia(sourceMediaId, source.url);
    previewing.set(sourceMediaId, job);
  }
  try {
    return await job;
  } catch (err) {
    console.error(`[styled-image] preview for media ${sourceMediaId} failed:`, err);
    return { error: "Couldn't make the AI photo — check the server logs (often not enough memory)." };
  } finally {
    previewing.delete(sourceMediaId);
  }
}

/** Products currently being processed in this server — a second save doesn't start a second run. */
const running = new Set<number>();

async function readSource(url: string): Promise<Buffer> {
  // Seeded catalog photos are local files under /public; uploads are full URLs.
  if (url.startsWith("/")) return readFile(path.join(process.cwd(), "public", url));
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Couldn't download ${url}: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

/**
 * Give a product the Verella look automatically: cut its main photo out
 * locally (background-removal.ts) and set it on a backdrop in the bottle's own
 * colour (styled-image.ts) — exactly what scripts/build-catalog-images does by
 * hand. The styled image becomes the product's main photo and the original
 * stays as the second (hover) one.
 *
 * Idempotent: does nothing when the main photo is already a styled image, and
 * reuses an existing styled version of the same source photo. Never throws.
 */
export async function ensureStyledProductImage(
  productId: number,
  /** fresh: the admin's "Generate" button — make a new one even if the product already has an AI photo. */
  opts: { fresh?: boolean } = {},
): Promise<void> {
  if (running.has(productId)) return;
  running.add(productId);
  try {
    if (!isStorageConfigured()) return;
    if (!(await isAiBackgroundsEnabled())) return;

    const [product] = await db
      .select({ slug: storeProducts.slug, autoStyled: storeProducts.autoStyled })
      .from(storeProducts)
      .where(eq(storeProducts.id, productId))
      .limit(1);
    if (!product || (!product.autoStyled && !opts.fresh)) return;

    const photos = await db
      .select({ mediaId: media.id, url: media.url, folder: media.folder, isPrivate: media.isPrivate })
      .from(storeProductMedia)
      .innerJoin(media, eq(media.id, storeProductMedia.mediaId))
      .where(eq(storeProductMedia.productId, productId))
      .orderBy(asc(storeProductMedia.sortOrder));
    // Already styled: the main photo is an AI one (unless regenerating).
    if (!opts.fresh && photos[0] && isStyledMedia(photos[0])) return;
    // Source: the first photo that isn't itself an AI one.
    const main = photos.find((p) => !isStyledMedia(p));
    if (!main || !main.url || main.isPrivate) return;

    if (opts.fresh) {
      // Take the old AI photo(s) off this product; the new one replaces them.
      const old = photos.filter((p) => isStyledMedia(p)).map((p) => p.mediaId);
      if (old.length) await db.delete(storeProductMedia).where(and(eq(storeProductMedia.productId, productId), inArray(storeProductMedia.mediaId, old)));
    }

    let [styled] = opts.fresh
      ? []
      : await db
          .select({ id: media.id })
          .from(media)
          .where(and(eq(media.folder, STYLED_FOLDER), eq(media.title, styledTitle(main.mediaId))))
          .limit(1);

    if (!styled) {
      styled = await makeStyledMedia(main.mediaId, main.url);
      console.info(`[styled-image] product ${productId}: AI photo ready`);
    }

    // Styled first and primary, the original right after it.
    await db.transaction(async (tx) => {
      await tx.update(storeProductMedia).set({ isPrimary: false }).where(eq(storeProductMedia.productId, productId));
      const [linked] = await tx
        .select({ id: storeProductMedia.id })
        .from(storeProductMedia)
        .where(and(eq(storeProductMedia.productId, productId), eq(storeProductMedia.mediaId, styled.id)))
        .limit(1);
      if (linked) {
        await tx.update(storeProductMedia).set({ isPrimary: true, sortOrder: -1 }).where(eq(storeProductMedia.id, linked.id));
      } else {
        await tx.insert(storeProductMedia).values({ productId, mediaId: styled.id, sortOrder: -1, isPrimary: true });
      }
    });

    // Runs after the response, outside the action — revalidateTag (not updateTag) is the one allowed here.
    revalidateTag(CATALOG_CACHE_TAG, "max");
    revalidatePath("/admin/store/products");
    revalidatePath("/store", "layout");
    revalidatePath("/");
  } catch (err) {
    console.error(`[styled-image] product ${productId} failed:`, err);
  } finally {
    running.delete(productId);
  }
}
