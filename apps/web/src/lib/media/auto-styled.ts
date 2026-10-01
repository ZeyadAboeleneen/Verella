import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { revalidatePath, revalidateTag } from "next/cache";
import { CATALOG_CACHE_TAG } from "@/lib/store/queries";
import { and, asc, eq } from "drizzle-orm";
import { db, media, storeProductMedia, storeProducts } from "@verella/db";
import { removeBackground } from "./background-removal";
import { composeStyledImage } from "./styled-image";
import { isStorageConfigured, uploadStream } from "./cloudinary";

/** Media made by this module: folder "styled", title "styled-of:<source media id>". */
const STYLED_FOLDER = "styled";
const styledTitle = (sourceId: number) => `styled-of:${sourceId}`;

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
export async function ensureStyledProductImage(productId: number): Promise<void> {
  if (running.has(productId)) return;
  running.add(productId);
  try {
    if (!isStorageConfigured()) return;

    const [product] = await db.select({ slug: storeProducts.slug }).from(storeProducts).where(eq(storeProducts.id, productId)).limit(1);
    const [main] = await db
      .select({ mediaId: media.id, url: media.url, folder: media.folder, isPrivate: media.isPrivate })
      .from(storeProductMedia)
      .innerJoin(media, eq(media.id, storeProductMedia.mediaId))
      .where(eq(storeProductMedia.productId, productId))
      .orderBy(asc(storeProductMedia.sortOrder))
      .limit(1);
    // Already styled: made by this module, or a launch-catalog "…/styled.webp".
    if (!product || !main || !main.url || main.isPrivate || main.folder === STYLED_FOLDER || /\/styled\.[a-z]+$/i.test(main.url)) return;

    let [styled] = await db
      .select({ id: media.id })
      .from(media)
      .where(and(eq(media.folder, STYLED_FOLDER), eq(media.title, styledTitle(main.mediaId))))
      .limit(1);

    if (!styled) {
      const started = Date.now();
      const cutout = await removeBackground(await readSource(main.url));
      const { buffer } = await composeStyledImage(cutout, { seed: product.slug });
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
          title: styledTitle(main.mediaId),
          folder: STYLED_FOLDER,
          isPrivate: false,
        })
        .$returningId();
      styled = row;
      console.info(`[styled-image] product ${productId}: made in ${((Date.now() - started) / 1000).toFixed(0)}s`);
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
