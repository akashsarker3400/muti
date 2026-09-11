"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { SaveResult } from "@/components/admin/resource-form";
import { logActivity, requireAdmin } from "@/lib/admin-auth";
import { slugify } from "@/lib/admin/resources";
import { prisma } from "@/lib/prisma";

/** Gallery albums and images (section 7.9). */

const albumSchema = z.object({
  title: z.string().trim().min(1, "শিরোনাম আবশ্যক"),
  titleBn: z.string().trim().default(""),
  slug: z.string().trim().default(""),
  cover: z.string().trim().default(""),
  sortOrder: z.coerce.number().int().default(0),
});

export async function saveAlbum(
  id: string | null,
  values: Record<string, unknown>,
): Promise<SaveResult> {
  const admin = await requireAdmin();

  const parsed = albumSchema.safeParse(values);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".") || "form";
      if (!errors[key]) errors[key] = issue.message;
    }
    return { ok: false, errors };
  }

  const data = {
    title: parsed.data.title,
    titleBn: parsed.data.titleBn || null,
    slug: slugify(parsed.data.slug || parsed.data.title),
    cover: parsed.data.cover || null,
    sortOrder: parsed.data.sortOrder,
  };

  try {
    const album = id
      ? await prisma.galleryAlbum.update({ where: { id }, data })
      : await prisma.galleryAlbum.create({ data });

    await logActivity(admin.id, id ? "update" : "create", "galleryAlbum", album.id);
    revalidatePath("/admin/gallery");
    revalidatePath("/", "layout");

    return { ok: true, id: album.id };
  } catch (error) {
    return { ok: false, error: describe(error) };
  }
}

export async function deleteAlbum(id: string): Promise<SaveResult> {
  const admin = await requireAdmin();

  try {
    // Images cascade with the album (see the schema relation).
    await prisma.galleryAlbum.delete({ where: { id } });
    await logActivity(admin.id, "delete", "galleryAlbum", id);
    revalidatePath("/admin/gallery");
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: describe(error) };
  }
}

/** Appends freshly uploaded files to the end of an album. */
export async function addAlbumImages(
  albumId: string,
  urls: string[],
): Promise<SaveResult> {
  const admin = await requireAdmin();
  if (urls.length === 0) return { ok: true };

  try {
    const last = await prisma.galleryImage.findFirst({
      where: { albumId },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });
    const start = (last?.sortOrder ?? 0) + 10;

    await prisma.galleryImage.createMany({
      data: urls.map((url, index) => ({
        albumId,
        url,
        sortOrder: start + index * 10,
      })),
    });

    // The first image uploaded to an empty album becomes its cover.
    const album = await prisma.galleryAlbum.findUnique({ where: { id: albumId } });
    if (album && !album.cover && urls[0]) {
      await prisma.galleryAlbum.update({
        where: { id: albumId },
        data: { cover: urls[0] },
      });
    }

    await logActivity(admin.id, `add-images:${urls.length}`, "galleryAlbum", albumId);
    revalidatePath(`/admin/gallery/${albumId}`);
    revalidatePath("/", "layout");

    return { ok: true };
  } catch (error) {
    return { ok: false, error: describe(error) };
  }
}

export async function updateAlbumImage(
  id: string,
  caption: string,
): Promise<SaveResult> {
  await requireAdmin();

  try {
    const image = await prisma.galleryImage.update({
      where: { id },
      data: { caption: caption.trim() || null },
    });
    revalidatePath(`/admin/gallery/${image.albumId}`);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: describe(error) };
  }
}

export async function deleteAlbumImage(id: string): Promise<SaveResult> {
  const admin = await requireAdmin();

  try {
    const image = await prisma.galleryImage.delete({ where: { id } });
    // If the deleted image was the cover, fall back to the next one.
    const album = await prisma.galleryAlbum.findUnique({
      where: { id: image.albumId },
      include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
    });
    if (album && album.cover === image.url) {
      await prisma.galleryAlbum.update({
        where: { id: album.id },
        data: { cover: album.images[0]?.url ?? null },
      });
    }

    await logActivity(admin.id, "delete-image", "galleryAlbum", image.albumId);
    revalidatePath(`/admin/gallery/${image.albumId}`);
    revalidatePath("/", "layout");

    return { ok: true };
  } catch (error) {
    return { ok: false, error: describe(error) };
  }
}

export async function reorderAlbumImages(
  albumId: string,
  ids: string[],
): Promise<SaveResult> {
  await requireAdmin();

  try {
    await prisma.$transaction(
      ids.map((id, index) =>
        prisma.galleryImage.update({
          where: { id },
          data: { sortOrder: (index + 1) * 10 },
        }),
      ),
    );
    revalidatePath(`/admin/gallery/${albumId}`);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: describe(error) };
  }
}

export async function setAlbumCover(albumId: string, url: string): Promise<SaveResult> {
  await requireAdmin();

  try {
    await prisma.galleryAlbum.update({
      where: { id: albumId },
      data: { cover: url },
    });
    revalidatePath(`/admin/gallery/${albumId}`);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: describe(error) };
  }
}

function describe(error: unknown): string {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code: unknown }).code)
      : "";

  if (code === "P2002") return "এই slug ইতিমধ্যে ব্যবহৃত হয়েছে। অন্য একটি দিন।";
  console.error("Gallery action failed", error);
  return "সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।";
}
