"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db, payments, media } from "@verella/db";
import { presignUploadSchema } from "@verella/core";
import { createPaymentProofUploadParams, isStorageConfigured, STORAGE_NOT_CONFIGURED_ERROR, type SignedUploadParams } from "@/lib/media/cloudinary";
import { getOwnedOrder } from "@/lib/orders/queries";
import type { ActionResult } from "@/lib/auth/rbac";
import { enforceRateLimit } from "@/lib/rate-limit";

export async function presignPaymentProofUploadAction(
  orderNumber: string,
  input: { filename: string; mime: string; sizeBytes: number },
): Promise<ActionResult<SignedUploadParams>> {
  // 10 upload attempts per 10 minutes per IP — generous for a legitimate
  // customer retrying a bad screenshot, tight enough to blunt abuse.
  const limited = await enforceRateLimit("payment-proof-upload", 10, 10 * 60 * 1000);
  if (!limited.ok) return { error: limited.error };

  if (!isStorageConfigured()) return { error: STORAGE_NOT_CONFIGURED_ERROR };

  const order = await getOwnedOrder(orderNumber);
  if (!order) return { error: "Order not found." };

  const parsed = presignUploadSchema.safeParse({ ...input, isPrivate: true, folder: "payment-proofs" });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid file." };

  const params = createPaymentProofUploadParams();
  return { success: true, data: params };
}

/**
 * Pre-checkout variant of the two actions above: the order doesn't exist yet
 * at the point the customer picks InstaPay and uploads their screenshot, so
 * there's no orderNumber to tie the upload to. The media row created here is
 * handed to placeOrderAction as paymentProofMediaId once the order is placed.
 */
export async function presignCheckoutPaymentProofUploadAction(input: {
  filename: string;
  mime: string;
  sizeBytes: number;
}): Promise<ActionResult<SignedUploadParams>> {
  const limited = await enforceRateLimit("payment-proof-upload", 10, 10 * 60 * 1000);
  if (!limited.ok) return { error: limited.error };

  if (!isStorageConfigured()) return { error: STORAGE_NOT_CONFIGURED_ERROR };

  const parsed = presignUploadSchema.safeParse({ ...input, isPrivate: true, folder: "payment-proofs" });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid file." };

  const params = createPaymentProofUploadParams();
  return { success: true, data: params };
}

export async function confirmCheckoutPaymentProofAction(input: {
  publicId: string;
  format: string;
  width?: number;
  height?: number;
  bytes: number;
}): Promise<ActionResult<{ mediaId: number }>> {
  const [mediaRow] = await db
    .insert(media)
    .values({
      disk: "cloudinary",
      bucket: process.env.CLOUDINARY_CLOUD_NAME ?? "",
      objectKey: input.publicId,
      url: "",
      mime: `image/${input.format.toLowerCase() === "jpg" ? "jpeg" : input.format.toLowerCase()}`,
      width: input.width,
      height: input.height,
      sizeBytes: input.bytes,
      isPrivate: true,
      folder: "payment-proofs",
    })
    .$returningId();

  return { success: true, data: { mediaId: mediaRow.id } };
}

export async function confirmPaymentProofAction(
  orderNumber: string,
  input: { publicId: string; format: string; width?: number; height?: number; bytes: number },
): Promise<ActionResult> {
  const order = await getOwnedOrder(orderNumber);
  if (!order) return { error: "Order not found." };

  const [payment] = await db.select().from(payments).where(eq(payments.orderId, order.id)).limit(1);
  if (!payment) return { error: "Payment record not found." };

  const [mediaRow] = await db
    .insert(media)
    .values({
      disk: "cloudinary",
      bucket: process.env.CLOUDINARY_CLOUD_NAME ?? "",
      objectKey: input.publicId,
      url: "",
      mime: `image/${input.format.toLowerCase() === "jpg" ? "jpeg" : input.format.toLowerCase()}`,
      width: input.width,
      height: input.height,
      sizeBytes: input.bytes,
      isPrivate: true,
      folder: "payment-proofs",
    })
    .$returningId();

  await db
    .update(payments)
    .set({ status: "submitted", proofMediaId: mediaRow.id })
    .where(and(eq(payments.id, payment.id)));

  revalidatePath(`/order/${orderNumber}`);
  revalidatePath("/admin/payments");
  return { success: true };
}
