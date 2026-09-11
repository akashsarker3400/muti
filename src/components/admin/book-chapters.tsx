"use client";

import { useState, useTransition } from "react";
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
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Check, GripVertical, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { deleteChapter, reorderChapters, saveChapter } from "@/app/actions/admin-book";
import { AdminBadge, Panel } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type AdminChapter = {
  id: string;
  number: number;
  title: string;
  titleBn: string;
  summary: string;
  topics: string[];
  isSample: boolean;
};

const EMPTY: AdminChapter = {
  id: "",
  number: 1,
  title: "",
  titleBn: "",
  summary: "",
  topics: [],
  isSample: false,
};

/**
 * Chapter list of the course book (addendum 5, A7): drag to reorder, edit a
 * row in place, add a chapter at the end. The public page shows the same
 * order.
 */
export function BookChapters({
  bookId,
  chapters,
}: {
  bookId: string;
  chapters: AdminChapter[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState(chapters);
  const [editing, setEditing] = useState<AdminChapter | null>(null);
  const [, startTransition] = useTransition();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = rows.findIndex((row) => row.id === active.id);
    const to = rows.findIndex((row) => row.id === over.id);
    if (from === -1 || to === -1) return;
    const next = arrayMove(rows, from, to);
    setRows(next);
    startTransition(async () => {
      const result = await reorderChapters(
        bookId,
        next.map((row) => row.id),
      );
      if (result.ok) toast.success("Order saved.");
      else {
        toast.error(result.error ?? "The order could not be saved.");
        setRows(chapters);
      }
    });
  }

  return (
    <Panel>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Chapters</h2>
          <p className="text-xs text-[color:var(--muted-foreground)]">
            Drag to reorder. Mark one chapter as the free sample; its PDF is uploaded
            below.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="cta"
          onClick={() =>
            setEditing({ ...EMPTY, number: (rows[rows.length - 1]?.number ?? 0) + 1 })
          }
          disabled={editing !== null}
        >
          <Plus className="size-4" aria-hidden="true" />
          Add chapter
        </Button>
      </div>

      {editing && !editing.id && (
        <ChapterForm
          bookId={bookId}
          chapter={editing}
          onCancel={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
        <SortableContext
          items={rows.map((row) => row.id)}
          strategy={verticalListSortingStrategy}
        >
          <ol
            className="mt-3 space-y-2"
            data-testid="book-chapters"
            data-book-id={bookId}
          >
            {rows.map((chapter) =>
              editing?.id === chapter.id ? (
                <li key={chapter.id}>
                  <ChapterForm
                    bookId={bookId}
                    chapter={editing}
                    onCancel={() => setEditing(null)}
                    onSaved={() => {
                      setEditing(null);
                      router.refresh();
                    }}
                  />
                </li>
              ) : (
                <ChapterRow
                  key={chapter.id}
                  chapter={chapter}
                  onEdit={() => setEditing(chapter)}
                  onDelete={() =>
                    startTransition(async () => {
                      if (
                        !window.confirm(
                          `Delete chapter ${chapter.number}: ${chapter.title}?`,
                        )
                      )
                        return;
                      const result = await deleteChapter(bookId, chapter.id);
                      if (result.ok) {
                        toast.success("Deleted.");
                        setRows((current) =>
                          current.filter((row) => row.id !== chapter.id),
                        );
                        router.refresh();
                      } else toast.error(result.error ?? "Could not delete.");
                    })
                  }
                />
              ),
            )}
          </ol>
        </SortableContext>
      </DndContext>
      {rows.length === 0 && !editing && (
        <p className="mt-3 rounded-lg border border-dashed border-[color:var(--border)] p-4 text-sm text-[color:var(--muted-foreground)]">
          No chapters yet. Add the first one with the button above.
        </p>
      )}
    </Panel>
  );
}

function ChapterRow({
  chapter,
  onEdit,
  onDelete,
}: {
  chapter: AdminChapter;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: chapter.id });
  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
      }}
      className="flex flex-wrap items-center gap-3 rounded-lg border border-[color:var(--border)] bg-white p-3"
    >
      <button
        type="button"
        aria-label="Reorder"
        className="cursor-grab touch-none text-[color:var(--muted-foreground)] active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-5" aria-hidden="true" />
      </button>
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[color:var(--brand)] font-latin text-sm font-bold text-white">
        {String(chapter.number).padStart(2, "0")}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{chapter.title}</span>
          {chapter.titleBn && (
            <span lang="bn" className="text-sm text-[color:var(--muted-foreground)]">
              {chapter.titleBn}
            </span>
          )}
          {chapter.isSample && <AdminBadge tone="success">Free sample</AdminBadge>}
        </div>
        {chapter.summary && (
          <p className="mt-0.5 text-xs text-[color:var(--muted-foreground)]">
            {chapter.summary}
          </p>
        )}
        {chapter.topics.length > 0 && (
          <p className="mt-1 flex flex-wrap gap-1">
            {chapter.topics.map((topic) => (
              <span
                key={topic}
                className="rounded-full bg-[color:var(--bg-soft)] px-2 py-0.5 text-[11px] text-[color:var(--muted-foreground)]"
              >
                {topic}
              </span>
            ))}
          </p>
        )}
      </div>
      <div className="flex items-center gap-0.5">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Edit"
          onClick={onEdit}
        >
          <Pencil className="size-4" aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Delete"
          onClick={onDelete}
        >
          <Trash2 className="size-4 text-[color:var(--error)]" aria-hidden="true" />
        </Button>
      </div>
    </li>
  );
}

