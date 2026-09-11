import { saveUser } from "@/app/actions/admin-users";
import { ResourceForm } from "@/components/admin/resource-form";
import { AdminPageHeader } from "@/components/admin/ui";
import { requireSuperAdmin } from "@/lib/admin-auth";
import { userFormSections, userToForm } from "@/lib/admin/user-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "নতুন ব্যবহারকারী" };

export default async function NewUserPage() {
  await requireSuperAdmin();

  return (
    <>
      <AdminPageHeader title="নতুন ব্যবহারকারী" />
      <ResourceForm
        sections={userFormSections(true)}
        defaultValues={userToForm({})}
        cancelHref="/admin/users"
        onSave={async (values) => {
          "use server";
          return saveUser(null, values);
        }}
      />
    </>
  );
}
