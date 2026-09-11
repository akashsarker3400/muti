import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, Download, ListChecks, Minus, Upload } from "lucide-react";

import { deleteResource, setResourceFlag } from "@/app/actions/admin-resource";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { CloneBatchButton } from "@/components/admin/clone-batch-button";
import { FlagToggle } from "@/components/admin/flag-toggle";
import { RowActions } from "@/components/admin/row-actions";
import { SearchBox } from "@/components/admin/search-box";
import { StudentImport } from "@/components/admin/student-import";
import {
  AdminBadge,
  AdminPageHeader,
  EmptyState,
  NewButton,
  Panel,
} from "@/components/admin/ui";
import { requireAdmin, requirePermission } from "@/lib/admin-auth";
import { getResource, type ResourceColumn } from "@/lib/admin/resources";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { cn } from "cn";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

/** Every registry resource shares this list screen (section 7.7 / 7.8). */
export default async function ResourceListPage({
  params,
  searchParams,
}: {
  params: Promise<{ resource: string }>;
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const [{ resource: key }, { q, page: pageParam }] = await Promise.all([
    params,
    searchParams,
  ]);

  const resource = getResource(key);
  if (!resource) notFound();
  if (resource.permission) await requirePermission(resource.permission);
  else await requireAdmin();

  const page = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1);

  // `baseWhere` keeps the six ContentItem editors looking at their own slice
  // of the shared table.
  const where = {
    ...resource.baseWhere,
    ...(q && q.trim()
      ? {
          OR: resource.searchFields.map((field) => ({
            [field]: { contains: q.trim(), mode: "insensitive" as const },
          })),
        }
      : {}),
  };

  const model = (
    prisma as unknown as Record<
      string,
      {
        findMany: (args: unknown) => Promise<Array<Record<string, unknown>>>;
        count: (args: unknown) => Promise<number>;
      }
    >
  )[resource.model];

  const [rows, total] = await Promise.all([
    model.findMany({
      where,
      orderBy: resource.orderBy,
      include: resource.include,
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    }),
    model.count({ where }),
  ]);

  const flagField = detectFlagField(rows[0]);
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <AdminPageHeader
        title={resource.title}
        description={resource.description}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {resource.exportCsv && (
              <Button asChild variant="outline" size="cta">
                <a href={`/api/admin/export/${resource.key}`}>
                  <Download className="size-4" aria-hidden="true" />
                  CSV
                </a>
              </Button>
            )}
            {resource.importEntity && (
              <Button asChild variant="outline" size="cta">
                <Link href={`/admin/import?entity=${resource.importEntity}`}>
                  <Upload className="size-4" aria-hidden="true" />
                  ইমপোর্ট
                </Link>
              </Button>
            )}
            <NewButton href={`/admin/${resource.key}/new`} label={resource.newLabel} />
          </div>
        }
      />

      {resource.listTool === "student-import" && <StudentImport />}

      <div className="mb-4">
        <SearchBox placeholder={`${resource.title} খুঁজুন…`} />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title={
            q ? "কিছু পাওয়া যায়নি।" : `এখনো কোনো ${resource.singular} যোগ করা হয়নি।`
          }
          description={q ? "অন্য শব্দ দিয়ে খুঁজে দেখুন।" : "উপরের বাটন থেকে যোগ করুন।"}
        />
      ) : (
        <Panel padded={false} className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-[color:var(--border)] bg-[color:var(--bg-soft)]">
                  {resource.columns.map((column) => (
                    <th
                      key={column.key}
                      scope="col"
                      className={cn(
                        "px-4 py-3 text-start font-semibold",
                        column.hideOnMobile && "hidden lg:table-cell",
                      )}
                    >
                      {column.label}
                    </th>
                  ))}
                  {flagField && (
                    <th scope="col" className="px-4 py-3 text-start font-semibold">
                      {flagField === "active" ? "সক্রিয়" : "প্রকাশিত"}
                    </th>
                  )}
                  <th scope="col" className="px-4 py-3 text-end font-semibold">
                    কাজ
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--border)]">
                {rows.map((row) => {
                  const id = String(row.id);
                  return (
                    <tr key={id} className="hover:bg-[color:var(--bg-soft)]">
                      {resource.columns.map((column) => (
                        <td
                          key={column.key}
                          className={cn(
                            "px-4 py-2.5 align-middle",
                            column.hideOnMobile && "hidden lg:table-cell",
                          )}
                        >
                          <Cell column={column} row={row} />
                        </td>
                      ))}

                      {flagField && (
                        <td className="px-4 py-2.5">
                          <FlagToggle
                            value={Boolean(row[flagField])}
                            label={flagField}
                            onToggle={async (next) => {
                              "use server";
                              return setResourceFlag(resource.key, id, flagField, next);
                            }}
                          />
                        </td>
                      )}

                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-end">
                          {resource.rowTool === "board-results" && (
                            <Button
                              asChild
                              variant="outline"
                              size="sm"
                              className="me-2"
                            >
                              <Link href={`/admin/board-exams/${id}/results`}>
                                <ListChecks className="size-4" aria-hidden="true" />
                                ফলাফল
                              </Link>
                            </Button>
                          )}
                          {resource.rowTool === "batch-clone" && (
                            <CloneBatchButton
                              batchId={id}
                              batchName={String(row.name ?? "")}
                            />
                          )}
                          <RowActions
                            editHref={`/admin/${resource.key}/${id}`}
                            label={primaryLabel(resource.columns, row)}
                            onDelete={async () => {
                              "use server";
                              return deleteResource(resource.key, id);
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      <AdminPagination
        page={page}
        pageCount={pageCount}
        basePath={`/admin/${resource.key}`}
        params={{ q }}
      />
    </>
  );
}

/** Renders one cell according to the column's declared type. */
function Cell({
  column,
  row,
}: {
  column: ResourceColumn;
  row: Record<string, unknown>;
}) {
  const value = column.path ? readPath(row, column.path) : row[column.key];

  switch (column.type) {
    case "image":
      return typeof value === "string" && value ? (
        <span className="relative block size-10 overflow-hidden rounded-md bg-[color:var(--bg-soft)]">
          <Image src={value} alt="" fill sizes="40px" className="object-cover" />
        </span>
      ) : (
        <span className="block size-10 rounded-md bg-[color:var(--bg-soft)]" />
      );

    case "bool":
      return value ? (
        <Check className="size-4 text-[color:var(--success)]" aria-label="হ্যাঁ" />
      ) : (
        <Minus
          className="size-4 text-[color:var(--muted-foreground)]"
          aria-label="না"
        />
      );

    case "date":
      return value instanceof Date ? (
        <span className="whitespace-nowrap">{formatDate(value, "bn")}</span>
      ) : (
        <span className="text-[color:var(--muted-foreground)]">—</span>
      );

    case "badge":
      return value ? (
        <AdminBadge tone="brand">
          {column.labels?.[String(value)] ?? String(value)}
        </AdminBadge>
      ) : null;

    case "number":
      return <span className="nums font-latin">{String(value ?? "—")}</span>;

    default:
      return (
        <span className="line-clamp-2 max-w-md">
          {value == null || value === "" ? (
            <span className="text-[color:var(--muted-foreground)]">—</span>
          ) : (
            String(value)
          )}
        </span>
      );
  }
}

function readPath(row: Record<string, unknown>, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>(
      (current, segment) =>
        typeof current === "object" && current !== null
          ? (current as Record<string, unknown>)[segment]
          : undefined,
      row,
    );
}

/** Which boolean the list should expose as an inline toggle, if any. */
function detectFlagField(
  row: Record<string, unknown> | undefined,
): "published" | "active" | null {
  if (!row) return null;
  if ("published" in row) return "published";
  if ("active" in row) return "active";
  return null;
}

function primaryLabel(columns: ResourceColumn[], row: Record<string, unknown>): string {
  const first = columns.find((column) => !column.type || column.type === "text");
  const value = first ? row[first.key] : row.id;
  return String(value ?? "");
}
