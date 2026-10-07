/**
 * Runs once when the Next.js server starts (see Next's instrumentation guide).
 * Node-only setup lives in instrumentation-node.ts, imported only on the Node
 * runtime so the Edge build never pulls in node:fs / node:tls.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./instrumentation-node");
  }
}
