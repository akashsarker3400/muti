import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";

import "@/app/globals.css";

import { fontVariables } from "@/lib/fonts";

export const metadata: Metadata = {
  title: { default: "MUTI Admin", template: "%s | MUTI Admin" },
  // The admin panel must never be indexed.
  robots: { index: false, follow: false, nocache: true },
};

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
    <html lang="bn" className={fontVariables}>
      <body className="min-h-dvh bg-[color:var(--bg-soft)]">
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
