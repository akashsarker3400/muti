"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
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
import { ExternalLink, GripVertical, MousePointerClick } from "lucide-react";
import { toast } from "sonner";

import {
  deleteResource,
  reorderResource,
  setResourceFlag,
} from "@/app/actions/admin-resource";
import { FlagToggle } from "@/components/admin/flag-toggle";
import { RowActions } from "@/components/admin/row-actions";
import { AdminBadge } from "@/components/admin/ui";

export type AdminPromo = {
  id: string;
  slot: "PROMO_A" | "PROMO_B";
  title: string;
  image: string;
  link: string | null;
  isOffer: boolean;
  showAsPopup: boolean;
  active: boolean;
  live: boolean;
  startAt: string;
  endAt: string;
  clicks: number;
};

const SLOT_LABEL = { PROMO_A: "Slot A", PROMO_B: "Slot B" } as const;

/** Promo list per slot with drag-to-reorder, active switch and click counts. */
export function PromosTable({
  slot,
  promos,
}: {
  slot: "PROMO_A" | "PROMO_B";
  promos: AdminPromo[];
}) {
  const [rows, setRows] = useState(promos);
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
      const result = await reorderResource(
        "promos",
        next.map((row) => row.id),
      );
      if (result.ok) toast.success("Order saved.");
      else {
        toast.error(result.error ?? "The order could not be saved.");
        setRows(promos);
      }
    });
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
    >
      <SortableContext
        items={rows.map((row) => row.id)}
        strategy={verticalListSortingStrategy}
      >
        <ul className="space-y-2" data-testid={`promos-${slot}`}>
          {rows.map((promo) => (
            <PromoRow key={promo.id} promo={promo} />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function PromoRow({ promo }: { promo: AdminPromo }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: promo.id });

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

      <span
        className={
          promo.slot === "PROMO_A"
            ? "relative block h-12 w-32 shrink-0 overflow-hidden rounded-md bg-[color:var(--bg-soft)]"
            : "relative block size-14 shrink-0 overflow-hidden rounded-md bg-[color:var(--bg-soft)]"
        }
      >
        <Image src={promo.image} alt="" fill sizes="128px" className="object-cover" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{promo.title}</span>
          <AdminBadge tone="brand">{SLOT_LABEL[promo.slot]}</AdminBadge>
          {promo.isOffer && <AdminBadge tone="danger">Offer</AdminBadge>}
          {promo.showAsPopup && <AdminBadge tone="warning">Popup</AdminBadge>}
          {promo.active && !promo.live && <AdminBadge>Scheduled / expired</AdminBadge>}
          {promo.live && <AdminBadge tone="success">Live</AdminBadge>}
        </div>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-[color:var(--muted-foreground)]">
          <span className="inline-flex items-center gap-1 font-latin">
            <MousePointerClick className="size-3.5" aria-hidden="true" />
            {promo.clicks} clicks
          </span>
          {(promo.startAt || promo.endAt) && (
            <span className="font-latin">
              {promo.startAt || "…"} to {promo.endAt || "…"}
            </span>
          )}
          {promo.link && (
            <span className="inline-flex max-w-[20rem] items-center gap-1 truncate font-latin">
              <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
              {promo.link}
            </span>
          )}
        </p>
      </div>

      <FlagToggle
        value={promo.active}
        label="active"
        onToggle={(next) => setResourceFlag("promos", promo.id, "active", next)}
      />

      <RowActions
        editHref={`/admin/promos/${promo.id}`}
        onDelete={() => deleteResource("promos", promo.id)}
        label={promo.title}
      />
    </li>
  );
}
