import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Keep the dev badge off the admin forms' Save button on phones.
  devIndicators: { position: "bottom-right" },
  // Required for the slim Docker image used on Coolify (section 12).
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    // Uploads are served from our own /uploads route, so no remote patterns
    // are needed yet. Keep webp/avif conversion on.
    formats: ["image/webp"],
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  experimental: {
    // sharp is used by the upload pipeline, keep it external to the bundle.
    serverActions: {
      bodySizeLimit: "12mb",
    },
  },
};

export default withNextIntl(nextConfig);
