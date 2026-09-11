import { saveCourse } from "@/app/actions/admin-courses";
import { ResourceForm } from "@/components/admin/resource-form";
import { AdminPageHeader } from "@/components/admin/ui";
import { courseFormSections, courseToForm } from "@/lib/admin/course-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "New course" };

export default function NewCoursePage() {
  return (
    <>
      <AdminPageHeader
        title="New course"
        description="The class routine can be added once the course is created."
      />
      <ResourceForm
        sections={courseFormSections}
        defaultValues={courseToForm({})}
        cancelHref="/admin/courses"
        onSave={async (values) => {
          "use server";
          return saveCourse(null, values);
        }}
      />
    </>
  );
}
