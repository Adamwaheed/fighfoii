import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone traces only what the server actually needs, which matters on a
  // memory-constrained box shared with other apps.
  output: "standalone",
  // better-sqlite3 is a native addon; it must not be bundled into the server build.
  serverExternalPackages: ["better-sqlite3", "sharp"],
  // The SQLite file lives under data/ and must never be traced into the build.
  // Shipping it would put live content in a deploy artifact and let a later
  // deploy overwrite the server's database with a stale local copy.
  outputFileTracingExcludes: {
    "*": ["./data/**", "./.next/cache/**"],
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
};

export default nextConfig;
