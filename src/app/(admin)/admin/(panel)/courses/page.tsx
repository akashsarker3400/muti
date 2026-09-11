import { CoursesTable, type AdminCourse } from "@/components/admin/courses-table";
import { AdminPageHeader, EmptyState, NewButton } from "@/components/admin/ui";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = { title: "Course" };

export default async function AdminCoursesPage() {
  const courses = await prisma.course.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: { _count: { select: { routines: true } } },
  });

  const rows: AdminCourse[] = courses.map((course) => ({
    id: course.id,
    code: course.code,
    slug: course.slug,
    nameBn: course.nameBn,
    nameEn: course.nameEn,
    level: course.level,
    courseFee: course.courseFee,
    published: course.published,
    admissionOpen: course.admissionOpen,
    routineCount: course._count.routines,
  }));

  return (
    <>
      <AdminPageHeader
        title="Course"
        description="Drag rows to reorder; the website shows the same order."
        action={<NewButton href="/admin/courses/new" label="New course" />}
      />

      {rows.length === 0 ? (
        <EmptyState
          title="No courses added yet."
          description="Add the first course with the button above."
        />
      ) : (
        <CoursesTable courses={rows} />
      )}
    </>
  );
}
