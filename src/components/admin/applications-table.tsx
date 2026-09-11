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
import { LEAD_SOURCE_LABELS_BN } from "@/lib/lead-source";
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
  bmdc: string | null;
  location: string | null;
  preferredDate: string | null;
  message: string | null;
  adminNote: string | null;
  source: string | null;
  referralCode: string | null;
  campaign: string | null;
  createdAt: string;
};

const TYPE_LABELS: Record<string, string> = {
  ADMISSION: "ভর্তি আবেদন",
  FREE_CLASS: "ফ্রি ক্লাস",
  CONTACT: "যোগাযোগ",
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
        toast.success(`${result.count} টি আবেদনের অবস্থা পরিবর্তন হয়েছে।`);
        setSelected(new Set());
        router.refresh();
      } else {
        toast.error(result.error ?? "পরিবর্তন করা যায়নি।");
      }
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      const result = await deleteApplication(id);
      if (result.ok) {
        toast.success("মুছে ফেলা হয়েছে।");
        setDetail(null);
        router.refresh();
      } else {
        toast.error(result.error ?? "মুছে ফেলা যায়নি।");
      }
    });
  }

  return (
    <>
      {selected.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-[color:var(--brand)]/20 bg-[color:var(--brand-soft)] p-3 text-sm">
          <span className="font-medium">{selected.size} টি বাছাই করা হয়েছে</span>
          <span className="text-[color:var(--muted-foreground)]">
            অবস্থা পরিবর্তন করুন:
          </span>
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
                  aria-label="সব বাছাই করুন"
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
                নাম ও ফোন
              </th>
              <th scope="col" className="px-4 py-3 text-start font-semibold">
                ধরন
              </th>
              <th
                scope="col"
                className="hidden px-4 py-3 text-start font-semibold lg:table-cell"
              >
                কোর্স
              </th>
              <th
                scope="col"
                className="hidden px-4 py-3 text-start font-semibold lg:table-cell"
              >
                সোর্স
              </th>
              <th
                scope="col"
                className="hidden px-4 py-3 text-start font-semibold sm:table-cell"
              >
                তারিখ
              </th>
              <th scope="col" className="px-4 py-3 text-start font-semibold">
                অবস্থা
              </th>
              <th scope="col" className="px-4 py-3 text-end font-semibold">
                কাজ
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[color:var(--border)]">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-[color:var(--bg-soft)]">
                <td className="px-3 py-2.5">
                  <input
                    type="checkbox"
                    aria-label={`${row.name} বাছাই করুন`}
                    checked={selected.has(row.id)}
                    onChange={() => toggle(row.id)}
                    className="size-4 accent-[color:var(--brand)]"
                  />
                </td>
                <td className="px-4 py-2.5">
                  <p className="font-medium">{row.name}</p>
                  <p className="font-latin text-xs text-[color:var(--muted-foreground)]">
                    {displayPhone(row.phone)}
                  </p>
                </td>
                <td className="px-4 py-2.5 whitespace-nowrap">
                  {TYPE_LABELS[row.type] ?? row.type}
                </td>
                <td className="hidden px-4 py-2.5 lg:table-cell">
                  {row.courseName ?? "—"}
                </td>
                <td className="hidden px-4 py-2.5 lg:table-cell">
                  {row.source ? (
                    <AdminBadge tone="neutral">
                      {LEAD_SOURCE_LABELS_BN[
                        row.source as keyof typeof LEAD_SOURCE_LABELS_BN
                      ] ?? row.source}
                    </AdminBadge>
                  ) : (
                    <span className="text-[color:var(--muted-foreground)]">—</span>
                  )}
                </td>
                <td className="hidden px-4 py-2.5 whitespace-nowrap sm:table-cell">
                  {formatDate(row.createdAt, "bn")}
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
                      aria-label="বিস্তারিত"
                      onClick={() => setDetail(row)}
                    >
                      <Eye className="size-4" aria-hidden="true" />
                    </Button>
                    <Button asChild variant="ghost" size="icon-sm" aria-label="কল">
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
                <DialogTitle>{detail.name}</DialogTitle>
              </DialogHeader>

              <dl className="space-y-2.5 text-sm">
                <Row label="ধরন" value={TYPE_LABELS[detail.type] ?? detail.type} />
                <Row label="ফোন" value={displayPhone(detail.phone)} latin />
                {detail.whatsapp && (
                  <Row label="WhatsApp" value={displayPhone(detail.whatsapp)} latin />
                )}
                {detail.email && <Row label="ইমেইল" value={detail.email} latin />}
                {detail.courseName && <Row label="কোর্স" value={detail.courseName} />}
                {detail.batchName && <Row label="ব্যাচ" value={detail.batchName} />}
                {detail.qualification && (
                  <Row label="যোগ্যতা" value={detail.qualification} />
                )}
                {detail.medicalCollege && (
                  <Row label="মেডিকেল কলেজ" value={detail.medicalCollege} />
                )}
                {detail.bmdc && <Row label="BMDC" value={detail.bmdc} latin />}
                {detail.location && <Row label="এলাকা" value={detail.location} />}
                {detail.preferredDate && (
                  <Row
                    label="পছন্দের তারিখ"
                    value={formatDate(detail.preferredDate, "bn")}
                  />
                )}
                <Row label="জমা" value={formatDate(detail.createdAt, "bn")} />
                {detail.referralCode && (
                  <Row label="রেফারেল কোড" value={detail.referralCode} latin />
                )}
                {detail.campaign && (
                  <Row label="ক্যাম্পেইন" value={detail.campaign} latin />
                )}
                {detail.message && (
                  <div>
                    <dt className="text-[color:var(--muted-foreground)]">মেসেজ</dt>
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
                    কল করুন
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
                  মুছে ফেলুন
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
        সোর্স
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
              toast.success("সোর্স পরিবর্তন হয়েছে।");
              onSaved();
            } else {
              toast.error(result.error ?? "পরিবর্তন করা যায়নি।");
            }
          });
        }}
        className="mt-1 h-11 w-full rounded-lg border border-[color:var(--input)] bg-white px-3 text-sm focus-visible:border-[color:var(--brand)] focus-visible:outline-none"
      >
        <option value="">— জানা নেই —</option>
        {Object.entries(LEAD_SOURCE_LABELS_BN).map(([value, label]) => (
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
        অফিস নোট
      </label>
      <Textarea
        id={`note-${id}`}
        value={note}
        rows={3}
        onChange={(event) => setNote(event.target.value)}
        placeholder="কী কথা হয়েছে, পরবর্তী ধাপ ইত্যাদি লিখে রাখুন"
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
              toast.success("নোট সংরক্ষিত হয়েছে।");
              onSaved();
            } else {
              toast.error(result.error ?? "সংরক্ষণ করা যায়নি।");
            }
          })
        }
      >
        নোট সংরক্ষণ করুন
      </Button>
    </div>
  );
}
