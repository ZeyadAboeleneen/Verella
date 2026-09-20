"use client";

// Only catches errors thrown by the root layout itself (e.g. a failed
// getDict()/getSessionUser() call) — error.tsx above handles everything else.
// Must render its own <html>/<body> since it replaces the root layout.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "sans-serif" }}>
        <div style={{ maxWidth: 480, margin: "15vh auto", padding: 20, textAlign: "center" }}>
          <h1 style={{ fontSize: 28, fontWeight: 700 }}>Something went wrong</h1>
          <p style={{ marginTop: 12, color: "#555" }}>
            Sorry about that — please try reloading the page.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 24,
              padding: "12px 24px",
              borderRadius: 999,
              background: "#000",
              color: "#fff",
              fontSize: 12,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              border: "none",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
