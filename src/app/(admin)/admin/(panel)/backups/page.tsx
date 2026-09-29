import { Download } from "lucide-react";

import { BackupNowButton } from "@/components/admin/backup-now-button";
import { AdminPageHeader, EmptyState, Panel, StatCard } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { requireSuperAdmin } from "@/lib/admin-auth";
import { listBackups, pgDumpAvailable } from "@/lib/backup";
import { formatDateTime } from "@/lib/format";
import { storage } from "@/lib/storage";

export const dynamic = "force-dynamic";

export const metadata = { title: "Backups" };

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Database backups (addendum 2, A6).
 *
 * Super admin only: a dump holds every student, application and patient
 * record the institute has. The page is as much about telling the truth as
 * about listing files, so it says plainly when the backups are sitting on the
 * same server as the database, which is not yet a backup in any useful sense.
 */
export default async function BackupsPage() {
  await requireSuperAdmin();

  const [backups, hasPgDump] = await Promise.all([listBackups(), pgDumpAvailable()]);
  const offSite = storage().name === "r2";
  const newest = backups[0];

  return (
    <>
      <AdminPageHeader
        title="Backups"
        description="A full database dump, kept for the last fourteen runs. Restores with one pg_restore command."
        action={<BackupNowButton />}
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Last backup"
          value={newest ? formatDateTime(newest.createdAt, "en") : "never"}
          hint={newest ? humanSize(newest.size) : undefined}
        />
        <StatCard label="Kept" value={`${backups.length} / 14`} />
        <StatCard
          label="Stored"
          value={offSite ? "Cloudflare R2" : "this server"}
          hint={offSite ? "off the server" : "same machine as the database"}
        />
      </div>

      {!hasPgDump && (
        <Panel className="mb-4 border-[color:var(--error)] text-sm">
          <strong>pg_dump is not available in this container,</strong> so no backup can
          be made here. Redeploy from the current Dockerfile, which installs the
          Postgres client, or rely on the database service&rsquo;s own backup schedule.
        </Panel>
      )}

      {!offSite && (
        <Panel className="mb-4 text-sm">
          <strong>These dumps are on the same machine as the database.</strong> That
          protects against a mistaken deletion, not against losing the server. Add
          Cloudflare R2 (see the deployment guide) and every backup is written off the
          server automatically, or keep using the database service&rsquo;s own backup to
          an S3 bucket alongside this.
        </Panel>
      )}

      {backups.length === 0 ? (
        <EmptyState
          title="No backup has been made yet."
          description="Press “Back up now” to make the first one, and set the nightly schedule described in the deployment guide."
        />
      ) : (
        <Panel padded={false} className="overflow-hidden">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-[color:var(--border)] bg-[color:var(--bg-soft)]">
                <th scope="col" className="px-4 py-3 text-start font-semibold">
                  Taken
                </th>
                <th scope="col" className="px-4 py-3 text-start font-semibold">
                  Size
                </th>
                <th scope="col" className="px-4 py-3 text-end font-semibold">
                  Download
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--border)]">
              {backups.map((backup) => (
                <tr key={backup.key}>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    {formatDateTime(backup.createdAt, "en")}
                    <span className="block font-latin text-xs text-[color:var(--muted-foreground)]">
                      {backup.key.split("/").pop()}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-latin">{humanSize(backup.size)}</td>
                  <td className="px-4 py-2.5 text-end">
                    <Button asChild variant="outline" size="sm">
                      <a
                        href={`/api/admin/backup?key=${encodeURIComponent(backup.key)}`}
                      >
                        <Download className="size-4" aria-hidden="true" />
                        Download
                      </a>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}

      <Panel className="mt-5 text-sm">
        <h2 className="text-base font-semibold">Restoring</h2>
        <p className="mt-1 text-[color:var(--muted-foreground)]">
          On the server, with the database service running:
        </p>
        <pre className="mt-2 overflow-x-auto rounded-lg bg-[color:var(--bg-soft)] p-3 font-latin text-xs">
          {`pg_restore --clean --if-exists --no-owner \\
  --dbname "$DATABASE_URL" 20260929-031500.dump`}
        </pre>
        <p className="mt-2 text-[color:var(--muted-foreground)]">
          A downloaded dump contains every student, applicant and patient record. Keep
          it as carefully as the files in the office cupboard, and delete it from your
          laptop once you are done.
        </p>
      </Panel>
    </>
  );
}
