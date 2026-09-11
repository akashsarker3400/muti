import { notFound } from "next/navigation";

import { VideoEditor } from "@/components/admin/video-editor";
import { AdminPageHeader } from "@/components/admin/ui";
import { requirePermission } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function EditVideoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("videos.manage");
  const { id } = await params;
  const video = await prisma.siteVideo.findUnique({
    where: { id },
    include: { file: true, poster: true },
  });
  if (!video) notFound();

  return (
    <>
      <AdminPageHeader title="Edit video" />
      <VideoEditor
        initial={{
          id: video.id,
          title: video.title,
          description: video.description ?? "",
          source: video.source,
          embedUrl: video.embedUrl ?? "",
          fileId: video.fileId ?? "",
          fileUrl: video.file?.url ?? "",
          fileDuration: video.file?.duration ?? null,
          fileSize: video.file?.size ?? null,
          posterId: video.posterId ?? "",
          posterUrl: video.poster?.url ?? "",
          posterImage: video.posterImage ?? "",
          autoplayMuted: video.autoplayMuted,
          showOnHome: video.showOnHome,
          placement: video.placement,
          sortOrder: video.sortOrder,
          published: video.published,
        }}
      />
    </>
  );
}
