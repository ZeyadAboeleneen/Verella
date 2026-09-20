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
  images: {
    remotePatterns: [
      // All media now lives on Cloudinary.
      { protocol: "https", hostname: "res.cloudinary.com" },
      // Legacy: any pre-migration seed data / self-hosted MinIO media still
      // referencing these hosts. Safe to remove once the Cloudinary media
      // migration is confirmed complete and no `media` rows point here anymore.
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      {
        protocol: process.env.MINIO_USE_SSL === "true" ? "https" : "http",
        hostname: process.env.MINIO_PUBLIC_HOSTNAME || "localhost",
      },
    ],
  },
};

export default nextConfig;
