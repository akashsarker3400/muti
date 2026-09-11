import { saveSiteSettings } from "@/app/actions/admin-settings";
import { ResourceForm } from "@/components/admin/resource-form";
import { AdminPageHeader } from "@/components/admin/ui";
import { settingsFormSections, settingsToForm } from "@/lib/admin/settings-form";
import { getSiteSettings } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

export const metadata = { title: "সাইট সেটিংস" };

export default async function SiteSettingsPage() {
  const settings = await getSiteSettings();

  return (
    <>
      <AdminPageHeader
        title="সাইট সেটিংস"
        description="প্রতিষ্ঠানের নাম, ঠিকানা, ফোন, হোমপেজ ও SEO সংক্রান্ত সব তথ্য এখান থেকে পরিবর্তন করুন।"
      />
      <ResourceForm
        sections={settingsFormSections}
        defaultValues={settingsToForm(settings)}
        cancelHref="/admin"
        submitLabel="সেটিংস সংরক্ষণ করুন"
        onSave={async (values) => {
          "use server";
          return saveSiteSettings(values);
        }}
      />
    </>
  );
}
