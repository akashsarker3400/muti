"use client";

import { Fragment, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  Handshake,
  Loader2,
  MessageSquare,
  Printer,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

import {
  clearCertificateDelivery,
  notifyCertificateReady,
  recordCertificateDelivery,
  setCertificateApproval,
} from "@/app/actions/admin-certificates";
import { AdminBadge, Panel } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/format";
import { langOf } from "@/lib/lang";

export type RegisterRow = {
  id: string;
  certificateNo: string;
  type: string;
  status: string;
  studentName: string;
  studentRoll: string;
  courseCode: string;
  issuedAt: string | null;
  approvedAt: string | null;
  approvedBy: string | null;
  issuedBy: string | null;
  deliveredAt: string | null;
  deliveredTo: string | null;
  deliveryNote: string | null;
  printCount: number;
  lastPrintAt: string | null;
  lastPrintBy: string | null;
};

const TYPE_LABEL: Record<string, string> = {
  COURSE: "Course",
  SEMESTER: "Semester",
  BOARD: "Board",
};

/**
 * One table for the whole life of a certificate: approve, print, hand over.
 *
 * Approval is a bulk action because that is how it happens in the office — the
 * principal goes through a batch in one sitting — while a handover is always
 * one person at a time, so it opens a small form under its own row.
 */
export function CertificateRegister({
  rows,
  canApprove,
}: {
  rows: RegisterRow[];
  canApprove: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [ticked, setTicked] = useState<Set<string>>(new Set());
  const [openHandover, setOpenHandover] = useState<string | null>(null);

  const pendingApproval = rows.filter(
    (row) => !row.approvedAt && row.status === "VALID",
  );
  const approvedRows = rows.filter((row) => row.approvedAt && row.status === "VALID");
  const selected = [...ticked].filter((id) => rows.some((row) => row.id === id));

  function toggle(id: string, next: boolean) {
    setTicked((current) => {
      const copy = new Set(current);
      if (next) copy.add(id);
      else copy.delete(id);
      return copy;
    });
  }

  function approve(approveThem: boolean) {
    if (selected.length === 0) {
      toast.error("Tick the certificates first.");
      return;
    }
    if (
      approveThem &&
      !window.confirm(
        `Approve ${selected.length} certificate${selected.length === 1 ? "" : "s"}? They can then be printed and handed over.`,
      )
    ) {
      return;
    }

    startTransition(async () => {
      const result = await setCertificateApproval(selected, approveThem);
      if (!result.ok) {
        toast.error(result.error ?? "Could not save that.");
        return;
      }
      toast.success(
        approveThem
          ? `${result.changed} approved.`
          : `${result.changed} sent back to draft.`,
      );
      setTicked(new Set());
      router.refresh();
    });
  }

  function notify() {
    const ready = selected.filter((id) =>
      rows.some((row) => row.id === id && row.approvedAt && row.status === "VALID"),
    );
    if (ready.length === 0) {
      toast.error("Tick approved certificates first.");
      return;
    }
    startTransition(async () => {
      const result = await notifyCertificateReady(ready);
      if (!result.ok) {
        toast.error(result.error ?? "Could not send.");
        return;
      }
      toast.success(
        `${result.sent} student${result.sent === 1 ? "" : "s"} told by SMS.` +
          (result.skipped ? ` ${result.skipped} skipped (see Messages).` : ""),
      );
      setTicked(new Set());
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {approvedRows.length > 0 && (
        <Panel className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-[color:var(--muted-foreground)]">
            Tick the approved certificates and tell those students by SMS that they can
            collect them. One message per certificate, ever.
          </p>
          <Button
            type="button"
            variant="outline"
            size="cta"
            disabled={pending || selected.length === 0}
            onClick={notify}
          >
            <MessageSquare className="size-4" aria-hidden="true" />
            Tell {selected.length > 0 ? selected.length : ""} by SMS
          </Button>
        </Panel>
      )}

      {canApprove && pendingApproval.length > 0 && (
        <Panel className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm font-medium">
            <Checkbox
              checked={
                selected.length > 0 && selected.length === pendingApproval.length
              }
              onCheckedChange={(next) =>
                setTicked(
                  next === true
                    ? new Set(pendingApproval.map((row) => row.id))
                    : new Set(),
                )
              }
            />
            Tick all waiting ({pendingApproval.length})
          </label>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="cta"
              disabled={pending || selected.length === 0}
              onClick={() => approve(false)}
            >
              <RotateCcw className="size-4" aria-hidden="true" />
              Back to draft
            </Button>
            <Button
              type="button"
              variant="brand"
              size="cta"
              disabled={pending || selected.length === 0}
              onClick={() => approve(true)}
            >
              {pending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <ShieldCheck className="size-4" aria-hidden="true" />
              )}
              Approve {selected.length > 0 ? selected.length : ""}
            </Button>
          </div>
        </Panel>
      )}

      <Panel padded={false} className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[52rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-[color:var(--border)] bg-[color:var(--bg-soft)]">
                <th scope="col" className="w-10 px-4 py-3" />
                <th scope="col" className="px-4 py-3 text-start font-semibold">
                  Number
                </th>
                <th scope="col" className="px-4 py-3 text-start font-semibold">
                  Student
                </th>
                <th
                  scope="col"
                  className="hidden px-4 py-3 text-start font-semibold lg:table-cell"
                >
                  Type
                </th>
                <th scope="col" className="px-4 py-3 text-start font-semibold">
                  Approval
                </th>
                <th
                  scope="col"
                  className="hidden px-4 py-3 text-start font-semibold lg:table-cell"
                >
                  Prints
                </th>
                <th scope="col" className="px-4 py-3 text-start font-semibold">
                  Handover
                </th>
                <th scope="col" className="px-4 py-3 text-end font-semibold">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--border)]">
              {rows.map((row) => {
                const approved = Boolean(row.approvedAt);
                const revoked = row.status === "REVOKED";
                return (
                  <Fragment key={row.id}>
                    <tr className="hover:bg-[color:var(--bg-soft)]">
                      <td className="px-4 py-2.5">
                        <Checkbox
                          checked={ticked.has(row.id)}
                          disabled={revoked || Boolean(row.deliveredAt)}
                          onCheckedChange={(next) => toggle(row.id, next === true)}
                          aria-label={`Select ${row.certificateNo}`}
                        />
                      </td>
                      <td className="px-4 py-2.5 font-latin whitespace-nowrap">
                        {row.certificateNo}
                        {revoked && (
                          <span className="ms-2">
                            <AdminBadge tone="danger">Revoked</AdminBadge>
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <span lang={langOf(row.studentName)}>{row.studentName}</span>
                        <span className="block font-latin text-xs text-[color:var(--muted-foreground)]">
                          {row.studentRoll} · {row.courseCode}
                          {row.issuedAt ? ` · ${formatDate(row.issuedAt, "en")}` : ""}
                        </span>
                      </td>
                      <td className="hidden px-4 py-2.5 lg:table-cell">
                        {TYPE_LABEL[row.type] ?? row.type}
                      </td>
                      <td className="px-4 py-2.5">
                        {approved ? (
                          <>
                            <AdminBadge tone="success">Approved</AdminBadge>
                            <span className="block text-xs text-[color:var(--muted-foreground)]">
                              {formatDate(row.approvedAt, "en")}
                              {row.approvedBy ? ` · ${row.approvedBy}` : ""}
                            </span>
                          </>
                        ) : (
                          <>
                            <AdminBadge tone="warning">Draft</AdminBadge>
                            {row.issuedBy && (
                              <span className="block text-xs text-[color:var(--muted-foreground)]">
                                prepared by {row.issuedBy}
                              </span>
                            )}
                          </>
                        )}
                      </td>
                      <td className="hidden px-4 py-2.5 lg:table-cell">
                        {row.printCount === 0 ? (
                          <span className="text-[color:var(--muted-foreground)]">
                            not printed
                          </span>
                        ) : (
                          <>
                            <span className="font-latin">{row.printCount}×</span>
                            <span className="block text-xs text-[color:var(--muted-foreground)]">
                              last {formatDate(row.lastPrintAt, "en")}
                              {row.lastPrintBy ? ` · ${row.lastPrintBy}` : ""}
                            </span>
                          </>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        {row.deliveredAt ? (
                          <>
                            <AdminBadge tone="neutral">
                              {formatDate(row.deliveredAt, "en")}
                            </AdminBadge>
                            <span
                              className="block text-xs text-[color:var(--muted-foreground)]"
                              lang={langOf(row.deliveredTo ?? "")}
                            >
                              {row.deliveredTo}
                            </span>
                          </>
                        ) : (
                          <span className="text-[color:var(--muted-foreground)]">
                            —
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-end gap-2">
                          {approved && !revoked && (
                            <Button asChild variant="outline" size="sm">
                              <a
                                href={`/admin/certificates/${row.id}/print`}
                                target="_blank"
                                rel="noopener"
                              >
                                <Printer className="size-4" aria-hidden="true" />
                                Print
                              </a>
                            </Button>
                          )}
                          {approved && !revoked && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setOpenHandover(openHandover === row.id ? null : row.id)
                              }
                            >
                              <Handshake className="size-4" aria-hidden="true" />
                              {row.deliveredAt ? "Edit handover" : "Handover"}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {openHandover === row.id && (
                      <tr className="bg-[color:var(--bg-soft)]">
                        <td colSpan={8} className="px-4 py-4">
                          <HandoverForm
                            row={row}
                            onDone={() => {
                              setOpenHandover(null);
                              router.refresh();
                            }}
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

/** Who took the certificate away, and when. */
function HandoverForm({ row, onDone }: { row: RegisterRow; onDone: () => void }) {
  const [pending, startTransition] = useTransition();
  const [to, setTo] = useState(row.deliveredTo ?? row.studentName);
  const [when, setWhen] = useState(
    row.deliveredAt
      ? row.deliveredAt.slice(0, 10)
      : new Date().toISOString().slice(0, 10),
  );
  const [note, setNote] = useState(row.deliveryNote ?? "");

  function save() {
    startTransition(async () => {
      const result = await recordCertificateDelivery({
        id: row.id,
        deliveredTo: to,
        deliveredAt: when,
        note,
      });
      if (!result.ok) {
        toast.error(result.error ?? "Could not save the handover.");
        return;
      }
      toast.success("Handover recorded.");
      onDone();
    });
  }

  function undo() {
    if (!window.confirm("Remove the handover record for this certificate?")) return;
    startTransition(async () => {
      const result = await clearCertificateDelivery(row.id);
      if (!result.ok) {
        toast.error(result.error ?? "Could not undo that.");
        return;
      }
      toast.success("Handover removed.");
      onDone();
    });
  }

  return (
    <div className="grid gap-3 sm:grid-cols-[1fr_10rem_1fr_auto] sm:items-end">
      <div>
        <Label htmlFor={`to-${row.id}`}>Collected by</Label>
        <Input
          id={`to-${row.id}`}
          value={to}
          onChange={(event) => setTo(event.target.value)}
          placeholder="The student, or the name of whoever collected it"
          className="mt-1 h-11"
        />
      </div>
      <div>
        <Label htmlFor={`when-${row.id}`}>Date</Label>
        <Input
          id={`when-${row.id}`}
          type="date"
          value={when}
          onChange={(event) => setWhen(event.target.value)}
          className="mt-1 h-11 font-latin"
        />
      </div>
      <div>
        <Label htmlFor={`note-${row.id}`}>Note</Label>
        <Input
          id={`note-${row.id}`}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Relation, phone, NID seen…"
          className="mt-1 h-11"
        />
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="brand"
          size="cta"
          disabled={pending}
          onClick={save}
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <BadgeCheck className="size-4" aria-hidden="true" />
          )}
          Save
        </Button>
        {row.deliveredAt && (
          <Button
            type="button"
            variant="outline"
            size="cta"
            disabled={pending}
            onClick={undo}
          >
            Undo
          </Button>
        )}
      </div>
    </div>
  );
}
