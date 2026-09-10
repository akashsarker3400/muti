import "@/app/globals.css";

import { fontVariables } from "@/lib/fonts";

export const metadata = {
  title: "MUTI Admin",
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bn" className={fontVariables}>
      <body className="min-h-dvh bg-[color:var(--bg-soft)]">{children}</body>
    </html>
  );
}
