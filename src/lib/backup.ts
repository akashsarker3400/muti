import "server-only";

import { spawn } from "node:child_process";

import { optionalEnv } from "@/lib/env";
import { storage } from "@/lib/storage";

/**
 * Nightly database backup (addendum 2, A6).
 *
 * A real `pg_dump` in custom format, not a hand-written JSON export: it
 * restores with one `pg_restore` command, it keeps the things a JSON file
 * quietly loses (sequences, enums, exact types), and it is the format every
 * Postgres administrator already knows.
 *
 * The dump is written through the ordinary storage driver, so on a site with
 * Cloudflare R2 configured the backup leaves the server, which is the whole
 * point of having one. On a local-volume install it lands beside the uploads
 * and the admin page says plainly that this is not yet a real backup.
 *
 * The file sits under `protected/backups/`, which the public uploads route
 * refuses to serve; only a super admin can download it.
 */

const KEEP = 14;

/**
 * Prisma's connection string carries parameters libpq has never heard of, and
 * `pg_dump` refuses the whole URL when it meets one ("invalid URI query
 * parameter: schema"). They are stripped rather than translated: the backup
 * wants the entire database, which is what dropping `schema` leaves it with.
 */
const PRISMA_ONLY = new Set([
  "schema",
  "connection_limit",
  "pool_timeout",
  "socket_timeout",
  "pgbouncer",
  "statement_cache_size",
  "sslidentity",
  "sslpassword",
  "sslaccept",
]);

export function pgDumpUrl(url: string): string {
  try {
    const parsed = new URL(url);
    for (const name of [...parsed.searchParams.keys()]) {
      if (PRISMA_ONLY.has(name)) parsed.searchParams.delete(name);
    }
    return parsed.toString();
  } catch {
    // Not a URL we can parse: hand it over unchanged and let pg_dump judge.
    return url;
  }
}

export type BackupFile = { key: string; size: number; createdAt: Date };

export type BackupResult =
  | { ok: true; key: string; size: number; offSite: boolean }
  | { ok: false; error: string };

function stamp(at = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return (
    `${at.getUTCFullYear()}${pad(at.getUTCMonth() + 1)}${pad(at.getUTCDate())}` +
    `-${pad(at.getUTCHours())}${pad(at.getUTCMinutes())}${pad(at.getUTCSeconds())}`
  );
}

/** Reads `pg_dump` into memory. A MUTI-sized database is a few megabytes. */
function runPgDump(url: string): Promise<{ ok: true; body: Buffer } | { ok: false; error: string }> {
  return new Promise((resolve) => {
    // --format=custom is compressed and restores selectively; --no-owner and
    // --no-privileges let it restore into a differently named role, which is
    // exactly the situation a restore happens in.
    const child = spawn(
      "pg_dump",
      ["--format=custom", "--no-owner", "--no-privileges", url],
      { stdio: ["ignore", "pipe", "pipe"] },
    );

    const chunks: Buffer[] = [];
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer) => chunks.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    child.on("error", (error: NodeJS.ErrnoException) => {
      resolve({
        ok: false,
        error:
          error.code === "ENOENT"
            ? "pg_dump is not installed in this container. Rebuild the image, or use the database service's own backup instead."
            : `pg_dump could not be started: ${error.message}`,
      });
    });

    child.on("close", (code) => {
      if (code === 0 && chunks.length > 0) {
        resolve({ ok: true, body: Buffer.concat(chunks) });
        return;
      }
      resolve({
        ok: false,
        error: stderr.trim().slice(0, 300) || `pg_dump exited with code ${code}`,
      });
    });
  });
}

/** Whether `pg_dump` is present, for the admin page's warning. */
export async function pgDumpAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn("pg_dump", ["--version"], { stdio: "ignore" });
    child.on("error", () => resolve(false));
    child.on("close", (code) => resolve(code === 0));
  });
}

export async function listBackups(): Promise<BackupFile[]> {
  try {
    const files = await storage().list();
    return files
      .filter((file) => file.key.startsWith("protected/backups/"))
      .map((file) => ({ key: file.key, size: file.size, createdAt: file.modified }))
      .sort((a, b) => b.key.localeCompare(a.key));
  } catch (error) {
    console.error("Could not list backups", error);
    return [];
  }
}

export async function createBackup(): Promise<BackupResult> {
  const url = optionalEnv("DATABASE_URL");
  if (!url) return { ok: false, error: "DATABASE_URL is not set." };

  const dump = await runPgDump(pgDumpUrl(url));
  if (!dump.ok) return { ok: false, error: dump.error };

  const key = `protected/backups/${stamp()}.dump`;
  const driver = storage();

  try {
    await driver.put(key, dump.body, "application/octet-stream");
  } catch (error) {
    console.error("Could not store the backup", error);
    return { ok: false, error: "The dump was made but could not be stored." };
  }

  // Retention. A failure here must not fail the backup that just succeeded.
  try {
    const existing = await listBackups();
    for (const file of existing.slice(KEEP)) {
      await driver.delete(file.key);
    }
  } catch (error) {
    console.error("Could not prune old backups", error);
  }

  return { ok: true, key, size: dump.body.length, offSite: driver.name === "r2" };
}
