import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";

import { logActivity, requirePermission } from "@/lib/admin-auth";
import { stampSamplePdf } from "@/lib/book-pdf";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/site-settings";
import { storage } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 20 * 1024 * 1024;

/**
 * Uploads the course book's free sample chapter (addendum 5, A2/A7): the PDF
 * is stamped with a MUTI header and a "not for resale" footer on every page,
 * then stored under the `protected/` prefix that the public /uploads route
 * refuses. Visitors only ever get it through the signed token route.
 */
export async function POST(request: Request) {
  const admin = await requirePermission("book.manage");

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload" }, { status: 400 });
  }
  const file = formData.get("file");
  const bookId = String(formData.get("bookId") ?? "");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "The PDF is larger than 20 MB" },
      { status: 413 },
    );
  }
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ error: "Only PDF files are accepted" }, { status: 415 });
  }
  const book = await prisma.courseBook.findUnique({ where: { id: bookId } });
  if (!book) return NextResponse.json({ error: "Book not found" }, { status: 404 });

  try {
    const settings = await getSiteSettings();
    const stamped = await stampSamplePdf(Buffer.from(await file.arrayBuffer()), {
      header: `${settings.general.nameEn} · ${book.title}${book.subtitle ? `: ${book.subtitle}` : ""}`,
      footer:
        "Sample chapter, not for resale. Full book included with CMU and DMU admission at MUTI.",
    });

    const now = new Date();
    const folder = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
    const key = `protected/${folder}/${randomBytes(12).toString("hex")}.pdf`;
    await storage().put(key, stamped, "application/pdf");

    const media = await prisma.media.create({
      data: {
        key,
        url: `/api/v1/book/sample`,
        kind: "PDF",
        tag: "protected",
        mimeType: "application/pdf",
        size: stamped.byteLength,
        protected: true,
      },
    });
    const previous = book.samplePdfFileId;
    await prisma.courseBook.update({
      where: { id: book.id },
      data: { samplePdfFileId: media.id },
    });
    // The old sample is no longer reachable by any token, so drop it.
    if (previous) {
      const old = await prisma.media.findUnique({ where: { id: previous } });
      if (old) {
        await storage()
          .delete(old.key)
          .catch(() => undefined);
        await prisma.media.delete({ where: { id: old.id } }).catch(() => undefined);
      }
    }
    await logActivity(admin.id, "upload", "CourseBook", book.id);

    return NextResponse.json({
      fileId: media.id,
      size: stamped.byteLength,
      name: file.name,
    });
  } catch (error) {
    console.error("Sample PDF upload failed", error);
    return NextResponse.json({ error: "Could not process the PDF" }, { status: 500 });
  }
}
