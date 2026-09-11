import type {
  ApplicationStatus,
  ApplicationType,
  LeadSource,
} from "@/generated/prisma/enums";

export type ApplicationFilters = {
  q?: string;
  type?: string;
  status?: string;
  course?: string;
  source?: string;
  from?: string;
  to?: string;
};

/**
 * Builds the Prisma `where` clause for the applications inbox. Shared by the
 * list page and the CSV export so both always show the same rows.
 */
export function buildApplicationWhere(filters: ApplicationFilters) {
  const where: Record<string, unknown> = {};

  if (filters.q?.trim()) {
    const query = filters.q.trim();
    where.OR = [
      { name: { contains: query, mode: "insensitive" } },
      { phone: { contains: query } },
      { email: { contains: query, mode: "insensitive" } },
      { location: { contains: query, mode: "insensitive" } },
    ];
  }

  if (filters.type) where.type = filters.type as ApplicationType;
  if (filters.status) where.status = filters.status as ApplicationStatus;
  if (filters.course) where.courseId = filters.course;
  if (filters.source) where.source = filters.source as LeadSource;

  const createdAt: Record<string, Date> = {};
  const from = parseDate(filters.from);
  const to = parseDate(filters.to);
  if (from) createdAt.gte = from;
  // `to` is inclusive of the whole day.
  if (to) createdAt.lte = new Date(to.getTime() + 24 * 60 * 60 * 1000 - 1);
  if (Object.keys(createdAt).length > 0) where.createdAt = createdAt;

  return where;
}

function parseDate(value?: string): Date | null {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}
