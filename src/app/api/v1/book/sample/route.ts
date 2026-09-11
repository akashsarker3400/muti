import { NextResponse } from "next/server";

import { currentAdmin } from "@/lib/admin-auth";
import { verifySampleToken } from "@/lib/book-token";
import { requiredEnv } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { clientIp } from "@/lib/rate-limit";
import { storage } from "@/lib/storage";

export const dynamic = "force-dynamic";

/**
 * Streams the course book's sample chapter (addendum 5, A4). The PDF lives
 * under the protected storage prefix, so this signed route is the only way
 * to it: a 24-hour token tied to one form submission, or `?preview=1` for a
 * signed-in admin checking the stamped file. Every visitor download is
 * logged against the application.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const preview = url.searchParams.get("preview") === "1";
  const token = url.searchParams.get("token") ?? "";

  let applicationId: string | null = null;
  if (preview) {
    if (!(await currentAdmin())) return new NextResponse("Not found", { status: 404 });
  } else {
    const result = verifySampleToken(token, requiredEnv("AUTH_SECRET"));
    if (!result.ok) {
      const message =
        result.reason === "expired"
          ? "This download link has expired. Please fill in the form again."
          : "This download link is not valid.";
      return new NextResponse(message, {
        status: result.reason === "expired" ? 410 : 403,
      });
    }
    applicationId = result.applicationId;
  }

  const book = await prisma.courseBook.findFirst({
    where: preview ? {} : { published: true },
    orderBy: { createdAt: "asc" },
    include: { samplePdf: true },
  });
  if (!book?.samplePdf) return new NextResponse("Not found", { status: 404 });

  if (applicationId) {
    const application = await prisma.application.findFirst({
      where: { id: applicationId, type: "BOOK_SAMPLE" },
      select: { id: true },
    });
    if (!application)
      return new NextResponse("This download link is not valid.", { status: 403 });
    await prisma.bookSampleDownload
      .create({ data: { applicationId, ip: await clientIp() } })
      .catch(() => undefined);
  }

  const file = await storage().get(book.samplePdf.key);
  if (!file) return new NextResponse("Not found", { status: 404 });

  const name = `${book.slug}-sample-chapter.pdf`;
  return new NextResponse(file.stream, {
    headers: {
      "Content-Type": "application/pdf",
      ...(file.size > 0 ? { "Content-Length": String(file.size) } : {}),
      "Content-Disposition": `${preview ? "inline" : "attachment"}; filename="${name}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex",
    },
  });
}
