import { saveSiteSettings } from "@/app/actions/admin-settings";
import { ResourceForm } from "@/components/admin/resource-form";
import { AdminPageHeader } from "@/components/admin/ui";
import { settingsFormSections, settingsToForm } from "@/lib/admin/settings-form";
import { getSiteSettings } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

export const metadata = { title: "Site settings" };

export default async function SiteSettingsPage() {
  const settings = await getSiteSettings();

  return (
    <>
      <AdminPageHeader
        title="Site settings"
        description="Institute name, address, phones, homepage and SEO settings."
      />
      <ResourceForm
        sections={settingsFormSections}
        defaultValues={settingsToForm(settings)}
        cancelHref="/admin"
        submitLabel="Save settings"
        onSave={async (values) => {
          "use server";
          return saveSiteSettings(values);
        }}
      />
    </>
  );
}
