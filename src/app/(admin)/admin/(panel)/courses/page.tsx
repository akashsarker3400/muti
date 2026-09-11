import { CoursesTable, type AdminCourse } from "@/components/admin/courses-table";
import { AdminPageHeader, EmptyState, NewButton } from "@/components/admin/ui";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = { title: "কোর্স" };

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
        title="কোর্স"
        description="সারি টেনে ক্রম পরিবর্তন করুন — ওয়েবসাইটেও একই ক্রমে দেখাবে।"
        action={<NewButton href="/admin/courses/new" label="নতুন কোর্স" />}
      />

      {rows.length === 0 ? (
        <EmptyState
          title="এখনো কোনো কোর্স যোগ করা হয়নি।"
          description="উপরের বাটন থেকে প্রথম কোর্সটি যোগ করুন।"
        />
      ) : (
        <CoursesTable courses={rows} />
      )}
    </>
  );
}
