import { notFound } from "next/navigation";

import { saveUser } from "@/app/actions/admin-users";
import { ResourceForm } from "@/components/admin/resource-form";
import { AdminPageHeader } from "@/components/admin/ui";
import { requireSuperAdmin } from "@/lib/admin-auth";
import { userFormSections, userToForm } from "@/lib/admin/user-form";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function EditUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSuperAdmin();

  const { id } = await params;
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) notFound();

  return (
    <>
      <AdminPageHeader title={user.name} description={user.email} />
      <ResourceForm
        sections={userFormSections(false)}
        defaultValues={userToForm(user)}
        cancelHref="/admin/users"
        onSave={async (values) => {
          "use server";
          return saveUser(id, values);
        }}
      />
    </>
  );
}
