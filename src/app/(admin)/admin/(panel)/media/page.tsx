import { MediaGrid } from "@/components/admin/media-grid";
import { AdminPageHeader } from "@/components/admin/ui";
import { listMedia } from "@/lib/admin/media";

export const dynamic = "force-dynamic";

export const metadata = { title: "মিডিয়া" };

export default async function MediaPage() {
  const files = await listMedia();

  return (
    <>
      <AdminPageHeader
        title="মিডিয়া"
        description="আপলোড করা সব ছবি ও PDF। কোথাও ব্যবহৃত হচ্ছে না এমন ফাইল মুছে ফেলা যায়।"
      />
      <MediaGrid files={files} />
    </>
  );
}
