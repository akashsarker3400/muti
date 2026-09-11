"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { SaveResult } from "@/components/admin/resource-form";
import { logActivity, requirePermission } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { parseEmbedUrl } from "@/lib/video";

/** Institute videos (homepage additions, 2): embed or self-hosted MP4. */

const schema = z
  .object({
    title: z.string().trim().min(1, "Title is required"),
    description: z.string().trim().optional().default(""),
    source: z.enum(["EMBED", "UPLOAD"]),
    embedUrl: z.string().trim().optional().default(""),
    fileId: z.string().trim().optional().default(""),
    posterId: z.string().trim().optional().default(""),
    posterImage: z.string().trim().optional().default(""),
    autoplayMuted: z.boolean().default(false),
    showOnHome: z.boolean().default(false),
    placement: z.enum(["HOME", "ABOUT", "HEALTH"]).default("HOME"),
    sortOrder: z.coerce.number().int().default(0),
    published: z.boolean().default(true),
  })
  .superRefine((value, ctx) => {
    if (value.source === "EMBED") {
      if (!value.embedUrl) {
        ctx.addIssue({
          code: "custom",
          path: ["embedUrl"],
          message: "Paste the video link",
        });
      } else if (!parseEmbedUrl(value.embedUrl)) {
        ctx.addIssue({
          code: "custom",
          path: ["embedUrl"],
          message: "Only YouTube and Facebook video links are supported",
        });
      }
    } else if (!value.fileId) {
      ctx.addIssue({
        code: "custom",
        path: ["fileId"],
        message: "Upload the MP4 file",
      });
    }
  });

export type VideoFormValues = z.input<typeof schema>;

function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

function revalidate() {
  revalidatePath("/admin/videos");
  revalidatePath("/", "layout");
}

export async function saveVideo(id: string | null, raw: unknown): Promise<SaveResult> {
  const admin = await requirePermission("videos.manage");
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const v = parsed.data;

  const data = {
    title: v.title,
    description: v.description || null,
    source: v.source,
    embedUrl: v.source === "EMBED" ? v.embedUrl : null,
    fileId: v.source === "UPLOAD" ? v.fileId : null,
    posterId: v.source === "UPLOAD" && v.posterId ? v.posterId : null,
    posterImage: v.posterImage || null,
    autoplayMuted: v.source === "UPLOAD" && v.autoplayMuted,
    showOnHome: v.showOnHome,
    placement: v.placement,
    sortOrder: v.sortOrder,
    published: v.published,
  };

  try {
    if (v.source === "UPLOAD") {
      const file = await prisma.media.findUnique({ where: { id: v.fileId } });
      if (!file || file.kind !== "VIDEO") {
        return { ok: false, errors: { fileId: "Upload the MP4 file again" } };
      }
    }
    const row = id
      ? await prisma.siteVideo.update({ where: { id }, data })
      : await prisma.siteVideo.create({ data });
    await logActivity(admin.id, id ? "update" : "create", "siteVideo", row.id);
    revalidate();
    return { ok: true, id: row.id };
  } catch (error) {
    console.error("saveVideo failed", error);
    return { ok: false, error: "Could not save. Please try again." };
  }
}

export async function deleteVideo(id: string): Promise<SaveResult> {
  const admin = await requirePermission("videos.manage");
  try {
    const video = await prisma.siteVideo.findUnique({
      where: { id },
      include: { file: true, poster: true },
    });
    if (!video) return { ok: true };
    await prisma.siteVideo.delete({ where: { id } });
    // An uploaded MP4 and its generated poster go with the video, unless
    // another video still points at the same file.
    for (const media of [video.file, video.poster]) {
      if (!media) continue;
      const stillUsed = await prisma.siteVideo.count({
        where: { OR: [{ fileId: media.id }, { posterId: media.id }] },
      });
      if (stillUsed > 0) continue;
      await storage()
        .delete(media.key)
        .catch(() => undefined);
      await prisma.media.delete({ where: { id: media.id } }).catch(() => undefined);
    }
    await logActivity(admin.id, "delete", "siteVideo", id);
    revalidate();
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not delete." };
  }
}

export async function setVideoFlag(
  id: string,
  field: "published" | "showOnHome",
  value: boolean,
): Promise<SaveResult> {
  const admin = await requirePermission("videos.manage");
  try {
    await prisma.siteVideo.update({ where: { id }, data: { [field]: value } });
    await logActivity(admin.id, "update", "siteVideo", id);
    revalidate();
    return { ok: true };
  } catch {
    return { ok: false, error: "The change could not be saved." };
  }
}

export async function reorderVideos(ids: string[]): Promise<SaveResult> {
  const admin = await requirePermission("videos.manage");
  try {
    await prisma.$transaction(
      ids.map((id, index) =>
        prisma.siteVideo.update({
          where: { id },
          data: { sortOrder: (index + 1) * 10 },
        }),
      ),
    );
    await logActivity(admin.id, "reorder", "siteVideo", null);
    revalidate();
    return { ok: true };
  } catch {
    return { ok: false, error: "The order could not be saved." };
  }
}
