import "server-only";
import { S3Client, DeleteObjectCommand, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const credentials = {
  accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
  secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
};

// Treat empty-string env vars the same as unset. An empty `endpoint: ""` makes
// the AWS SDK throw "Expected a non-empty string" at client construction —
// which happens at module load (build time), breaking `next build` when S3
// isn't configured yet. `|| undefined` lets it degrade gracefully instead.
const internalEndpoint = process.env.S3_ENDPOINT || undefined;
const publicEndpoint = process.env.S3_PUBLIC_ENDPOINT || undefined;

/** Used for direct server-side operations (delete, etc.) — the Docker-internal MinIO address. */
export const s3Internal = new S3Client({
  region: "us-east-1",
  endpoint: internalEndpoint,
  forcePathStyle: true,
  credentials,
});

/**
 * Used ONLY to sign URLs handed to the browser (presigned PUT for uploads,
 * presigned GET for private objects) — must be the externally-reachable
 * endpoint (proxied by docker/nginx.conf's /s3/ block) or the signature
 * won't match what the browser actually calls.
 */
const s3Public = new S3Client({
  region: "us-east-1",
  endpoint: publicEndpoint,
  forcePathStyle: true,
  credentials,
});

export const PUBLIC_BUCKET = process.env.S3_PUBLIC_BUCKET ?? "verella-public";
export const PRIVATE_BUCKET = process.env.S3_PRIVATE_BUCKET ?? "verella-private";

/**
 * Before this was added, an unconfigured S3/MinIO setup made uploads fail
 * with an opaque AWS SDK connection error deep in a presign call. Check this
 * first and surface a clear message instead (see media/actions.ts, payments/actions.ts).
 */
export function isStorageConfigured(): boolean {
  return Boolean(internalEndpoint && publicEndpoint && process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY);
}

export const STORAGE_NOT_CONFIGURED_ERROR =
  "File storage isn't configured yet. An admin needs to set up MinIO/S3 (see docs/SETUP.md) before uploads will work.";

export function publicMediaUrl(objectKey: string): string {
  const base = (process.env.S3_PUBLIC_MEDIA_BASE_URL ?? "").replace(/\/$/, "");
  return `${base}/${objectKey}`;
}

export async function createPresignedUploadUrl(bucket: string, objectKey: string, contentType: string) {
  const command = new PutObjectCommand({ Bucket: bucket, Key: objectKey, ContentType: contentType });
  return getSignedUrl(s3Public, command, { expiresIn: 300 });
}

export async function createPresignedGetUrl(bucket: string, objectKey: string, expiresIn = 300) {
  const command = new GetObjectCommand({ Bucket: bucket, Key: objectKey });
  return getSignedUrl(s3Public, command, { expiresIn });
}

export async function deleteObject(bucket: string, objectKey: string) {
  await s3Internal.send(new DeleteObjectCommand({ Bucket: bucket, Key: objectKey }));
}

/** Reads just the first `maxBytes` of an object — enough to sniff a magic-byte signature without downloading the whole file. */
export async function readObjectHeadBytes(bucket: string, objectKey: string, maxBytes = 16): Promise<Buffer> {
  const command = new GetObjectCommand({ Bucket: bucket, Key: objectKey, Range: `bytes=0-${maxBytes - 1}` });
  const result = await s3Internal.send(command);
  const body = await result.Body?.transformToByteArray();
  return Buffer.from(body ?? []);
}

export function objectKeyFor(folder: string | undefined, filename: string): string {
  const ext = filename.includes(".") ? filename.split(".").pop() : undefined;
  const base = crypto.randomUUID();
  return [folder, ext ? `${base}.${ext}` : base].filter(Boolean).join("/");
}
