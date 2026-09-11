import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";

import { saveCourse } from "@/app/actions/admin-courses";
import { ResourceForm } from "@/components/admin/resource-form";
import { RoutineEditor } from "@/components/admin/routine-editor";
import { AdminPageHeader } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { courseFormSections, courseToForm } from "@/lib/admin/course-form";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function EditCoursePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const course = await prisma.course.findUnique({
    where: { id },
    include: { routines: { orderBy: { sortOrder: "asc" } } },
  });

  if (!course) notFound();

  return (
    <>
      <AdminPageHeader
        title={course.nameEn}
        description={`${course.code} · /${course.slug}`}
        action={
          <Button asChild variant="outline" size="cta">
            <a
              href={`/courses/${course.slug}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="size-4" aria-hidden="true" />
              View on site
            </a>
          </Button>
        }
      />

      <ResourceForm
        sections={courseFormSections}
        defaultValues={courseToForm(course)}
        cancelHref="/admin/courses"
        onSave={async (values) => {
          "use server";
          return saveCourse(id, values);
        }}
        extra={
          <RoutineEditor
            courseId={course.id}
            initial={course.routines.map((routine) => ({
              id: routine.id,
              semester: routine.semester ?? "",
              label: routine.label,
              title: routine.title,
              type: routine.type,
            }))}
          />
        }
      />
    </>
  );
}
