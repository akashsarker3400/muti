"use client";

import { useState, useTransition } from "react";
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
import { GripVertical, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { saveCourseRoutine, type RoutineRow } from "@/app/actions/admin-courses";
import { Panel } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { RoutineType } from "@/generated/prisma/enums";

type Row = RoutineRow & { key: string };

const TYPE_LABELS: Record<RoutineType, string> = {
  LECTURE: "Lecture",
  PRACTICAL: "Practical",
  EXAM: "Exam",
  REVIEW: "Review",
};

/**
 * Sortable routine table for a course (section 7.3). Rows are edited inline
 * and saved as a whole, which keeps the ordering consistent.
 */
export function RoutineEditor({
  courseId,
  initial,
}: {
  courseId: string;
  initial: RoutineRow[];
}) {
  const [rows, setRows] = useState<Row[]>(
    initial.map((row, index) => ({ ...row, key: `${index}-${row.id ?? index}` })),
  );
  const [pending, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setRows((current) => {
      const from = current.findIndex((row) => row.key === active.id);
      const to = current.findIndex((row) => row.key === over.id);
      if (from === -1 || to === -1) return current;
      return arrayMove(current, from, to);
    });
  }

  function update(key: string, patch: Partial<Row>) {
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  }

  function addRow() {
    const last = rows[rows.length - 1];
    setRows((current) => [
      ...current,
      {
        key: `new-${Date.now()}`,
        // Carry the last semester forward: routines are entered semester by semester.
        semester: last?.semester ?? "",
        label: "",
        title: "",
        type: "LECTURE",
      },
    ]);
  }

  function save() {
    startTransition(async () => {
      const result = await saveCourseRoutine(
        courseId,
        rows.map(({ key: _key, ...row }) => row),
      );
      if (result.ok) toast.success("Routine saved.");
      else toast.error(result.error ?? "Could not save.");
    });
  }

  return (
    <Panel>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">Class routine / syllabus</h2>
          <p className="text-xs text-[color:var(--muted-foreground)]">
            Drag rows to reorder. Leave the semester empty and the course shows as a
            single list.
          </p>
        </div>
        <Button type="button" variant="outline" size="cta" onClick={addRow}>
          <Plus className="size-4" aria-hidden="true" />
          Add row
        </Button>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-[color:var(--border)] p-6 text-center text-sm text-[color:var(--muted-foreground)]">
          No classes added yet.
        </p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          <SortableContext
            items={rows.map((row) => row.key)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="space-y-2">
              {rows.map((row) => (
                <SortableRow
                  key={row.key}
                  row={row}
                  onChange={(patch) => update(row.key, patch)}
                  onRemove={() =>
                    setRows((current) => current.filter((item) => item.key !== row.key))
                  }
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      <Button
        type="button"
        variant="brand"
        size="cta"
        className="mt-4"
        onClick={save}
        disabled={pending}
      >
        {pending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
        Save routine
      </Button>
    </Panel>
  );
}

function SortableRow({
  row,
  onChange,
  onRemove,
}: {
  row: Row;
  onChange: (patch: Partial<Row>) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: row.key });

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
      }}
      className="grid grid-cols-[auto_1fr_auto] items-start gap-2 rounded-lg border border-[color:var(--border)] bg-white p-2 sm:grid-cols-[auto_10rem_8rem_1fr_9rem_auto]"
    >
      <button
        type="button"
        aria-label="Remove"
        className="mt-1 cursor-grab touch-none text-[color:var(--muted-foreground)] active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-5" aria-hidden="true" />
      </button>

      <Input
        value={row.semester}
        onChange={(event) => onChange({ semester: event.target.value })}
        placeholder="Semester"
        aria-label="Semester"
        className="h-10 text-sm"
      />
      <Input
        value={row.label}
        onChange={(event) => onChange({ label: event.target.value })}
        placeholder="Lecture 1"
        aria-label="Class"
        dir="ltr"
        className="h-10 font-latin text-sm"
      />
      <Input
        value={row.title}
        onChange={(event) => onChange({ title: event.target.value })}
        placeholder="Basic Physics of Ultrasound"
        aria-label="Subject"
        dir="ltr"
        className="h-10 font-latin text-sm"
      />
      <select
        value={row.type}
        onChange={(event) => onChange({ type: event.target.value as RoutineType })}
        aria-label="Type"
        className="h-10 rounded-lg border border-[color:var(--input)] bg-white px-2 text-sm"
      >
        {Object.entries(TYPE_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>

      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Delete row"
        onClick={onRemove}
        className="mt-0.5"
      >
        <Trash2 className="size-4 text-[color:var(--error)]" aria-hidden="true" />
      </Button>
    </li>
  );
}
