"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, Loader2, Phone, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  bulkSetStatus,
  deleteApplication,
  setApplicationNote,
} from "@/app/actions/admin-applications";
import { setApplicationSource } from "@/app/actions/admin-leads";
import { AdminBadge } from "@/components/admin/ui";
import { LEAD_SOURCE_LABELS } from "@/lib/lead-source";
import { langOf } from "@/lib/lang";
import {
  APPLICATION_STATUS_LABELS,
  ApplicationStatusSelect,
} from "@/components/admin/application-status-select";
import { WhatsAppIcon } from "@/components/site/icons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/format";
import { displayPhone, telHref } from "@/lib/phone";
import { waLink } from "@/lib/whatsapp";

export type AdminApplication = {
  id: string;
  type: string;
  status: string;
  name: string;
  phone: string;
  whatsapp: string | null;
  email: string | null;
  courseName: string | null;
  batchName: string | null;
  qualification: string | null;
  medicalCollege: string | null;
  fatherName: string | null;
  motherName: string | null;
  dateOfBirth: string | null;
  religion: string | null;
  nationalId: string | null;
  bloodGroup: string | null;
  employment: string | null;
  presentAddress: string | null;
  permanentAddress: string | null;
  education: Array<{ exam: string; year: string; gpa: string; board: string }>;
  bmdc: string | null;
  location: string | null;
  preferredDate: string | null;
  message: string | null;
  adminNote: string | null;
  source: string | null;
  referralCode: string | null;
  campaign: string | null;
  /** Sample chapter downloads (BOOK_SAMPLE rows only). */
  downloads: number;
  createdAt: string;
};

const EMPLOYMENT_LABELS: Record<string, string> = {
  GOVT: "Government",
  PRIVATE: "Private",
  OTHER: "Other",
};

const TYPE_LABELS: Record<string, string> = {
  ADMISSION: "Admission application",
  FREE_CLASS: "Free class",
  CONTACT: "Contact",
  BOOK_SAMPLE: "Book sample",
};

