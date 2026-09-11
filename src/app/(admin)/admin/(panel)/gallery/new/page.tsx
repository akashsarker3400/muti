import { saveAlbum } from "@/app/actions/admin-gallery";
import { ResourceForm } from "@/components/admin/resource-form";
import { AdminPageHeader } from "@/components/admin/ui";
import { albumFormSections, albumToForm } from "@/lib/admin/album-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "নতুন অ্যালবাম" };

export default function NewAlbumPage() {
  return (
    <>
      <AdminPageHeader
        title="নতুন অ্যালবাম"
        description="অ্যালবাম তৈরি করার পর ছবি যোগ করা যাবে।"
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