function ChapterForm({
  bookId,
  chapter,
  onCancel,
  onSaved,
}: {
  bookId: string;
  chapter: AdminChapter;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [v, setV] = useState({ ...chapter, topicsText: chapter.topics.join(", ") });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await saveChapter(bookId, {
        id: v.id || undefined,
        number: v.number,
        title: v.title,
        titleBn: v.titleBn,
        summary: v.summary,
        topics: v.topicsText,
        isSample: v.isSample,
      });
      if (result.ok) {
        toast.success("Chapter saved.");
        onSaved();
      } else if (result.errors) {
        setErrors(result.errors);
        toast.error(Object.values(result.errors)[0] ?? "Some fields need attention.");
      } else toast.error(result.error ?? "Could not save.");
    });
  }

  return (
    <form
      onSubmit={submit}
      className="grid gap-3 rounded-lg border border-[color:var(--brand)] bg-[#eef2fa] p-3 sm:grid-cols-[5rem_1fr_1fr]"
    >
      <div className="space-y-1">
        <Label htmlFor="chapter-number">No.</Label>
        <Input
          id="chapter-number"
          type="number"
          min={1}
          value={v.number}
          onChange={(e) => setV({ ...v, number: Number(e.target.value) || 1 })}
          className="h-10 font-latin"
          aria-invalid={errors.number ? true : undefined}
        />
        {errors.number && (
          <p className="text-xs text-[color:var(--error)]">{errors.number}</p>
        )}
      </div>
      <div className="space-y-1">
        <Label htmlFor="chapter-title">Title (English)</Label>
        <Input
          id="chapter-title"
          value={v.title}
          onChange={(e) => setV({ ...v, title: e.target.value })}
          className="h-10"
          aria-invalid={errors.title ? true : undefined}
        />
        {errors.title && (
          <p className="text-xs text-[color:var(--error)]">{errors.title}</p>
        )}
      </div>
      <div className="space-y-1" lang="bn">
        <Label htmlFor="chapter-title-bn">Title (Bangla, optional)</Label>
        <Input
          id="chapter-title-bn"
          value={v.titleBn}
          onChange={(e) => setV({ ...v, titleBn: e.target.value })}
          className="h-10"
        />
      </div>
      <div className="space-y-1 sm:col-span-3">
        <Label htmlFor="chapter-summary">One-line summary</Label>
        <Input
          id="chapter-summary"
          value={v.summary}
          onChange={(e) => setV({ ...v, summary: e.target.value })}
          className="h-10"
        />
      </div>
      <div className="space-y-1 sm:col-span-3">
        <Label htmlFor="chapter-topics">Topics (comma separated, 3 to 6)</Label>
        <Input
          id="chapter-topics"
          value={v.topicsText}
          onChange={(e) => setV({ ...v, topicsText: e.target.value })}
          placeholder="Echogenicity, Probe types, Artifacts"
          className="h-10"
        />
      </div>
      <label className="flex items-center gap-2 text-sm sm:col-span-3">
        <input
          type="checkbox"
          checked={v.isSample}
          onChange={(e) => setV({ ...v, isSample: e.target.checked })}
        />
        This is the free sample chapter
      </label>
      <div className="flex gap-2 sm:col-span-3">
        <Button type="submit" variant="brand" size="cta" disabled={pending}>
          {pending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Check className="size-4" aria-hidden="true" />
          )}
          Save chapter
        </Button>
        <Button type="button" variant="outline" size="cta" onClick={onCancel}>
          <X className="size-4" aria-hidden="true" />
          Cancel
        </Button>
      </div>
    </form>
  );
}
