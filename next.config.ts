import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  // Allow preview panel domains to load dev resources (chunks, HMR).
  // Next.js 16 blocks cross-origin dev requests by default for security.
  // The preview chat ID changes per session, so allow all space-z.ai subdomains.
  allowedDevOrigins: [
    "*.space-z.ai",
    "space-z.ai",
    "localhost",
    "127.0.0.1",
  ],
};

export default nextConfig;
