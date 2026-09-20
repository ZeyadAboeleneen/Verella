"use server";

import crypto from "node:crypto";
import { and, eq, isNull, gt } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db, users, passwordResets } from "@verella/db";
import { requestPasswordResetSchema, resetPasswordSchema } from "@verella/core";
import type { ActionResult } from "./rbac";
import { sendEmail } from "@/lib/email/mailer";
import { enforceRateLimit } from "@/lib/rate-limit";

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

/** Reset tokens are stored hashed so a DB leak can't be used to reset passwords. */
function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

function appBaseUrl(): string {
  return (process.env.AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

/**
 * Always resolves to the same generic success — never reveals whether an email
 * is registered (prevents account enumeration). A real reset link is only
 * created + sent when an active account actually exists.
 */
export async function requestPasswordResetAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = requestPasswordResetSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Enter a valid email." };

  // 5 requests / hour per IP+email — resets are infrequent by nature; keeps
  // this from being used to spam an inbox or brute-force account enumeration timing.
  const limited = await enforceRateLimit("password-reset-request", 5, 60 * 60 * 1000, parsed.data.email);
  if (!limited.ok) return { error: limited.error };

  const email = parsed.data.email.toLowerCase();
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

  if (user && user.status === "active") {
    // Invalidate any outstanding reset tokens for this user before issuing a new one.
    await db.delete(passwordResets).where(eq(passwordResets.userId, user.id));

    const rawToken = crypto.randomBytes(32).toString("hex");
    await db.insert(passwordResets).values({
      userId: user.id,
      token: hashToken(rawToken),
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
    });

    const resetUrl = `${appBaseUrl()}/reset-password?token=${rawToken}`;
    await sendEmail({
      to: user.email,
      subject: "Reset your Verella password",
      text: `Hello ${user.fullName},\n\nWe received a request to reset your password. Use the link below within the next hour:\n\n${resetUrl}\n\nIf you didn't request this, you can safely ignore this email.`,
      html: `<p>Hello ${user.fullName},</p><p>We received a request to reset your password. Use the link below within the next hour:</p><p><a href="${resetUrl}">Reset your password</a></p><p>If you didn't request this, you can safely ignore this email.</p>`,
    });
  }

  return { success: true };
}

export async function resetPasswordAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  // Tokens are 32 random bytes (unguessable) — this is defense-in-depth
  // against automated scanning, not the primary protection.
  const limited = await enforceRateLimit("password-reset-submit", 20, 10 * 60 * 1000);
  if (!limited.ok) return { error: limited.error };

  const { token, newPassword } = parsed.data;
  const tokenHash = hashToken(token);

  const [row] = await db
    .select()
    .from(passwordResets)
    .where(and(eq(passwordResets.token, tokenHash), isNull(passwordResets.usedAt), gt(passwordResets.expiresAt, new Date())))
    .limit(1);

  if (!row) return { error: "This reset link is invalid or has expired. Please request a new one." };

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await db.transaction(async (tx) => {
    await tx.update(users).set({ passwordHash }).where(eq(users.id, row.userId));
    await tx.update(passwordResets).set({ usedAt: new Date() }).where(eq(passwordResets.id, row.id));
    // Drop any other outstanding tokens for this user.
    await tx.delete(passwordResets).where(and(eq(passwordResets.userId, row.userId), isNull(passwordResets.usedAt)));
  });

  return { success: true };
}
