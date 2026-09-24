import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  output: "standalone",
  // Next 16 blocks cross-origin requests for dev assets (/_next/*) by
  // default. Phones on the LAN load the page HTML but get no JS — buttons
  // (hamburger, add-to-cart) silently die. Allow common private-network
  // origins so testing on a real device against `next dev` works.
  allowedDevOrigins: ["192.168.1.5", "192.168.0.*", "192.168.1.*", "10.0.0.*", "*.local"],
  // Monorepo: trace files from the workspace root, not just this app,
  // so packages/db and packages/core are included in the standalone build.
  outputFileTracingRoot: path.join(__dirname, "../.."),
  // nodemailer uses dynamic requires; keep it a native require so Next's
  // standalone file tracer doesn't choke on it.
  serverExternalPackages: ["nodemailer"],
  poweredByHeader: false,
  async headers() {
    const security = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), interest-cohort=()" },
      // Framing, plugins and <base> hijacking are shut off. Scripts aren't
      // restricted here: Next's inline bootstrap needs nonces for that, which
      // would force every page to render dynamically.
      { key: "Content-Security-Policy", value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'" },
    ];
    // HSTS only in production — on localhost it would pin the browser to https.
    if (process.env.NODE_ENV === "production") {
      security.push({ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" });
    }
    return [{ source: "/:path*", headers: security }];
  },
  images: {
    remotePatterns: [
      // Product and category photos uploaded through the dashboard.
      { protocol: "https", hostname: "res.cloudinary.com" },
      // Demo placeholder photography (seeded products/categories) until real
      // photos are uploaded — picsum redirects to its fastly CDN host.
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "fastly.picsum.photos" },
    ],
  },
};

export default nextConfig;