/** Applications inbox with selection, bulk status change and a detail view. */
export function ApplicationsTable({ rows }: { rows: AdminApplication[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detail, setDetail] = useState<AdminApplication | null>(null);
  const [pending, startTransition] = useTransition();

  const allSelected = rows.length > 0 && selected.size === rows.length;

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function applyBulk(status: string) {
    startTransition(async () => {
      const result = await bulkSetStatus([...selected], status);
      if (result.ok) {
        toast.success(`Status changed for ${result.count} applications.`);
        setSelected(new Set());
        router.refresh();
      } else {
        toast.error(result.error ?? "The change could not be saved.");
      }
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      const result = await deleteApplication(id);
      if (result.ok) {
        toast.success("Deleted.");
        setDetail(null);
        router.refresh();
      } else {
        toast.error(result.error ?? "Could not delete.");
      }
    });
  }

  return (
    <>
      {selected.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-[color:var(--brand)]/20 bg-[color:var(--brand-soft)] p-3 text-sm">
          <span className="font-medium">{selected.size} selected</span>
          <span className="text-[color:var(--muted-foreground)]">Change status:</span>
          {Object.entries(APPLICATION_STATUS_LABELS).map(([value, label]) => (
            <Button
              key={value}
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => applyBulk(value)}
            >
              {label}
            </Button>
          ))}
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
        </div>
      )}

      <div className="overflow-x-auto rounded-[14px] border border-[color:var(--border)] bg-white shadow-[var(--shadow-card)]">
        <table className="w-full min-w-[52rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-[color:var(--border)] bg-[color:var(--bg-soft)]">
              <th scope="col" className="w-10 px-3 py-3">
                <input
                  type="checkbox"
                  aria-label="Select all"
                  checked={allSelected}
                  onChange={(event) =>
                    setSelected(
                      event.target.checked
                        ? new Set(rows.map((row) => row.id))
                        : new Set(),
                    )
                  }
                  className="size-4 accent-[color:var(--brand)]"
                />
              </th>
              <th scope="col" className="px-4 py-3 text-start font-semibold">
                Name & phone
              </th>
              <th scope="col" className="px-4 py-3 text-start font-semibold">
                Type
              </th>
              <th
                scope="col"
                className="hidden px-4 py-3 text-start font-semibold lg:table-cell"
              >
                Course
              </th>
              <th
                scope="col"
                className="hidden px-4 py-3 text-start font-semibold lg:table-cell"
              >
                Source
              </th>
              <th
                scope="col"
                className="hidden px-4 py-3 text-start font-semibold sm:table-cell"
              >
                Date
              </th>
              <th scope="col" className="px-4 py-3 text-start font-semibold">
                Status
              </th>
              <th scope="col" className="px-4 py-3 text-end font-semibold">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[color:var(--border)]">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-[color:var(--bg-soft)]">
                <td className="px-3 py-2.5">
                  <input
                    type="checkbox"
                    aria-label={`Select ${row.name}`}
                    checked={selected.has(row.id)}
                    onChange={() => toggle(row.id)}
                    className="size-4 accent-[color:var(--brand)]"
                  />
                </td>
                <td className="px-4 py-2.5">
                  <p className="font-medium" lang={langOf(row.name)}>
                    {row.name}
                  </p>
                  <p className="font-latin text-xs text-[color:var(--muted-foreground)]">
                    {displayPhone(row.phone)}
                  </p>
                </td>
                <td className="px-4 py-2.5 whitespace-nowrap">
                  {TYPE_LABELS[row.type] ?? row.type}
                  {row.type === "BOOK_SAMPLE" && (
                    <span className="ms-2 font-latin text-xs text-[color:var(--muted-foreground)]">
                      {row.downloads} {row.downloads === 1 ? "download" : "downloads"}
                    </span>
                  )}
                </td>
                <td className="hidden px-4 py-2.5 lg:table-cell">
                  {row.courseName ?? "—"}
                </td>
                <td className="hidden px-4 py-2.5 lg:table-cell">
                  {row.source ? (
                    <AdminBadge tone="neutral">
                      {LEAD_SOURCE_LABELS[
                        row.source as keyof typeof LEAD_SOURCE_LABELS
                      ] ?? row.source}
                    </AdminBadge>
                  ) : (
                    <span className="text-[color:var(--muted-foreground)]">—</span>
                  )}
                </td>
                <td className="hidden px-4 py-2.5 whitespace-nowrap sm:table-cell">
                  {formatDate(row.createdAt, "en")}
                </td>
                <td className="px-4 py-2.5">
                  <ApplicationStatusSelect id={row.id} status={row.status} />
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center justify-end gap-0.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Details"
                      onClick={() => setDetail(row)}
                    >
                      <Eye className="size-4" aria-hidden="true" />
                    </Button>
                    <Button asChild variant="ghost" size="icon-sm" aria-label="Call">
                      <a href={telHref(row.phone)}>
                        <Phone className="size-4" aria-hidden="true" />
                      </a>
                    </Button>
                    <Button
                      asChild
                      variant="ghost"
                      size="icon-sm"
                      aria-label="WhatsApp"
                    >
                      <a
                        href={waLink(row.whatsapp ?? row.phone)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <WhatsAppIcon className="size-4 text-[color:var(--whatsapp)]" />
                      </a>
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={detail !== null} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle lang={langOf(detail.name)}>{detail.name}</DialogTitle>
              </DialogHeader>

              <dl className="space-y-2.5 text-sm">
                <Row label="Type" value={TYPE_LABELS[detail.type] ?? detail.type} />
                {detail.type === "BOOK_SAMPLE" && (
                  <Row label="Downloads" value={String(detail.downloads)} latin />
                )}
                <Row label="Phone" value={displayPhone(detail.phone)} latin />
                {detail.whatsapp && (
                  <Row label="WhatsApp" value={displayPhone(detail.whatsapp)} latin />
                )}
                {detail.email && <Row label="Email" value={detail.email} latin />}
                {detail.courseName && <Row label="Course" value={detail.courseName} />}
                {detail.batchName && <Row label="Batch" value={detail.batchName} />}
                {detail.qualification && (
                  <Row label="Qualification" value={detail.qualification} />
                )}
                {detail.fatherName && (
                  <Row label="Father's name" value={detail.fatherName} />
                )}
                {detail.motherName && (
                  <Row label="Mother's name" value={detail.motherName} />
                )}
                {detail.dateOfBirth && (
                  <Row
                    label="Date of birth"
                    value={formatDate(detail.dateOfBirth, "en")}
                  />
                )}
                {detail.religion && <Row label="Religion" value={detail.religion} />}
                {detail.bloodGroup && (
                  <Row label="Blood group" value={detail.bloodGroup} latin />
                )}
                {detail.employment && (
                  <Row
                    label="Employment"
                    value={EMPLOYMENT_LABELS[detail.employment] ?? detail.employment}
                  />
                )}
                {detail.nationalId && (
                  <Row label="National ID" value={detail.nationalId} latin />
                )}
                {detail.presentAddress && (
                  <Row label="Present address" value={detail.presentAddress} />
                )}
                {detail.permanentAddress &&
                  detail.permanentAddress !== detail.presentAddress && (
                    <Row label="Permanent address" value={detail.permanentAddress} />
                  )}
                {detail.medicalCollege && (
                  <Row label="Medical college" value={detail.medicalCollege} />
                )}
                {detail.bmdc && <Row label="BMDC" value={detail.bmdc} latin />}
                {detail.education.length > 0 && (
                  <div>
                    <dt className="text-xs text-[color:var(--muted-foreground)]">
                      Education
                    </dt>
                    <dd className="mt-1 overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-start text-[color:var(--muted-foreground)]">
                            <th className="pe-3 text-start font-medium">Exam</th>
                            <th className="pe-3 text-start font-medium">Year</th>
                            <th className="pe-3 text-start font-medium">GPA</th>
                            <th className="text-start font-medium">
                              Board / university
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {detail.education.map((row) => (
                            <tr key={row.exam} className="font-latin">
                              <td className="py-0.5 pe-3 font-semibold">{row.exam}</td>
                              <td className="py-0.5 pe-3">{row.year || "—"}</td>
                              <td className="py-0.5 pe-3">{row.gpa || "—"}</td>
                              <td className="py-0.5 font-sans">{row.board || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </dd>
                  </div>
                )}
                {detail.location && <Row label="Area" value={detail.location} />}
                {detail.preferredDate && (
                  <Row
                    label="Preferred date"
                    value={formatDate(detail.preferredDate, "en")}
                  />
                )}
                <Row label="Submitted" value={formatDate(detail.createdAt, "en")} />
                {detail.referralCode && (
                  <Row label="Referral code" value={detail.referralCode} latin />
                )}
                {detail.campaign && (
                  <Row label="Campaign" value={detail.campaign} latin />
                )}
                {detail.message && (
                  <div>
                    <dt className="text-[color:var(--muted-foreground)]">Message</dt>
                    <dd className="mt-1 rounded-lg bg-[color:var(--bg-soft)] p-3 whitespace-pre-wrap">
                      {detail.message}
                    </dd>
                  </div>
                )}
              </dl>

              <SourceEditor
                id={detail.id}
                initial={detail.source ?? ""}
                onSaved={() => router.refresh()}
              />

              <NoteEditor
                id={detail.id}
                initial={detail.adminNote ?? ""}
                onSaved={() => router.refresh()}
              />

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Button asChild variant="whatsapp" size="cta">
                  <a
                    href={waLink(detail.whatsapp ?? detail.phone)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <WhatsAppIcon className="size-4" />
                    WhatsApp
                  </a>
                </Button>
                <Button asChild variant="outline" size="cta">
                  <a href={telHref(detail.phone)}>
                    <Phone className="size-4" aria-hidden="true" />
                    Call
                  </a>
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="cta"
                  className="ms-auto"
                  disabled={pending}
                  onClick={() => remove(detail.id)}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                  Delete
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Row({
  label,
  value,
  latin = false,
}: {
  label: string;
  value: string;
  latin?: boolean;
}) {
  return (
    <div className="flex flex-wrap justify-between gap-2">
      <dt className="text-[color:var(--muted-foreground)]">{label}</dt>
      <dd className={latin ? "font-latin font-medium" : "font-medium"}>{value}</dd>
    </div>
  );
}

/** Staff can correct the attribution the site guessed (addendum 2, A3). */
function SourceEditor({
  id,
  initial,
  onSaved,
}: {
  id: string;
  initial: string;
  onSaved: () => void;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="mt-4">
      <label
        htmlFor={`source-${id}`}
        className="text-sm font-medium text-[color:var(--muted-foreground)]"
      >
        Source
      </label>
      <select
        id={`source-${id}`}
        defaultValue={initial}
        disabled={pending}
        onChange={(event) => {
          const next = event.target.value;
          startTransition(async () => {
            const result = await setApplicationSource(id, next);
            if (result.ok) {
              toast.success("Source changed.");
              onSaved();
            } else {
              toast.error(result.error ?? "The change could not be saved.");
            }
          });
        }}
        className="mt-1 h-11 w-full rounded-lg border border-[color:var(--input)] bg-white px-3 text-sm focus-visible:border-[color:var(--brand)] focus-visible:outline-none"
      >
        <option value="">— unknown —</option>
        {Object.entries(LEAD_SOURCE_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </div>
  );
}

function NoteEditor({
  id,
  initial,
  onSaved,
}: {
  id: string;
  initial: string;
  onSaved: () => void;
}) {
  const [note, setNote] = useState(initial);
  const [pending, startTransition] = useTransition();

  return (
    <div className="mt-4">
      <label
        htmlFor={`note-${id}`}
        className="text-sm font-medium text-[color:var(--muted-foreground)]"
      >
        Office note
      </label>
      <Textarea
        id={`note-${id}`}
        value={note}
        rows={3}
        onChange={(event) => setNote(event.target.value)}
        placeholder="What was discussed, next steps, etc."
        className="mt-1"
      />
      <Button
        type="button"
        variant="outline"
        size="cta"
        className="mt-2"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await setApplicationNote(id, note);
            if (result.ok) {
              toast.success("Note saved.");
              onSaved();
            } else {
              toast.error(result.error ?? "Could not save.");
            }
          })
        }
      >
        Save note
      </Button>
    </div>
  );
}
