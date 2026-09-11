import { saveCourse } from "@/app/actions/admin-courses";
import { ResourceForm } from "@/components/admin/resource-form";
import { AdminPageHeader } from "@/components/admin/ui";
import { courseFormSections, courseToForm } from "@/lib/admin/course-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "নতুন কোর্স" };

export default function NewCoursePage() {
  return (
    <>
      <AdminPageHeader
        title="নতুন কোর্স"
        description="কোর্স তৈরি করার পর ক্লাস রুটিন যোগ করা যাবে।"
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
