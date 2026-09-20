import "server-only";

/**
 * Minimal email abstraction. Sends via SMTP (nodemailer) when SMTP_URL is
 * configured; otherwise logs the message to the server console so flows like
 * password reset work end-to-end during development / before email infra is
 * wired up.
 *
 * To enable real email, set in the environment:
 *   SMTP_URL=smtp://user:pass@smtp.host:587      (or smtps://… for implicit TLS)
 *   EMAIL_FROM="Verella <no-reply@your-domain.com>"
 */

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.SMTP_URL);
}

export async function sendEmail({ to, subject, html, text }: SendEmailParams): Promise<void> {
  const from = process.env.EMAIL_FROM ?? "Verella <no-reply@localhost>";

  if (!isEmailConfigured()) {
    // Dev / not-yet-configured fallback: surface the message in server logs.
    console.warn(
      [
        "",
        "──────────────────────────────────────────────────────────────",
        "  EMAIL NOT SENT — SMTP_URL is not configured.",
        "  Logging the message below so the flow still works locally.",
        "──────────────────────────────────────────────────────────────",
        `  To:      ${to}`,
        `  From:    ${from}`,
        `  Subject: ${subject}`,
        "",
        text,
        "──────────────────────────────────────────────────────────────",
        "",
      ].join("\n"),
    );
    return;
  }

  // Dynamic import keeps nodemailer out of bundles when unused.
  const nodemailer = await import("nodemailer");
  const transport = nodemailer.createTransport(process.env.SMTP_URL);
  await transport.sendMail({ from, to, subject, html, text });
}
