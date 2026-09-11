import { notFound } from "next/navigation";

import { saveResource } from "@/app/actions/admin-resource";
import { ResourceForm } from "@/components/admin/resource-form";
import { AdminPageHeader } from "@/components/admin/ui";
import { StudentCertificates } from "@/components/admin/student-certificates";
import { requireAdmin, requirePermission } from "@/lib/admin-auth";
import { getResource } from "@/lib/admin/resources";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function EditResourcePage({
  params,
}: {
  params: Promise<{ resource: string; id: string }>;
}) {
  const { resource: key, id } = await params;
  const resource = getResource(key);
  if (!resource) notFound();
  if (resource.permission) await requirePermission(resource.permission);
  else await requireAdmin();

  const model = (
    prisma as unknown as Record<
      string,
      {
        findUnique: (args: unknown) => Promise<Record<string, unknown> | null>;
      }
    >
  )[resource.model];

  const [row, options] = await Promise.all([
    model.findUnique({ where: { id } }),
    resource.loadOptions ? resource.loadOptions() : Promise.resolve({}),
  ]);

  if (!row) notFound();

  // Guard against editing a row from another slice of a shared table by URL.
  for (const [field, value] of Object.entries(resource.baseWhere ?? {})) {
    if (row[field] !== value) notFound();
  }

  return (
    <>
      <AdminPageHeader
        title={`Edit ${resource.singular.toLowerCase()}`}
        description={resource.description}
      />
      <ResourceForm
        sections={resource.sections(options)}
        defaultValues={resource.toForm(row)}
        cancelHref={`/admin/${resource.key}`}
        preview={resource.preview}
        onSave={async (values) => {
          "use server";
          return saveResource(key, id, values);
        }}
        extra={
          resource.detailPanel === "student-certificates" ? (
            <StudentCertificates studentId={id} />
          ) : undefined
        }
      />
    </>
  );
}
