import { VideoEditor } from "@/components/admin/video-editor";
import { AdminPageHeader } from "@/components/admin/ui";
import { requirePermission } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function NewVideoPage() {
  await requirePermission("videos.manage");
  return (
    <>
      <AdminPageHeader title="New video" />
      <VideoEditor
        initial={{
          id: null,
          title: "",
          description: "",
          source: "EMBED",
          embedUrl: "",
          fileId: "",
          fileUrl: "",
          fileDuration: null,
          fileSize: null,
          posterId: "",
          posterUrl: "",
          posterImage: "",
          autoplayMuted: false,
          showOnHome: true,
          placement: "HOME",
          sortOrder: 0,
          published: true,
        }}
      />
    </>
  );
}
