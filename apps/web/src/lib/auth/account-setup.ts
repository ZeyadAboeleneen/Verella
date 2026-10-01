import "server-only";
import crypto from "node:crypto";
import { db, passwordResets } from "@verella/db";

/** Setup links go out with an order; give the customer time to get to it. */
const SETUP_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * One-time "create your password" link for an account auto-created at
 * checkout. Reuses the password-reset tokens (stored hashed, single use, and
 * consumed by resetPasswordAction), so only whoever receives the link — on the
 * order's WhatsApp or email — can claim the account and see its orders.
 * Older links stay valid (the email and the WhatsApp confirmation each carry
 * one); setting the password through any of them voids the rest.
 */
export async function createAccountSetupUrl(userId: number, baseUrl: string, locale: "ar" | "en" = "ar"): Promise<string> {
  const rawToken = crypto.randomBytes(32).toString("hex");
  await db.insert(passwordResets).values({
    userId,
    token: crypto.createHash("sha256").update(rawToken).digest("hex"),
    expiresAt: new Date(Date.now() + SETUP_TTL_MS),
  });
  return `${baseUrl.replace(/\/$/, "")}/${locale}/reset-password?token=${rawToken}&setup=1`;
}
