import { saveAlbum } from "@/app/actions/admin-gallery";
import { ResourceForm } from "@/components/admin/resource-form";
import { AdminPageHeader } from "@/components/admin/ui";
import { albumFormSections, albumToForm } from "@/lib/admin/album-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "New album" };

export default function NewAlbumPage() {
  return (
    <>
      <AdminPageHeader
        title="New album"
        description="Photos can be added once the album is created."
      />
      <ResourceForm
        sections={albumFormSections}
        defaultValues={albumToForm({})}
        cancelHref="/admin/gallery"
        onSave={async (values) => {
          "use server";
          return saveAlbum(null, values);
        }}
      />
    </>
  );
}
