import { notFound } from "next/navigation";

import { saveAlbum } from "@/app/actions/admin-gallery";
import { AlbumImages } from "@/components/admin/album-images";
import { ResourceForm } from "@/components/admin/resource-form";
import { AdminPageHeader } from "@/components/admin/ui";
import { albumFormSections, albumToForm } from "@/lib/admin/album-form";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function EditAlbumPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const album = await prisma.galleryAlbum.findUnique({
    where: { id },
    include: { images: { orderBy: { sortOrder: "asc" } } },
  });

  if (!album) notFound();

  return (
    <>
      <AdminPageHeader
        title={album.titleBn || album.title}
        description={`/${album.slug}`}
      />

      <ResourceForm
        sections={albumFormSections}
        defaultValues={albumToForm(album)}
        cancelHref="/admin/gallery"
        onSave={async (values) => {
          "use server";
          return saveAlbum(id, values);
        }}
        extra={
          <AlbumImages
            albumId={album.id}
            cover={album.cover}
            images={album.images.map((image) => ({
              id: image.id,
              url: image.url,
              caption: image.caption,
            }))}
          />
        }
      />
    </>
  );
}
