import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import {
  ApplicationEditForm,
  type ApplicationEditValues,
} from "@/components/admin/application-edit-form";
import { AdminPageHeader, Panel } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { requireSuperAdmin } from "@/lib/admin-auth";
import { formatDate } from "@/lib/format";
import { displayPhone } from "@/lib/phone";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = { title: "Edit application" };

const FIELD_LABELS: Record<string, string> = {
  name: "Name",
  phone: "Mobile",
  whatsapp: "WhatsApp",
  email: "Email",
  courseId: "Course",
  batchId: "Batch",
  qualification: "Qualification",
  medicalCollege: "Medical college",
  bmdc: "BMDC",
  location: "Location",
  fatherName: "Father's name",
  motherName: "Mother's name",
  dateOfBirth: "Date of birth",
  religion: "Religion",
  nationalId: "National ID",
  bloodGroup: "Blood group",
  employment: "Employment",
  presentAddress: "Present address",
  permanentAddress: "Permanent address",
  education: "Academic record",
  message: "Message",
};

/**
 * Super admin correction of an application (a typo the applicant noticed
 * after sending it). Every save is recorded with the old and new values,
 * listed at the foot of this page.
 */
export default async function EditApplicationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSuperAdmin();
  const { id } = await params;

  const [application, courses, batches, history] = await Promise.all([
    prisma.application.findUnique({
      where: { id },
      include: { student: { select: { id: true, roll: true } } },
    }),
    prisma.course.findMany({
      orderBy: { sortOrder: "asc" },
      select: { id: true, nameEn: true, code: true },
    }),
    prisma.batch.findMany({
      orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
      select: { id: true, name: true, courseId: true, status: true },
    }),
    prisma.activityLog.findMany({
      where: { entity: "application", entityId: id, action: "edit" },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { user: { select: { name: true } } },
    }),
  ]);
  if (!application) notFound();

  // Course and batch are stored as ids; the history reads better with names.
  const names = new Map<string, string>([
    ...courses.map(
      (course) => [course.id, `${course.nameEn} (${course.code})`] as const,
    ),
    ...batches.map((batch) => [batch.id, batch.name] as const),
  ]);
  const readable = (field: string, value: string | null) =>
    value && (field === "courseId" || field === "batchId")
      ? (names.get(value) ?? value)
      : value;

  const education = Array.isArray(application.education)
    ? (application.education as ApplicationEditValues["education"])
    : [];

  const initial: ApplicationEditValues = {
    name: application.name,
    phone: displayPhone(application.phone),
    whatsapp: application.whatsapp ? displayPhone(application.whatsapp) : "",
    email: application.email ?? "",
    courseId: application.courseId ?? "",
    batchId: application.batchId ?? "",
    qualification: application.qualification ?? "",
    medicalCollege: application.medicalCollege ?? "",
    bmdc: application.bmdc ?? "",
    location: application.location ?? "",
    fatherName: application.fatherName ?? "",
    motherName: application.motherName ?? "",
    dateOfBirth: application.dateOfBirth?.toISOString().slice(0, 10) ?? "",
    religion: application.religion ?? "",
    nationalId: application.nationalId ?? "",
    bloodGroup: application.bloodGroup ?? "",
    employment: application.employment ?? "",
    presentAddress: application.presentAddress ?? "",
    permanentAddress: application.permanentAddress ?? "",
    education,
    message: application.message ?? "",
  };

  return (
    <div className="mx-auto max-w-4xl">
      <AdminPageHeader
        title={`Edit application: ${application.name}`}
        description={`Received ${formatDate(application.createdAt, "en")}. Correct what the applicant typed wrong; every change is recorded below.`}
        action={
          <Button asChild variant="outline" size="cta">
            <Link href="/admin/applications">
              <ArrowLeft className="size-4" aria-hidden="true" />
              Applications
            </Link>
          </Button>
        }
      />

      <ApplicationEditForm
        id={application.id}
        initial={initial}
        courses={courses.map((course) => ({
          id: course.id,
          label: `${course.nameEn} (${course.code})`,
        }))}
        batches={batches}
        student={application.student}
      />

      <Panel className="mt-6">
        <h2 className="text-base font-semibold">Change history</h2>
        {history.length === 0 ? (
          <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
            Not edited since it was received.
          </p>
        ) : (
          <ul className="mt-3 space-y-4">
            {history.map((entry) => {
              const changes = (entry.detail ?? {}) as Record<
                string,
                { from: string | null; to: string | null }
              >;
              return (
                <li key={entry.id} className="text-sm">
                  <p className="font-medium">
                    {entry.user.name} ·{" "}
                    <span className="font-latin">
                      {entry.createdAt.toLocaleString("en-GB", {
                        timeZone: "Asia/Dhaka",
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </span>
                  </p>
                  <ul className="mt-1 space-y-0.5 text-[color:var(--muted-foreground)]">
                    {Object.entries(changes).map(([field, change]) => (
                      <li key={field} className="break-words">
                        {FIELD_LABELS[field] ?? field}:{" "}
                        <span className="line-through">
                          {readable(field, change.from) ?? "(empty)"}
                        </span>{" "}
                        →{" "}
                        <span className="text-[color:var(--foreground)]">
                          {readable(field, change.to) ?? "(empty)"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}
