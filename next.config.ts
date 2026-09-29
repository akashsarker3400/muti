import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/**
 * Security headers on every response.
 *
 * The CSP is deliberately not `script-src 'self'` only: Next injects inline
 * bootstrap scripts, and the YouTube and Turnstile embeds need their own
 * origins. What it does buy is a real `frame-ancestors` (clickjacking on the
 * admin panel), a locked-down `form-action` (a exfiltrating form injected into
 * content cannot post off-site), no plugins, and no base-tag rewriting.
 */
const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  // Next's inline bootstrap and Turnstile/YouTube players.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com https://www.youtube-nocookie.com https://www.youtube.com https://www.facebook.com https://connect.facebook.net",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https://i.ytimg.com https://*.ytimg.com https://scontent.xx.fbcdn.net",
  "media-src 'self' blob:",
  "connect-src 'self' https://challenges.cloudflare.com https://api.brevo.com",
  "frame-src https://challenges.cloudflare.com https://www.youtube-nocookie.com https://www.youtube.com https://www.facebook.com",
  "upgrade-insecure-requests",
].join("; ");

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CSP },
  // HSTS: two years, subdomains included, ready for preload. Only meaningful
  // over https, which Coolify terminates in front of the app.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    // The site needs none of these; a compromised script should not get them.
    value:
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      { source: "/:path*", headers: SECURITY_HEADERS },
      // The admin panel is never indexed, whichever hostname serves it.
      {
        source: "/admin/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }],
      },
    ];
  },
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
