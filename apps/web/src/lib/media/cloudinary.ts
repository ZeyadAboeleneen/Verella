import "server-only";
import { v2 as cloudinary } from "cloudinary";

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME ?? "";
const API_KEY = process.env.CLOUDINARY_API_KEY ?? "";
const API_SECRET = process.env.CLOUDINARY_API_SECRET ?? "";

cloudinary.config({
  cloud_name: CLOUD_NAME || undefined,
  api_key: API_KEY || undefined,
  api_secret: API_SECRET || undefined,
  secure: true,
});

/**
 * Before this was added, an unconfigured Cloudinary account made uploads fail
 * with an opaque SDK error deep in a signing call. Check this first and
 * surface a clear message instead (see media/actions.ts, payments/actions.ts).
 */
export function isStorageConfigured(): boolean {
  return Boolean(CLOUD_NAME && API_KEY && API_SECRET);
}

export const STORAGE_NOT_CONFIGURED_ERROR =
  "File storage isn't configured yet. An admin needs to set up Cloudinary (see docs/SETUP.md) before uploads will work.";

export const CLOUDINARY_CLOUD_NAME = CLOUD_NAME;

export interface SignedUploadParams {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  type: "upload" | "authenticated";
  uploadUrl: string;
  /** Incoming (upload-time) transformation, if any — the client must send this exact string back with the upload, since it's part of the signature. */
  transformation?: string;
}

/**
 * Caps the *stored* asset's dimensions/quality at upload time (an "incoming"
 * transformation, not an eager/derived one) — phone screenshots routinely
 * come in at 3000px+ and several MB, which is wasted storage for something
 * only ever viewed at thumbnail/lightbox size in the admin review queue.
 * c_limit never upscales smaller images.
 */
const PAYMENT_PROOF_TRANSFORMATION = "c_limit,w_1600,h_1600,q_auto:good,f_auto";

/**
 * Cloudinary's signed-upload flow: the browser POSTs the file directly to
 * Cloudinary (never through our server), authorized by a short-lived
 * signature we compute here with the API secret. Mirrors the old S3
 * presigned-PUT pattern — same "server authorizes, browser uploads directly"
 * shape, just a different signing scheme.
 *
 * `folder`, `type`, and `transformation` must exactly match what the client
 * sends in the upload request — Cloudinary's signature covers every param
 * except `file`, `cloud_name`, `resource_type`, and `api_key`.
 */
export function createSignedUploadParams(folder: string, isPrivate: boolean, transformation?: string): SignedUploadParams {
  const timestamp = Math.round(Date.now() / 1000);
  const type = isPrivate ? "authenticated" : "upload";
  const paramsToSign: Record<string, string | number> = { folder, timestamp, type };
  if (transformation) paramsToSign.transformation = transformation;
  const signature = cloudinary.utils.api_sign_request(paramsToSign, API_SECRET);

  return {
    cloudName: CLOUD_NAME,
    apiKey: API_KEY,
    timestamp,
    signature,
    folder,
    type,
    transformation,
    uploadUrl: `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
  };
}

export function createPaymentProofUploadParams(): SignedUploadParams {
  return createSignedUploadParams("payment-proofs", true, PAYMENT_PROOF_TRANSFORMATION);
}

/** Public delivery URL with automatic format + quality baked in — no per-callsite changes needed anywhere images are rendered. */
export function deliveryUrl(publicId: string): string {
  return cloudinary.url(publicId, {
    secure: true,
    fetch_format: "auto",
    quality: "auto",
  });
}

/**
 * Signed URL for a private ("authenticated" delivery type) asset — the
 * payment-proof equivalent of the old presigned S3 GET. Note: unlike the S3
 * version this doesn't expire after a few minutes (that needs Cloudinary's
 * token-auth add-on, an extra account setting) — it's still non-public and
 * unguessable without the API secret, and is only ever handed to admins
 * already gated by the payments.review permission, so the risk profile is
 * equivalent for this use case.
 */
export function authenticatedDeliveryUrl(publicId: string): string {
  return cloudinary.url(publicId, {
    secure: true,
    type: "authenticated",
    sign_url: true,
    fetch_format: "auto",
    quality: "auto",
  });
}

export async function destroyAsset(publicId: string, isPrivate: boolean): Promise<void> {
  await cloudinary.uploader.destroy(publicId, {
    type: isPrivate ? "authenticated" : "upload",
    resource_type: "image",
  });
}

/** Uploads from a readable stream (used by the one-off MinIO -> Cloudinary migration script). */
export async function uploadStream(
  stream: NodeJS.ReadableStream,
  options: { folder: string; isPrivate: boolean },
): Promise<{ publicId: string; url: string; format: string; bytes: number; width?: number; height?: number }> {
  return new Promise((resolve, reject) => {
    const upload = cloudinary.uploader.upload_stream(
      { folder: options.folder, type: options.isPrivate ? "authenticated" : "upload", resource_type: "image" },
      (error, result) => {
        if (error || !result) return reject(error ?? new Error("Cloudinary upload failed with no result."));
        resolve({
          publicId: result.public_id,
          url: options.isPrivate ? "" : deliveryUrl(result.public_id),
          format: result.format,
          bytes: result.bytes,
          width: result.width,
          height: result.height,
        });
      },
    );
    stream.pipe(upload);
  });
}

/** Uploads by remote URL — Cloudinary fetches the bytes itself, no download needed on our side (used for migrating existing external/placeholder images). */
export async function uploadFromUrl(
  remoteUrl: string,
  options: { folder: string; isPrivate: boolean },
): Promise<{ publicId: string; url: string; format: string; bytes: number; width?: number; height?: number }> {
  const result = await cloudinary.uploader.upload(remoteUrl, {
    folder: options.folder,
    type: options.isPrivate ? "authenticated" : "upload",
    resource_type: "image",
  });
  return {
    publicId: result.public_id,
    url: options.isPrivate ? "" : deliveryUrl(result.public_id),
    format: result.format,
    bytes: result.bytes,
    width: result.width,
    height: result.height,
  };
}
