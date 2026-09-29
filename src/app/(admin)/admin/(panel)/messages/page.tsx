import Link from "next/link";
import { MessageSquare } from "lucide-react";

import { MessageTest } from "@/components/admin/message-test";
import { RestoreTemplatesButton } from "@/components/admin/restore-templates-button";
import {
  AdminBadge,
  AdminPageHeader,
  EmptyState,
  Panel,
  StatCard,
} from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/lib/admin-auth";
import { formatDateTime } from "@/lib/format";
import { displayPhone } from "@/lib/phone";
import { prisma } from "@/lib/prisma";
import { smsProvider } from "@/lib/sms";
import { whatsAppConfigured } from "@/lib/whatsapp-api";
import { cn } from "cn";

export const dynamic = "force-dynamic";

export const metadata = { title: "Messages" };

const PAGE_SIZE = 50;

const FILTERS = [
  { value: "all", label: "All" },
  { value: "SENT", label: "Sent" },
  { value: "FAILED", label: "Failed" },
  { value: "SKIPPED", label: "Not sent" },
] as const;

const TONE = {
  SENT: "success",
  FAILED: "danger",
  SKIPPED: "warning",
} as const;

/**
 * The outbox (addendum 2, A4).
 *
 * Every SMS and WhatsApp message the system sent, tried to send, or decided
 * not to send. This is the page that answers "was the student told?", which
 * is the only question anybody actually asks about messaging.
 */
export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  await requirePermission("messages.manage");
  const { status: statusParam, page: pageParam } = await searchParams;

  const status = FILTERS.some((entry) => entry.value === statusParam)
    ? statusParam!
    : "all";
  const page = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1);
  const where = status === "all" ? {} : { status: status as "SENT" };

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [rows, total, sent, failed] = await Promise.all([
    prisma.messageLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
      include: { user: { select: { name: true } } },
    }),
    prisma.messageLog.count({ where }),
    prisma.messageLog.count({ where: { status: "SENT", createdAt: { gte: since } } }),
    prisma.messageLog.count({ where: { status: "FAILED", createdAt: { gte: since } } }),
  ]);

  const provider = smsProvider();
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <AdminPageHeader
        title="Messages"
        description="Every SMS and WhatsApp message the system sent, with the reason for anything that did not go out."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <RestoreTemplatesButton />
            <Button asChild variant="outline" size="cta">
              <Link href="/admin/message-templates">
                <MessageSquare className="size-4" aria-hidden="true" />
                Templates
              </Link>
            </Button>
          </div>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <StatCard label="Sent in the last 30 days" value={sent} />
        <StatCard label="Failed in the last 30 days" value={failed} />
        <StatCard
          label="SMS gateway"
          value={provider ?? "not set up"}
          hint={
            whatsAppConfigured()
              ? "WhatsApp Cloud API connected"
              : "WhatsApp: chat links only"
          }
        />
      </div>

      {!provider && (
        <Panel className="mb-4 text-sm">
          <strong>No SMS gateway is configured yet.</strong> Messages are recorded here
          as “not sent” so nothing is lost, and they start going out the moment the
          gateway details are set. Ask the developer to set{" "}
          <code className="font-latin">SMS_PROVIDER</code>,{" "}
          <code className="font-latin">SMS_API_KEY</code> and{" "}
          <code className="font-latin">SMS_SENDER_ID</code> on the server.
        </Panel>
      )}

      <MessageTest />

      <nav className="my-4 flex flex-wrap gap-2" aria-label="Filter">
        {FILTERS.map((entry) => (
          <Link
            key={entry.value}
            href={`/admin/messages?status=${entry.value}`}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm",
              entry.value === status
                ? "border-[color:var(--brand)] bg-[color:var(--brand)] text-white"
                : "border-[color:var(--border)] bg-white hover:bg-[color:var(--bg-soft)]",
            )}
          >
            {entry.label}
          </Link>
        ))}
      </nav>

      {rows.length === 0 ? (
        <EmptyState
          title="No messages yet."
          description="Messages appear here as soon as the office admits an applicant, confirms a serial, or the daily reminder job runs."
        />
      ) : (
        <Panel padded={false} className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[48rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-[color:var(--border)] bg-[color:var(--bg-soft)]">
                  <th scope="col" className="px-4 py-3 text-start font-semibold">
                    When
                  </th>
                  <th scope="col" className="px-4 py-3 text-start font-semibold">
                    To
                  </th>
                  <th scope="col" className="px-4 py-3 text-start font-semibold">
                    Message
                  </th>
                  <th scope="col" className="px-4 py-3 text-start font-semibold">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--border)]">
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-2.5 align-top whitespace-nowrap">
                      {formatDateTime(row.createdAt, "en")}
                      <span className="block text-xs text-[color:var(--muted-foreground)]">
                        {row.user?.name ?? "automatic"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 align-top font-latin whitespace-nowrap">
                      {row.channel === "EMAIL" ? row.to : displayPhone(row.to)}
                      <span className="block text-xs text-[color:var(--muted-foreground)]">
                        {row.channel === "WHATSAPP" ? "WhatsApp" : row.channel}
                        {row.template ? ` · ${row.template}` : ""}
                      </span>
                    </td>
                    <td className="max-w-md px-4 py-2.5 align-top" lang="bn">
                      {row.body}
                    </td>
                    <td className="px-4 py-2.5 align-top">
                      <AdminBadge tone={TONE[row.status]}>
                        {row.status === "SKIPPED"
                          ? "not sent"
                          : row.status.toLowerCase()}
                      </AdminBadge>
                      {row.error && (
                        <span className="mt-1 block max-w-[18rem] text-xs text-[color:var(--muted-foreground)]">
                          {row.error}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {pageCount > 1 && (
        <div className="mt-4 flex items-center justify-between gap-3 text-sm">
          <span className="text-[color:var(--muted-foreground)]">
            Page {page} of {pageCount}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/admin/messages?status=${status}&page=${page - 1}`}>
                  Previous
                </Link>
              </Button>
            )}
            {page < pageCount && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/admin/messages?status=${status}&page=${page + 1}`}>
                  Next
                </Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
