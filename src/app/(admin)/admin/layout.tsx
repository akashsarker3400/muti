import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";

import "@/app/globals.css";

import { fontVariables } from "@/lib/fonts";
import { faviconUrl, getSiteSettings } from "@/lib/site-settings";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return {
    title: { default: "MUTI Admin", template: "%s | MUTI Admin" },
    // The admin panel must never be indexed.
    robots: { index: false, follow: false, nocache: true },
    icons: { icon: faviconUrl(settings) },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#12204F",
};

/**
 * Root layout for the admin panel. It is a sibling of the public site's root
 * layout (both live in route groups) because /admin is not locale-prefixed.
 */
export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={fontVariables}>
      <body className="min-h-dvh bg-[color:var(--bg-soft)]">
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
