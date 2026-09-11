import Link from "next/link";
import { Download } from "lucide-react";

import { AdminPagination } from "@/components/admin/admin-pagination";
import {
  ApplicationsTable,
  type AdminApplication,
} from "@/components/admin/applications-table";
import { SearchBox } from "@/components/admin/search-box";
import { AdminPageHeader, EmptyState, Panel } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { buildApplicationWhere } from "@/lib/admin/application-filters";
import { prisma } from "@/lib/prisma";
import { cn } from "cn";

export const dynamic = "force-dynamic";

export const metadata = { title: "আবেদন" };

const PAGE_SIZE = 25;

const TYPES: Array<{ value: string; label: string }> = [
  { value: "", label: "সব ধরন" },
  { value: "ADMISSION", label: "ভর্তি আবেদন" },
  { value: "FREE_CLASS", label: "ফ্রি ক্লাস" },
  { value: "CONTACT", label: "যোগাযোগ" },
];

const STATUSES: Array<{ value: string; label: string }> = [
  { value: "", label: "সব অবস্থা" },
  { value: "NEW", label: "নতুন" },
  { value: "CONTACTED", label: "যোগাযোগ হয়েছে" },
  { value: "ADMITTED", label: "ভর্তি হয়েছে" },
  { value: "CLOSED", label: "বন্ধ" },
];

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    type?: string;
    status?: string;
    course?: string;
    from?: string;
    to?: string;
    page?: string;
  }>;
}) {
  const filters = await searchParams;
  const page = Math.max(1, Number.parseInt(filters.page ?? "1", 10) || 1);

  const where = buildApplicationWhere(filters);

  const [rows, total, courses] = await Promise.all([
    prisma.application.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { course: true, batch: true },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    }),
    prisma.application.count({ where }),
    prisma.course.findMany({
      orderBy: { sortOrder: "asc" },
      select: { id: true, nameEn: true, code: true },
    }),
  ]);

  const applications: AdminApplication[] = rows.map((row) => ({
    id: row.id,
    type: row.type,
    status: row.status,
    name: row.name,
    phone: row.phone,
    whatsapp: row.whatsapp,
    email: row.email,
    courseName: row.course ? `${row.course.nameEn} (${row.course.code})` : null,
    batchName: row.batch?.name ?? null,
    qualification: row.qualification,
    bmdc: row.bmdc,
    location: row.location,
    preferredDate: row.preferredDate?.toISOString() ?? null,
    message: row.message,
    adminNote: row.adminNote,
    source: row.source,
    createdAt: row.createdAt.toISOString(),
  }));

  const exportQuery = new URLSearchParams(
    Object.entries(filters).filter(
      ([key, value]) => key !== "page" && Boolean(value),
    ) as [string, string][],
  ).toString();

  return (
    <>
      <AdminPageHeader
        title="আবেদন"
        description={`মোট ${total} টি আবেদন`}
        action={
          <Button asChild variant="outline" size="cta">
            <a
              href={`/api/admin/applications/export${exportQuery ? `?${exportQuery}` : ""}`}
            >
              <Download className="size-4" aria-hidden="true" />
              CSV এক্সপোর্ট
            </a>
          </Button>
        }
      />

      <Panel className="mb-4">
        <div className="flex flex-col gap-3">
          <SearchBox placeholder="নাম, ফোন বা ইমেইল…" />

          <div className="flex flex-wrap gap-2">
            <FilterChips
              current={filters.type ?? ""}
              options={TYPES}
              paramName="type"
              filters={filters}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <FilterChips
              current={filters.status ?? ""}
              options={STATUSES}
              paramName="status"
              filters={filters}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <FilterChips
              current={filters.course ?? ""}
              options={[
                { value: "", label: "সব কোর্স" },
                ...courses.map((course) => ({
                  value: course.id,
                  label: course.code,
                })),
              ]}
              paramName="course"
              filters={filters}
            />
          </div>
        </div>
      </Panel>

      {applications.length === 0 ? (
        <EmptyState
          title="কোনো আবেদন পাওয়া যায়নি।"
          description="ফিল্টার পরিবর্তন করে আবার দেখুন।"
        />
      ) : (
        <ApplicationsTable rows={applications} />
      )}

      <AdminPagination
        page={page}
        pageCount={Math.max(1, Math.ceil(total / PAGE_SIZE))}
        basePath="/admin/applications"
        params={{
          q: filters.q,
          type: filters.type,
          status: filters.status,
          course: filters.course,
        }}
      />
    </>
  );
}

/** Filter chips are plain links so each filtered view is shareable. */
function FilterChips({
  current,
  options,
  paramName,
  filters,
}: {
  current: string;
  options: Array<{ value: string; label: string }>;
  paramName: string;
  filters: Record<string, string | undefined>;
}) {
  return (
    <>
      {options.map((option) => {
        const params = new URLSearchParams();
        for (const [key, value] of Object.entries(filters)) {
          if (value && key !== "page" && key !== paramName) params.set(key, value);
        }
        if (option.value) params.set(paramName, option.value);
        const query = params.toString();

        return (
          <Link
            key={option.value || "all"}
            href={`/admin/applications${query ? `?${query}` : ""}`}
            aria-current={option.value === current ? "true" : undefined}
            className={cn(
              "inline-flex min-h-9 items-center rounded-full border px-3.5 text-xs font-medium transition",
              option.value === current
                ? "border-[color:var(--brand)] bg-[color:var(--brand)] text-white"
                : "border-[color:var(--border)] bg-white hover:bg-[color:var(--bg-soft)]",
            )}
          >
            {option.label}
          </Link>
        );
      })}
    </>
  );
}
