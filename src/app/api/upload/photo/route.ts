import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import sharp from "sharp";

import { checkRateLimit } from "@/lib/rate-limit";
import { storage } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Passport-size photo upload for the public admission form.
 *
 * This is the one upload endpoint visitors can reach, so it is deliberately
 * narrow: images only, 5 MB, rate limited per IP, and every file is re-encoded
 * through sharp to a 600×800 webp. Re-encoding drops any metadata or payload
 * the original carried, and the stored name is random, so nothing a visitor
 * sends is served back byte for byte.
 */
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

export async function POST(request: Request) {
  const limit = await checkRateLimit("photo");
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many uploads. Please try again in an hour." },
      { status: 429 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "The photo is larger than 5 MB" },
      { status: 413 },
    );
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json(
      { error: "Only JPG, PNG, WEBP and HEIC photos are accepted" },
      { status: 415 },
    );
  }

  try {
    const output = await sharp(Buffer.from(await file.arrayBuffer()))
      .rotate()
      .resize({ width: 600, height: 800, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();

    const now = new Date();
    const folder = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
    const key = `${folder}/${randomBytes(12).toString("hex")}.webp`;
    await storage().put(key, output, "image/webp");

    return NextResponse.json({ url: `/uploads/${key}` });
  } catch (error) {
    console.error("Photo upload failed", error);
    return NextResponse.json({ error: "Could not process the photo" }, { status: 500 });
  }
}
