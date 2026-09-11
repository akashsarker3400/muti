import Image from "next/image";
import Link from "next/link";
import { Images } from "lucide-react";

import { deleteAlbum } from "@/app/actions/admin-gallery";
import { RowActions } from "@/components/admin/row-actions";
import { AdminPageHeader, EmptyState, NewButton, Panel } from "@/components/admin/ui";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = { title: "Gallery" };

export default async function GalleryAlbumsPage() {
  const albums = await prisma.galleryAlbum.findMany({
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    include: { _count: { select: { images: true } } },
  });

  return (
    <>
      <AdminPageHeader
        title="Gallery"
        description="Create an album and add photos to it."
        action={<NewButton href="/admin/gallery/new" label="New album" />}
      />

      {albums.length === 0 ? (
        <EmptyState
          title="No albums yet."
          description="Create the first album and add photos."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {albums.map((album) => (
            <Panel key={album.id} padded={false} className="overflow-hidden">
              <Link
                href={`/admin/gallery/${album.id}`}
                className="relative block aspect-[16/9] bg-[color:var(--bg-soft)]"
              >
                {album.cover ? (
                  <Image
                    src={album.cover}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 100vw, 33vw"
                    className="object-cover"
                  />
                ) : (
                  <span className="grid size-full place-items-center text-[color:var(--muted-foreground)]">
                    <Images className="size-8" aria-hidden="true" />
                  </span>
                )}
              </Link>

              <div className="flex items-center gap-2 p-3">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/admin/gallery/${album.id}`}
                    className="block truncate font-medium text-[color:var(--brand)] hover:underline"
                  >
                    {album.titleBn || album.title}
                  </Link>
                  <p className="nums text-xs text-[color:var(--muted-foreground)]">
                    {album._count.images} photos · /{album.slug}
                  </p>
                </div>

                <RowActions
                  editHref={`/admin/gallery/${album.id}`}
                  label={album.title}
                  onDelete={async () => {
                    "use server";
                    return deleteAlbum(album.id);
                  }}
                />
              </div>
            </Panel>
          ))}
        </div>
      )}
    </>
  );
}
