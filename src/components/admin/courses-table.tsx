"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
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
import { Copy, GripVertical, Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  deleteCourse,
  duplicateCourse,
  reorderCourses,
  setCourseFlag,
} from "@/app/actions/admin-courses";
import { AdminBadge } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { formatMoney } from "@/lib/format";

export type AdminCourse = {
  id: string;
  code: string;
  slug: string;
  nameBn: string | null;
  nameEn: string;
  level: string;
  courseFee: number;
  published: boolean;
  admissionOpen: boolean;
  routineCount: number;
};

const LEVELS: Record<string, string> = {
  CERTIFICATE: "Certificates",
  DIPLOMA: "Diploma",
  SPECIAL: "Special",
};

/** Course list with drag-to-reorder, inline toggles and duplicate (7.3). */
export function CoursesTable({ courses }: { courses: AdminCourse[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(courses);
  const [pendingDelete, setPendingDelete] = useState<AdminCourse | null>(null);
  const [pending, startTransition] = useTransition();

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
      const result = await reorderCourses(next.map((row) => row.id));
      if (result.ok) toast.success("Order saved.");
      else {
        toast.error(result.error ?? "The order could not be saved.");
        setRows(courses);
      }
    });
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
        <SortableContext
          items={rows.map((row) => row.id)}
          strategy={verticalListSortingStrategy}
        >
          <ul className="space-y-2">
            {rows.map((course) => (
              <CourseRow
                key={course.id}
                course={course}
                onDelete={() => setPendingDelete(course)}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      {pending && (
        <p className="mt-3 flex items-center gap-2 text-xs text-[color:var(--muted-foreground)]">
          <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
          Saving order…
        </p>
      )}

      <Dialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this course?</DialogTitle>
            <DialogDescription>
              “{pendingDelete?.nameEn}” and its routine will be deleted permanently. If
              students or batches are linked to it, deletion is refused; unpublish the
              course instead.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" size="cta">
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              size="cta"
              onClick={() => {
                const target = pendingDelete;
                if (!target) return;
                startTransition(async () => {
                  const result = await deleteCourse(target.id);
                  if (result.ok) {
                    toast.success("Deleted.");
                    setRows((current) => current.filter((row) => row.id !== target.id));
                    setPendingDelete(null);
                    router.refresh();
                  } else {
                    toast.error(result.error ?? "Could not delete.");
                  }
                });
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function CourseRow({
  course,
  onDelete,
}: {
  course: AdminCourse;
  onDelete: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: course.id });

  function toggle(field: "published" | "admissionOpen", value: boolean) {
    startTransition(async () => {
      const result = await setCourseFlag(course.id, field, value);
      if (!result.ok) toast.error(result.error ?? "The change could not be saved.");
      router.refresh();
    });
  }

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
      }}
      className="flex flex-wrap items-center gap-3 rounded-[14px] border border-[color:var(--border)] bg-white p-3 shadow-[var(--shadow-card)] sm:p-4"
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

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/admin/courses/${course.id}`}
            className="font-medium text-[color:var(--brand)] hover:underline"
          >
            {course.nameEn}
          </Link>
          {course.nameBn && (
            <span lang="bn" className="text-sm text-[color:var(--muted-foreground)]">
              {course.nameBn}
            </span>
          )}
          <AdminBadge tone="brand">{course.code}</AdminBadge>
          <AdminBadge>{LEVELS[course.level] ?? course.level}</AdminBadge>
        </div>
        <p className="mt-0.5 text-xs text-[color:var(--muted-foreground)]">
          {course.courseFee > 0
            ? formatMoney(course.courseFee, "en")
            : "Contact for fee"}{" "}
          · {course.routineCount} classes · /{course.slug}
        </p>
      </div>

      <label className="flex items-center gap-2 text-xs">
        <Switch
          checked={course.admissionOpen}
          disabled={pending}
          onCheckedChange={(next) => toggle("admissionOpen", next)}
          aria-label="Admission open"
        />
        Admission
      </label>

      <label className="flex items-center gap-2 text-xs">
        <Switch
          checked={course.published}
          disabled={pending}
          onCheckedChange={(next) => toggle("published", next)}
          aria-label="Published"
        />
        Published
      </label>

      <div className="flex items-center gap-0.5">
        <Button asChild variant="ghost" size="icon-sm" aria-label="Edit">
          <Link href={`/admin/courses/${course.id}`}>
            <Pencil className="size-4" aria-hidden="true" />
          </Link>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Copy"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await duplicateCourse(course.id);
              if (result.ok) {
                toast.success("Course copied (unpublished).");
                router.push(`/admin/courses/${result.id}`);
              } else {
                toast.error(result.error ?? "Could not copy.");
              }
            })
          }
        >
          <Copy className="size-4" aria-hidden="true" />
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
