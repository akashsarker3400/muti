import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import sharp from "sharp";

import { currentAdmin, logActivity } from "@/lib/admin-auth";
import { uploadDir } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Media upload (section 2 / 11): jpg, png, webp and pdf only, 10 MB maximum,
 * random filenames, images resized to a maximum of 1600px and converted to
 * webp with sharp. Files land on the mounted uploads volume and are served by
 * /uploads/[...path].
 */

const MAX_BYTES = 10 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export async function POST(request: Request) {
  const admin = await currentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
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
    return NextResponse.json({ error: "File is larger than 10 MB" }, { status: 413 });
  }

  const isImage = ALLOWED_IMAGE_TYPES.has(file.type);
  const isPdf = file.type === "application/pdf";

  if (!isImage && !isPdf) {
    return NextResponse.json(
      { error: "Only JPG, PNG, WEBP, GIF and PDF files are allowed" },
      { status: 415 },
    );
  }

  // Folder per month keeps the volume browsable as it grows.
  const now = new Date();
  const folder = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const directory = path.join(path.resolve(uploadDir), folder);
  await mkdir(directory, { recursive: true });

  // Random name: the original filename never reaches the filesystem.
  const id = randomBytes(12).toString("hex");
  const input = Buffer.from(await file.arrayBuffer());

  try {
    if (isImage) {
      const output = await sharp(input)
        .rotate()
        .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer();

      const filename = `${id}.webp`;
      await writeFile(path.join(directory, filename), output);
      await logActivity(admin.id, "upload", "Media", `${folder}/${filename}`);

      return NextResponse.json({
        url: `/uploads/${folder}/${filename}`,
        name: file.name,
        size: output.byteLength,
        type: "image/webp",
      });
    }

    const filename = `${id}.pdf`;
    await writeFile(path.join(directory, filename), input);
    await logActivity(admin.id, "upload", "Media", `${folder}/${filename}`);

    return NextResponse.json({
      url: `/uploads/${folder}/${filename}`,
      name: file.name,
      size: input.byteLength,
      type: "application/pdf",
    });
  } catch (error) {
    console.error("Upload failed", error);
    return NextResponse.json({ error: "Could not process the file" }, { status: 500 });
  }
}
