import { PromosTable, type AdminPromo } from "@/components/admin/promos-table";
import { AdminPageHeader, EmptyState, NewButton } from "@/components/admin/ui";
import { requirePermission } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = { title: "Promos" };

const SLOTS = [
  {
    key: "PROMO_A",
    title: "Slot A: full width under the stats strip",
    hint: "Recommended 1600×600. Several active promos rotate every 6 seconds.",
  },
  {
    key: "PROMO_B",
    title: "Slot B: beside the notices",
    hint: "Recommended 800×800. Shown under the notices on phones.",
  },
] as const;

function day(value: Date | null): string {
  return value ? value.toISOString().slice(0, 10) : "";
}

export default async function AdminPromosPage() {
  await requirePermission("promos.manage");
  const promos = await prisma.promo.findMany({
    orderBy: [{ slot: "asc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
  });
  const now = Date.now();

  const rows: AdminPromo[] = promos.map((promo) => ({
    id: promo.id,
    slot: promo.slot,
    title: promo.title,
    image: promo.image,
    link: promo.link,
    isOffer: promo.isOffer,
    showAsPopup: promo.showAsPopup,
    active: promo.active,
    live:
      promo.active &&
      (!promo.startAt || promo.startAt.getTime() <= now) &&
      (!promo.endAt || promo.endAt.getTime() >= now),
    startAt: day(promo.startAt),
    endAt: day(promo.endAt),
    clicks: promo.clicks,
  }));

  return (
    <>
      <AdminPageHeader
        title="Promos"
        description="Posters and offer ads on the homepage. Image only: design the poster yourself and upload it. Drag rows to reorder; empty slots leave no gap on the site."
        action={<NewButton href="/admin/promos/new" label="New promo" />}
      />

      {rows.length === 0 ? (
        <EmptyState
          title="No promos yet."
          description="Add a poster with the button above. It appears on the homepage as soon as it is active."
        />
      ) : (
        <div className="space-y-8">
          {SLOTS.map((slot) => {
            const list = rows.filter((row) => row.slot === slot.key);
            return (
              <section key={slot.key}>
                <h2 className="text-base font-semibold">{slot.title}</h2>
                <p className="mb-3 text-xs text-[color:var(--muted-foreground)]">
                  {slot.hint}
                </p>
                {list.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-[color:var(--border)] p-4 text-sm text-[color:var(--muted-foreground)]">
                    Nothing in this slot.
                  </p>
                ) : (
                  <PromosTable slot={slot.key} promos={list} />
                )}
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
