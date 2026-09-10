import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";

import { uploadDir } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * Serves files from the uploads volume (section 2). Files live outside
 * `public/` so they survive redeploys on the mounted Coolify volume, which
 * means Next cannot serve them statically.
 */

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await params;

  // Reject traversal attempts before touching the filesystem (section 11).
  if (
    segments.length === 0 ||
    segments.some(
      (segment) =>
        !segment ||
        segment === "." ||
        segment === ".." ||
        segment.includes("/") ||
        segment.includes("\\") ||
        segment.includes("\0"),
    )
  ) {
    return new NextResponse("Not found", { status: 404 });
  }

  const root = path.resolve(uploadDir);
  const filePath = path.resolve(root, ...segments);

  // Belt and braces: the resolved path must stay inside the uploads root.
  if (filePath !== root && !filePath.startsWith(root + path.sep)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const extension = path.extname(filePath).toLowerCase();
  const contentType = CONTENT_TYPES[extension];
  if (!contentType) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const stats = await stat(filePath);
    if (!stats.isFile()) {
      return new NextResponse("Not found", { status: 404 });
    }

    const stream = Readable.toWeb(
      createReadStream(filePath),
    ) as unknown as ReadableStream;

    return new NextResponse(stream, {
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(stats.size),
        // Uploaded files get a random name and are never overwritten, so they
        // can be cached aggressively.
        "Cache-Control": "public, max-age=31536000, immutable",
        // SVGs are rendered by the browser; stop them executing script.
        "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
