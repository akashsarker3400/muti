"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, ClipboardList, Loader2, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { deleteSession, saveSession } from "@/app/actions/admin-attendance";
import { AdminBadge } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/format";

type Session = {
  id: string;
  date: string;
  startTime: string | null;
  topic: string;
  type: string;
  status: string;
  teacherId: string | null;
  teacherName: string | null;
  marked: number;
};

const STATUS = {
  PLANNED: { label: "Planned", tone: "neutral" },
  DONE: { label: "Taken", tone: "success" },
  CANCELLED: { label: "Cancelled", tone: "warning" },
} as const;

const SELECT =
  "h-9 w-full rounded-md border border-[color:var(--input)] bg-white px-2 text-sm focus-visible:border-[color:var(--brand)] focus-visible:outline-none";

/** One class: read-only until the office presses Edit, then saved in place. */
export function SessionRow({
  session,
  teachers,
}: {
  session: Session;
  teachers: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [date, setDate] = useState(session.date.slice(0, 10));
  const [startTime, setStartTime] = useState(session.startTime ?? "");
  const [topic, setTopic] = useState(session.topic);
  const [teacherId, setTeacherId] = useState(session.teacherId ?? "");

  function save() {
    startTransition(async () => {
      const result = await saveSession({
        id: session.id,
        date,
        startTime,
        topic,
        teacherId,
      });
      if (!result.ok) {
        toast.error(result.error ?? "Could not save.");
        return;
      }
      setEditing(false);
      router.refresh();
    });
  }

  function remove() {
    if (!window.confirm(`Delete the class "${session.topic}"?`)) return;
    startTransition(async () => {
      const result = await deleteSession(session.id);
      if (!result.ok) {
        toast.error(result.error ?? "Could not delete.");
        return;
      }
      router.refresh();
    });
  }

  const status = STATUS[session.status as keyof typeof STATUS] ?? STATUS.PLANNED;

  if (editing) {
    return (
      <tr className="bg-[color:var(--bg-soft)]">
        <td className="px-4 py-2.5">
          <Input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            aria-label="Date"
            className="h-9 font-latin"
          />
          <Input
            value={startTime}
            onChange={(event) => setStartTime(event.target.value)}
            placeholder="10:00 am"
            aria-label="Start time"
            className="mt-1 h-9"
          />
        </td>
        <td className="px-4 py-2.5">
          <Input
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
            aria-label="Topic"
            className="h-9"
          />
        </td>
        <td className="hidden px-4 py-2.5 lg:table-cell">
          <select
            value={teacherId}
            onChange={(event) => setTeacherId(event.target.value)}
            aria-label="Teacher"
            className={SELECT}
          >
            <option value="">Not assigned</option>
            {teachers.map((teacher) => (
              <option key={teacher.id} value={teacher.id}>
                {teacher.name}
              </option>
            ))}
          </select>
        </td>
        <td className="px-4 py-2.5" colSpan={2}>
          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="brand"
              size="sm"
              disabled={pending}
              onClick={save}
            >
              {pending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Check className="size-4" aria-hidden="true" />
              )}
              Save
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Cancel"
              onClick={() => setEditing(false)}
            >
              <X className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="hover:bg-[color:var(--bg-soft)]">
      <td className="px-4 py-2.5 whitespace-nowrap">
        {formatDate(session.date, "en")}
        {session.startTime && (
          <span className="block text-xs text-[color:var(--muted-foreground)]">
            {session.startTime}
          </span>
        )}
      </td>
      <td className="px-4 py-2.5">
        {session.topic}
        <span className="block text-xs text-[color:var(--muted-foreground)]">
          {session.type.toLowerCase()}
        </span>
      </td>
      <td className="hidden px-4 py-2.5 lg:table-cell">
        {session.teacherName ?? (
          <span className="text-[color:var(--muted-foreground)]">not assigned</span>
        )}
      </td>
      <td className="px-4 py-2.5">
        <AdminBadge tone={status.tone}>{status.label}</AdminBadge>
        {session.marked > 0 && (
          <span className="block text-xs text-[color:var(--muted-foreground)]">
            {session.marked} marked
          </span>
        )}
      </td>
      <td className="px-4 py-2.5">
        <div className="flex items-center justify-end gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/admin/sessions/${session.id}`}>
              <ClipboardList className="size-4" aria-hidden="true" />
              Register
            </Link>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setEditing(true)}
          >
            Edit
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Delete ${session.topic}`}
            disabled={pending}
            onClick={remove}
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </td>
    </tr>
  );
}
