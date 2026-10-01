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

/**
 * SMTP_URL, or Gmail via GMAIL_USER + GMAIL_APP_PASSWORD (a Google "App
 * password"; the spaces Google shows it with are ignored).
 */
function smtpTransport(): string | { host: string; port: number; secure: false; auth: { user: string; pass: string } } | null {
  if (process.env.SMTP_URL) return process.env.SMTP_URL;
  const user = process.env.GMAIL_USER?.trim();
  const pass = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, "");
  // 587 + STARTTLS: works everywhere, including behind antivirus mail shields
  // that drop implicit-TLS port 465.
  return user && pass ? { host: "smtp.gmail.com", port: 587, secure: false, auth: { user, pass } } : null;
}

export function isEmailConfigured(): boolean {
  return smtpTransport() !== null;
}

export async function sendEmail({ to, subject, html, text }: SendEmailParams): Promise<void> {
  // Gmail only sends as the signed-in address, so default to it.
  const gmailUser = process.env.GMAIL_USER?.trim();
  const from = process.env.EMAIL_FROM || (gmailUser ? `Verella <${gmailUser}>` : "Verella <no-reply@localhost>");

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
  const smtp = smtpTransport()!;
  // Antivirus "mail shields" (e.g. Avast) re-sign SMTP traffic with their own
  // root certificate. SMTP_EXTRA_CA_FILE lets a dev machine trust that root on
  // top of the normal ones — verification stays on. Unset on servers.
  const extraCa = process.env.SMTP_EXTRA_CA_FILE?.trim();
  const tls = extraCa
    ? { ca: [...(await import("node:tls")).rootCertificates, (await import("node:fs")).readFileSync(extraCa, "utf8")] }
    : undefined;
  const transport = nodemailer.createTransport({ ...(typeof smtp === "string" ? { url: smtp } : smtp), ...(tls && { tls }) });
  await transport.sendMail({ from, to, subject, html, text });
}
