import { VideosTable, type AdminVideo } from "@/components/admin/videos-table";
import { AdminPageHeader, EmptyState, NewButton } from "@/components/admin/ui";
import { requirePermission } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { clockDuration, parseEmbedUrl } from "@/lib/video";

export const dynamic = "force-dynamic";

export const metadata = { title: "Videos" };

export default async function AdminVideosPage() {
  await requirePermission("videos.manage");
  const videos = await prisma.siteVideo.findMany({
    include: { file: true, poster: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });

  const rows: AdminVideo[] = videos.map((video) => {
    const embed =
      video.source === "EMBED" && video.embedUrl ? parseEmbedUrl(video.embedUrl) : null;
    return {
      id: video.id,
      title: video.title,
      source: video.source,
      provider:
        video.source === "UPLOAD"
          ? "MP4"
          : embed?.provider === "youtube"
            ? "YouTube"
            : "Facebook",
      poster: video.posterImage || video.poster?.url || embed?.thumbnail || null,
      duration: clockDuration(video.file?.duration),
      size: video.file ? `${(video.file.size / 1024 / 1024).toFixed(1)} MB` : "",
      placement: video.placement,
      showOnHome: video.showOnHome,
      published: video.published,
    };
  });

  return (
    <>
      <AdminPageHeader
        title="Videos"
        description="The institute video for the homepage (“MUTI in 1 minute”), plus videos for the About and Health service pages and the gallery’s Videos tab. A YouTube link is the recommended source."
        action={<NewButton href="/admin/videos/new" label="New video" />}
      />
      {rows.length === 0 ? (
        <EmptyState
          title="No videos yet."
          description="Add a YouTube link or upload a short MP4 with the button above."
        />
      ) : (
        <VideosTable videos={rows} />
      )}
    </>
  );
}
