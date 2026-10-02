/**
 * Runs once when the Next.js server starts (see Next's instrumentation guide).
 *
 * EXTRA_CA_FILE: trust one extra root certificate for every outgoing HTTPS
 * request the server makes — image optimisation (Cloudinary), email (Gmail),
 * model downloads, etc. For dev machines where antivirus (e.g. Avast's
 * Web/Mail Shield) re-signs HTTPS traffic with its own root. The normal
 * public roots stay trusted and verification stays on. Leave unset on servers.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const file = process.env.EXTRA_CA_FILE?.trim() || process.env.SMTP_EXTRA_CA_FILE?.trim();
  if (!file) return;
  const [{ readFileSync }, tlsModule] = await Promise.all([import("node:fs"), import("node:tls")]);
  // Node ≥ 22.15 / 23.5 APIs; the project's @types/node (20) doesn't declare them yet.
  const tls = tlsModule as unknown as {
    getCACertificates(type: "default"): string[];
    setDefaultCACertificates(certs: string[]): void;
  };
  if (typeof tls.setDefaultCACertificates !== "function") {
    console.warn("[tls] EXTRA_CA_FILE needs Node 22.15+ — ignored.");
    return;
  }
  try {
    tls.setDefaultCACertificates([...tls.getCACertificates("default"), readFileSync(file, "utf8")]);
    console.info(`[tls] Trusting extra root certificate from ${file}`);
  } catch (err) {
    console.error(`[tls] Couldn't load EXTRA_CA_FILE ${file}:`, err);
  }
}
