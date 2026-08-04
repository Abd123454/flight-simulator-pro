import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  // Allow preview panel domains to load dev resources (chunks, HMR).
  allowedDevOrigins: [
    "*.space-z.ai",
    "space-z.ai",
    "localhost",
    "127.0.0.1",
  ],
  // Enable tree-shaking for Three.js (was importing ~600KB as one chunk)
  experimental: {
    optimizePackageImports: ["three"],
  },
  // Security headers (OWASP recommendations)
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
