"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, Loader2, Phone } from "lucide-react";
import { toast } from "sonner";

import { resolveAlert } from "@/app/actions/admin-alerts";
import { AdminBadge } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { telHref } from "@/lib/phone";

type Alert = {
  id: string;
  type: string;
  message: string;
  status: string;
  note: string | null;
  createdAt: string;
  resolvedBy: string | null;
  studentId: string | null;
  studentPhone: string | null;
};

const TYPES = {
  DROPOUT_RISK: { label: "Stopped coming", tone: "warning" },
  OVERDUE_FEES: { label: "Fees overdue", tone: "danger" },
  DOCS_MISSING: { label: "Papers missing", tone: "neutral" },
} as const;

/** One alert, with the phone number that is usually the answer to it. */
export function AlertRow({ alert }: { alert: Alert }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const type = TYPES[alert.type as keyof typeof TYPES] ?? TYPES.DOCS_MISSING;

  return (
    <li className="flex flex-wrap items-center gap-3 p-4">
      <div className="min-w-0 flex-1">
        <AdminBadge tone={type.tone}>{type.label}</AdminBadge>
        <p className="mt-1">{alert.message}</p>
        <p className="text-xs text-[color:var(--muted-foreground)]">
          {formatDate(alert.createdAt, "en")}
          {alert.note ? ` · closed: ${alert.note}` : ""}
          {alert.resolvedBy ? ` · ${alert.resolvedBy}` : ""}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {alert.studentPhone && (
          <Button asChild variant="outline" size="sm">
            <a href={telHref(alert.studentPhone)}>
              <Phone className="size-4" aria-hidden="true" />
              Call
            </a>
          </Button>
        )}
        {alert.studentId && (
          <Button asChild variant="ghost" size="sm">
            <Link href={`/admin/students/${alert.studentId}`}>Student</Link>
          </Button>
        )}
        {alert.status === "OPEN" && (
          <Button
            type="button"
            variant="brand"
            size="sm"
            disabled={pending}
            onClick={() => {
              const note = window.prompt("What was done about it?");
              if (note === null) return;
              startTransition(async () => {
                const result = await resolveAlert(alert.id, note);
                if (!result.ok) {
                  toast.error(result.error ?? "Could not close it.");
                  return;
                }
                toast.success("Closed.");
                router.refresh();
              });
            }}
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Check className="size-4" aria-hidden="true" />
            )}
            Close
          </Button>
        )}
      </div>
    </li>
  );
}
