"use server";

import { z } from "zod";
import { sendEmail } from "@/lib/email/mailer";
import { getNotificationEmail } from "@/lib/settings/queries";
import { enforceRateLimit } from "@/lib/rate-limit";
import type { ActionResult } from "@/lib/auth/rbac";

const contactSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name.").max(120),
  email: z.string().trim().email("Please enter a valid email address."),
  subject: z.string().trim().min(3, "Please enter a subject.").max(150),
  message: z.string().trim().min(10, "Please write a message (at least 10 characters).").max(5000),
});

export async function sendContactMessageAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = contactSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  const { name, email, subject, message } = parsed.data;

  // 5 messages / 10 min per IP keeps the inbox usable if a bot finds the form.
  const limited = await enforceRateLimit("contact", 5, 10 * 60 * 1000);
  if (!limited.ok) return { error: limited.error };

  const to = await getNotificationEmail();
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  try {
    await sendEmail({
      to,
      subject: `Contact form: ${subject}`,
      text: `From: ${name} <${email}>\n\n${message}`,
      html: `<p><strong>From:</strong> ${esc(name)} &lt;${esc(email)}&gt;</p><p style="white-space:pre-wrap">${esc(message)}</p>`,
    });
  } catch (err) {
    console.error("Contact form send failed:", err);
    return { error: "We couldn't send your message right now — please try again shortly." };
  }

  return { success: true };
}
