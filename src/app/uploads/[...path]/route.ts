import path from "node:path";
import { NextResponse } from "next/server";

import { isPublicKey } from "@/lib/storage-key";
import { storage } from "@/lib/storage";

export const dynamic = "force-dynamic";

/**
 * Serves uploaded files (section 2) from whichever storage driver is active
 * — Cloudflare R2 in production, the uploads volume otherwise — under the
 * same `/uploads/<month>/<file>` URL, so database paths never change.
 * Streams straight through with a one-year immutable cache, which lets
 * Cloudflare hold the bytes at the edge.
 */

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
  ".mp4": "video/mp4",
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await params;
  // `?download=1` asks the browser to save; otherwise PDFs and images open
  // in the tab (or an iframe), which is what the downloads page relies on.
  const forceDownload = new URL(request.url).searchParams.get("download") === "1";

  // Only the shape the uploader produces is ever looked up (section 11):
  // one month folder, one random file name, a known extension. Protected
  // files (the sample chapter PDF) fail this check on purpose.
  const key = segments.join("/");
  if (!isPublicKey(key)) return new NextResponse("Not found", { status: 404 });

  const extension = path.extname(key).toLowerCase();
  const contentType = CONTENT_TYPES[extension];
  if (!contentType) return new NextResponse("Not found", { status: 404 });

  const file = await storage().get(key);
  if (!file) return new NextResponse("Not found", { status: 404 });

  const fileName = segments[segments.length - 1]!;
  return new NextResponse(file.stream, {
    headers: {
      "Content-Type": contentType,
      ...(file.size > 0 ? { "Content-Length": String(file.size) } : {}),
      "Content-Disposition": `${forceDownload ? "attachment" : "inline"}; filename="${fileName}"`,
      // Uploaded files get a random name and are never overwritten, so they
      // can be cached aggressively.
      "Cache-Control": "public, max-age=31536000, immutable",
      // SVGs are rendered by the browser; stop them executing script. The
      // policy is not sent for PDFs: browser PDF viewers need their own
      // scripts and styles, and the file cannot run anything anyway.
      ...(extension === ".svg"
        ? { "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'" }
        : {}),
      "X-Content-Type-Options": "nosniff",
    },
  });
}
