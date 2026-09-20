"use server";

import crypto from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { db, users, verificationTokens } from "@verella/db";
import type { ActionResult } from "./rbac";
import { getSessionUser } from "./rbac";
import { sendEmail } from "@/lib/email/mailer";
import { enforceRateLimit } from "@/lib/rate-limit";

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function appBaseUrl(): string {
  return (process.env.AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

/** Fire-and-forget from registerAction — a delivery failure shouldn't block account creation. */
export async function sendVerificationEmail(userId: number, email: string, fullName: string): Promise<void> {
  await db.delete(verificationTokens).where(eq(verificationTokens.identifier, email));

  const rawToken = crypto.randomBytes(32).toString("hex");
  await db.insert(verificationTokens).values({
    identifier: email,
    token: rawToken,
    expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
  });

  const verifyUrl = `${appBaseUrl()}/verify-email?token=${rawToken}`;
  await sendEmail({
    to: email,
    subject: "Verify your Verella email",
    text: `Hello ${fullName},\n\nWelcome to Verella. Please verify your email address using the link below (valid for 24 hours):\n\n${verifyUrl}`,
    html: `<p>Hello ${fullName},</p><p>Welcome to Verella. Please verify your email address using the link below (valid for 24 hours):</p><p><a href="${verifyUrl}">Verify my email</a></p>`,
  });
}

export async function verifyEmailAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const token = String(formData.get("token") ?? "");
  if (!token) return { error: "Verification link is missing a token." };

  const [row] = await db
    .select()
    .from(verificationTokens)
    .where(and(eq(verificationTokens.token, token), gt(verificationTokens.expiresAt, new Date())))
    .limit(1);

  if (!row) return { error: "This verification link is invalid or has expired." };

  await db.transaction(async (tx) => {
    await tx.update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.email, row.identifier));
    await tx.delete(verificationTokens).where(eq(verificationTokens.token, token));
  });

  return { success: true };
}

/** Lets a signed-in user with an unverified email request a fresh link — e.g. if the first one expired. */
export async function resendVerificationEmailAction(): Promise<ActionResult> {
  const sessionUser = await getSessionUser();
  if (!sessionUser?.email) return { error: "You must be signed in." };

  const limited = await enforceRateLimit("resend-verification", 3, 15 * 60 * 1000, sessionUser.email);
  if (!limited.ok) return { error: limited.error };

  const [user] = await db.select().from(users).where(eq(users.email, sessionUser.email)).limit(1);
  if (!user) return { error: "Account not found." };
  if (user.emailVerifiedAt) return { success: true };

  await sendVerificationEmail(user.id, user.email, user.fullName);
  return { success: true };
}
