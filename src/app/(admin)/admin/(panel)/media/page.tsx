import { MediaGrid } from "@/components/admin/media-grid";
import { AdminPageHeader } from "@/components/admin/ui";
import { listMedia } from "@/lib/admin/media";

export const dynamic = "force-dynamic";

export const metadata = { title: "Media" };

export default async function MediaPage() {
  const files = await listMedia();

  return (
    <>
      <AdminPageHeader
        title="Media"
        description="Every uploaded image and PDF. Files not used anywhere can be deleted."
      />
      <MediaGrid files={files} />
    </>
  );
}
