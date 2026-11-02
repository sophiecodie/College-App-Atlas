import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Lets a production build run beside `next dev` without sharing its output folder.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  // Loaded at runtime (local dev database only), never bundled.
  serverExternalPackages: ["@electric-sql/pglite"],
  outputFileTracingRoot: path.join(__dirname, ".."),
  // The refresh endpoint re-reads curated manifests from disk.
  outputFileTracingIncludes: {
    "/api/cron/admissions-refresh": ["./data/admissions/**/*"],
  },
};

export default nextConfig;
