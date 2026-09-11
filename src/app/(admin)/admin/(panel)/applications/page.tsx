import Link from "next/link";
import { Download } from "lucide-react";

import { AdminPagination } from "@/components/admin/admin-pagination";
import {
  ApplicationsTable,
  type AdminApplication,
} from "@/components/admin/applications-table";
import { OfficeApplicationButton } from "@/components/admin/office-application-button";
import { SearchBox } from "@/components/admin/search-box";
import { AdminPageHeader, EmptyState, Panel } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { buildApplicationWhere } from "@/lib/admin/application-filters";
import { LEAD_SOURCE_LABELS } from "@/lib/lead-source";
import { prisma } from "@/lib/prisma";
import { cn } from "cn";

export const dynamic = "force-dynamic";

export const metadata = { title: "Applications" };

const PAGE_SIZE = 25;

const TYPES: Array<{ value: string; label: string }> = [
  { value: "", label: "All types" },
  { value: "ADMISSION", label: "Admission application" },
  { value: "FREE_CLASS", label: "Free class" },
  { value: "CONTACT", label: "Contact" },
  { value: "BOOK_SAMPLE", label: "Book sample" },
];

const SOURCES: Array<{ value: string; label: string }> = [
  { value: "", label: "All sources" },
  ...Object.entries(LEAD_SOURCE_LABELS).map(([value, label]) => ({
    value,
    label,
  })),
];

const STATUSES: Array<{ value: string; label: string }> = [
  { value: "", label: "All statuses" },
  { value: "NEW", label: "New" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "ADMITTED", label: "Admitted" },
  { value: "CLOSED", label: "Closed" },
];

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    type?: string;
    status?: string;
    course?: string;
    source?: string;
    from?: string;
    to?: string;
    page?: string;
  }>;
}) {
  const filters = await searchParams;
  const page = Math.max(1, Number.parseInt(filters.page ?? "1", 10) || 1);

  const where = buildApplicationWhere(filters);

  const [rows, total, courses, batches] = await Promise.all([
    prisma.application.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        course: true,
        batch: true,
        _count: { select: { sampleDownloads: true } },
      },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    }),
    prisma.application.count({ where }),
    prisma.course.findMany({
      orderBy: { sortOrder: "asc" },
      select: { id: true, nameEn: true, code: true },
    }),
    prisma.batch.findMany({
      where: { status: { in: ["UPCOMING", "RUNNING"] } },
      orderBy: [{ startDate: "asc" }, { createdAt: "desc" }],
      select: { id: true, name: true },
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
    medicalCollege: row.medicalCollege,
    bmdc: row.bmdc,
    fatherName: row.fatherName,
    motherName: row.motherName,
    dateOfBirth: row.dateOfBirth?.toISOString() ?? null,
    religion: row.religion,
    nationalId: row.nationalId,
    bloodGroup: row.bloodGroup,
    employment: row.employment,
    presentAddress: row.presentAddress,
    permanentAddress: row.permanentAddress,
    education: Array.isArray(row.education)
      ? (row.education as Array<{
          exam: string;
          year: string;
          gpa: string;
          board: string;
        }>)
      : [],
    location: row.location,
    preferredDate: row.preferredDate?.toISOString() ?? null,
    message: row.message,
    adminNote: row.adminNote,
    source: row.source,
    referralCode: row.referralCode,
    campaign:
      row.utm && typeof row.utm === "object" && "utm_campaign" in row.utm
        ? String((row.utm as Record<string, unknown>).utm_campaign ?? "")
        : null,
    downloads: row._count.sampleDownloads,
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
        title="Applications"
        description={`${total} applications in total`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" size="cta">
              <a
                href={`/api/admin/applications/export${exportQuery ? `?${exportQuery}` : ""}`}
              >
                <Download className="size-4" aria-hidden="true" />
                Export CSV
              </a>
            </Button>
            <OfficeApplicationButton
              courses={courses.map((course) => ({
                id: course.id,
                label: `${course.nameEn} (${course.code})`,
              }))}
              batches={batches.map((batch) => ({
                id: batch.id,
                label: batch.name,
              }))}
            />
          </div>
        }
      />

      <Panel className="mb-4">
        <div className="flex flex-col gap-3">
          <SearchBox placeholder="Name, phone or email…" />

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
                { value: "", label: "All courses" },
                ...courses.map((course) => ({
                  value: course.id,
                  label: course.code,
                })),
              ]}
              paramName="course"
              filters={filters}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <FilterChips
              current={filters.source ?? ""}
              options={SOURCES}
              paramName="source"
              filters={filters}
            />
          </div>
        </div>
      </Panel>

      {applications.length === 0 ? (
        <EmptyState
          title="No applications found."
          description="Change the filters and try again."
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
          source: filters.source,
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
