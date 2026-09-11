import { notFound } from "next/navigation";

import { saveResource } from "@/app/actions/admin-resource";
import { ResourceForm } from "@/components/admin/resource-form";
import { AdminPageHeader } from "@/components/admin/ui";
import { requireAdmin, requirePermission } from "@/lib/admin-auth";
import { getResource } from "@/lib/admin/resources";

export const dynamic = "force-dynamic";

export default async function NewResourcePage({
  params,
}: {
  params: Promise<{ resource: string }>;
}) {
  const { resource: key } = await params;
  const resource = getResource(key);
  if (!resource) notFound();
  if (resource.permission) await requirePermission(resource.permission);
  else await requireAdmin();

  const options = resource.loadOptions ? await resource.loadOptions() : {};
  const sections = resource.sections(options);

  // Start from the shape `toForm` produces so every field is controlled.
  const defaultValues = resource.toForm({});

  return (
    <>
      <AdminPageHeader title={resource.newLabel} description={resource.description} />
      <ResourceForm
        sections={sections}
        defaultValues={defaultValues}
        cancelHref={`/admin/${resource.key}`}
        preview={resource.preview}
        onSave={async (values) => {
          "use server";
          return saveResource(key, null, values);
        }}
      />
    </>
  );
}
