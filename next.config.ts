import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Silence Next.js dev warning when opening the dev server from a phone on LAN
  allowedDevOrigins: ["http://localhost:3000", "http://192.168.86.22:3000"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.r2.dev",
      },
      {
        protocol: "https",
        hostname: "pub-*.r2.dev",
      },
    ],
  },
};

export default nextConfig;


