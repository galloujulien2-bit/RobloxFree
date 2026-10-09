import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  devIndicators: false,
  allowedDevOrigins: [
    "*.space-z.ai",
    "*.preview-chat-*.space-z.ai",
    "localhost",
    "127.0.0.1",
  ],
};

export default nextConfig;
