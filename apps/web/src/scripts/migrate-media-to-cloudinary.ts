/**
 * One-off migration: moves every `media` row not already on Cloudinary
 * (disk = 'external' seed/placeholder images, or disk = 'minio' real
 * uploads) onto Cloudinary, updating each row in place so every foreign key
 * (menu items, categories, product galleries, hero images, banners, payment
 * proofs) keeps working unchanged.
 *
 * Self-contained (doesn't import ../lib/media/cloudinary.ts or s3.ts, which
 * both `import "server-only"` — a compile-time guard that only resolves
 * correctly inside Next.js's own bundler, and throws under plain Node/tsx).
 *
 * Usage:
 *   npx tsx src/scripts/migrate-media-to-cloudinary.ts --dry-run   (preview only)
 *   npx tsx src/scripts/migrate-media-to-cloudinary.ts             (apply)
 *
 * Idempotent — rows already on disk = 'cloudinary' are skipped, so it's safe
 * to re-run (e.g. after fixing a one-off failure) without re-uploading
 * everything.
 */
import { config } from "dotenv";
import path from "node:path";
config({ path: path.resolve(__dirname, "../../.env.local") });

import { eq } from "drizzle-orm";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { v2 as cloudinary } from "cloudinary";
import { db, media } from "@verella/db";

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME ?? "";
cloudinary.config({
  cloud_name: CLOUD_NAME || undefined,
  api_key: process.env.CLOUDINARY_API_KEY || undefined,
  api_secret: process.env.CLOUDINARY_API_SECRET || undefined,
  secure: true,
});

const s3 = new S3Client({
  region: "us-east-1",
  endpoint: process.env.S3_ENDPOINT || undefined,
  forcePathStyle: true,
  credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "", secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "" },
});

const DRY_RUN = process.argv.includes("--dry-run");

function deliveryUrl(publicId: string): string {
  return cloudinary.url(publicId, { secure: true, fetch_format: "auto", quality: "auto" });
}

async function main() {
  if (!CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    console.error("Cloudinary is not configured (CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET). Aborting.");
    process.exit(1);
  }

  const rows = await db.select().from(media);
  const pending = rows.filter((r) => r.disk !== "cloudinary");
  console.log(`${rows.length} total media rows, ${pending.length} to migrate.${DRY_RUN ? " (dry run — no changes will be written)" : ""}`);

  let migrated = 0;
  let failed = 0;

  for (const row of pending) {
    try {
      let result: { public_id: string; format: string; bytes: number; width?: number; height?: number };
      const folder = row.folder || "migrated";
      const type = row.isPrivate ? "authenticated" : "upload";

      if (row.disk === "external") {
        console.log(`[${row.id}] external -> Cloudinary (fetch by URL): ${row.url.slice(0, 80)}...`);
        if (DRY_RUN) {
          migrated++;
          continue;
        }
        result = await cloudinary.uploader.upload(row.url, { folder, type, resource_type: "image" });
      } else if (row.disk === "minio") {
        if (!process.env.S3_ENDPOINT) {
          console.warn(`[${row.id}] disk='minio' but S3_ENDPOINT isn't configured in this environment — skipping.`);
          failed++;
          continue;
        }
        console.log(`[${row.id}] minio -> Cloudinary (stream): ${row.bucket}/${row.objectKey}`);
        if (DRY_RUN) {
          migrated++;
          continue;
        }
        const obj = await s3.send(new GetObjectCommand({ Bucket: row.bucket, Key: row.objectKey }));
        const stream = obj.Body as unknown as NodeJS.ReadableStream;
        result = await new Promise((resolve, reject) => {
          const upload = cloudinary.uploader.upload_stream({ folder, type, resource_type: "image" }, (error, res) => {
            if (error || !res) return reject(error ?? new Error("Cloudinary upload failed with no result."));
            resolve(res);
          });
          stream.pipe(upload);
        });
      } else {
        console.warn(`[${row.id}] unrecognized disk '${row.disk}' — skipping.`);
        failed++;
        continue;
      }

      const format = result.format.toLowerCase() === "jpg" ? "jpeg" : result.format.toLowerCase();
      await db
        .update(media)
        .set({
          disk: "cloudinary",
          bucket: CLOUD_NAME,
          objectKey: result.public_id,
          url: row.isPrivate ? "" : deliveryUrl(result.public_id),
          mime: `image/${format}`,
          width: result.width ?? row.width,
          height: result.height ?? row.height,
          sizeBytes: result.bytes,
        })
        .where(eq(media.id, row.id));

      console.log(`[${row.id}] done -> ${result.public_id}`);
      migrated++;
    } catch (err) {
      console.error(`[${row.id}] FAILED:`, err instanceof Error ? err.message : err);
      failed++;
    }
  }

  console.log(`\nDone. Migrated: ${migrated}, failed: ${failed}, already on Cloudinary: ${rows.length - pending.length}.`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
