import { NextResponse } from "next/server";

import { currentAdmin } from "@/lib/admin-auth";
import { storage } from "@/lib/storage";
import { isBackupKey } from "@/lib/storage-key";

export const dynamic = "force-dynamic";

/**
 * Downloads one database dump (addendum 2, A6).
 *
 * Super admin only, and the key must match the backup pattern exactly, so
 * this route can never be talked into serving an upload or a path outside
 * the backup folder. Never cached, and marked noindex for good measure.
 */
export async function GET(request: Request) {
  const admin = await currentAdmin();
  if (!admin || admin.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const key = new URL(request.url).searchParams.get("key") ?? "";
  if (!isBackupKey(key)) {
    return NextResponse.json({ error: "Unknown backup" }, { status: 400 });
  }

  const file = await storage().get(key);
  if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return new NextResponse(file.stream, {
    headers: {
      "content-type": "application/octet-stream",
      "content-length": String(file.size),
      "content-disposition": `attachment; filename="${key.split("/").pop()}"`,
      "cache-control": "no-store",
      "x-robots-tag": "noindex",
    },
  });
}
