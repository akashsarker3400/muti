"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Loader2, Star, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import {
  addAlbumImages,
  deleteAlbumImage,
  reorderAlbumImages,
  setAlbumCover,
  updateAlbumImage,
} from "@/app/actions/admin-gallery";
import { Panel } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "cn";

export type AlbumImage = {
  id: string;
  url: string;
  caption: string | null;
};

/**
 * Multi-image upload with drag-and-drop reordering, inline captions and a
 * "set as cover" action (section 7.9).
 */
export function AlbumImages({
  albumId,
  images,
  cover,
}: {
  albumId: string;
  images: AlbumImage[];
  cover: string | null;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const [items, setItems] = useState(images);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [dragOver, setDragOver] = useState(false);
  const [pending, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  async function uploadFiles(files: File[]) {
    const images = files.filter((file) => file.type.startsWith("image/"));
    if (images.length === 0) return;

    setUploading(true);
    setProgress({ done: 0, total: images.length });

    const urls: string[] = [];
    for (const [index, file] of images.entries()) {
      try {
        const body = new FormData();
        body.append("file", file);
        const response = await fetch("/api/admin/upload", { method: "POST", body });
        const data = (await response.json()) as { url?: string; error?: string };
        if (response.ok && data.url) urls.push(data.url);
        else toast.error(`${file.name}: ${data.error ?? "upload failed"}`);
      } catch {
        toast.error(`${file.name}: upload failed`);
      }
      setProgress({ done: index + 1, total: images.length });
    }

    if (urls.length > 0) {
      const result = await addAlbumImages(albumId, urls);
      if (result.ok) {
        toast.success(`${urls.length} photos added.`);
        router.refresh();
      } else {
        toast.error(result.error ?? "Photos could not be added.");
      }
    }

    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const from = items.findIndex((item) => item.id === active.id);
    const to = items.findIndex((item) => item.id === over.id);
    if (from === -1 || to === -1) return;

    const next = arrayMove(items, from, to);
    setItems(next);

    startTransition(async () => {
      const result = await reorderAlbumImages(
        albumId,
        next.map((item) => item.id),
      );
      if (!result.ok) {
        toast.error(result.error ?? "The order could not be saved.");
        setItems(images);
      }
    });
  }

  return (
    <Panel>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">Photos</h2>
          <p className="text-xs text-[color:var(--muted-foreground)]">
            Drop many photos at once, or pick them with the button. Drag photos to
            reorder them.
          </p>
        </div>
        {pending && (
          <span className="flex items-center gap-1.5 text-xs text-[color:var(--muted-foreground)]">
            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
            Saving…
          </span>
        )}
      </div>

      <div
        ref={dropRef}
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          void uploadFiles([...event.dataTransfer.files]);
        }}
        className={cn(
          "mb-4 rounded-xl border-2 border-dashed p-6 text-center transition",
          dragOver
            ? "border-[color:var(--brand)] bg-[color:var(--brand-soft)]"
            : "border-[color:var(--border)] bg-[color:var(--bg-soft)]",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(event) => void uploadFiles([...(event.target.files ?? [])])}
        />

        {uploading ? (
          <p className="flex items-center justify-center gap-2 text-sm">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Uploading… {progress.done}/{progress.total}
          </p>
        ) : (
          <>
            <p className="text-sm text-[color:var(--muted-foreground)]">
              Drop photos here
            </p>
            <Button
              type="button"
              variant="outline"
              size="cta"
              className="mt-3"
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="size-4" aria-hidden="true" />
              Choose photos
            </Button>
          </>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-center text-sm text-[color:var(--muted-foreground)]">
          No photos in this album yet.
        </p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          <SortableContext
            items={items.map((item) => item.id)}
            strategy={rectSortingStrategy}
          >
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => (
                <SortableImage
                  key={item.id}
                  image={item}
                  isCover={cover === item.url}
                  albumId={albumId}
                  onRemoved={() => {
                    setItems((current) =>
                      current.filter((entry) => entry.id !== item.id),
                    );
                    router.refresh();
                  }}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </Panel>
  );
}

function SortableImage({
  image,
  isCover,
  albumId,
  onRemoved,
}: {
  image: AlbumImage;
  isCover: boolean;
  albumId: string;
  onRemoved: () => void;
}) {
  const router = useRouter();
  const [caption, setCaption] = useState(image.caption ?? "");
  const [pending, startTransition] = useTransition();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: image.id });

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
      }}
      className="overflow-hidden rounded-xl border border-[color:var(--border)] bg-white"
    >
      <div className="relative aspect-[4/3] bg-[color:var(--bg-soft)]">
        <Image
          src={image.url}
          alt={caption}
          fill
          sizes="(max-width: 640px) 100vw, 33vw"
          className="object-cover"
        />

        <button
          type="button"
          aria-label="Reorder"
          className="absolute start-2 top-2 grid size-8 cursor-grab touch-none place-items-center rounded-lg bg-white/90 text-[color:var(--foreground)] active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" aria-hidden="true" />
        </button>

        {isCover && (
          <span className="absolute end-2 top-2 rounded-full bg-[color:var(--highlight)] px-2 py-0.5 text-[11px] font-semibold text-[color:var(--brand-dark)]">
            Cover
          </span>
        )}
      </div>

      <div className="space-y-2 p-2">
        <Input
          value={caption}
          onChange={(event) => setCaption(event.target.value)}
          onBlur={() => {
            if ((image.caption ?? "") === caption) return;
            startTransition(async () => {
              const result = await updateAlbumImage(image.id, caption);
              if (!result.ok) toast.error(result.error ?? "Could not save.");
            });
          }}
          placeholder="Caption"
          aria-label="Caption"
          className="h-9 text-sm"
        />

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending || isCover}
            onClick={() =>
              startTransition(async () => {
                const result = await setAlbumCover(albumId, image.url);
                if (result.ok) {
                  toast.success("Cover set.");
                  router.refresh();
                } else {
                  toast.error(result.error ?? "Could not set.");
                }
              })
            }
          >
            <Star className="size-3.5" aria-hidden="true" />
            Cover
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Delete photo"
            className="ms-auto"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await deleteAlbumImage(image.id);
                if (result.ok) {
                  toast.success("Photo deleted.");
                  onRemoved();
                } else {
                  toast.error(result.error ?? "Could not delete.");
                }
              })
            }
          >
            <Trash2 className="size-4 text-[color:var(--error)]" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </li>
  );
}
