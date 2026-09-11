import "server-only";

import { createReadStream } from "node:fs";
import { mkdir, readdir, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

import { uploadDir } from "@/lib/env";

export { isSafeKey } from "@/lib/storage-key";

/**
 * Where uploaded images and PDFs live. Two drivers behind one interface:
 *
 * - **r2**: Cloudflare R2 through its S3 API, chosen when the four R2_*
 *   variables are set. Files survive redeploys and server moves, and R2's
 *   egress is free, so this is the production choice.
 * - **local**: the `UPLOAD_DIR` directory (a Coolify volume in Docker),
 *   used in development and whenever R2 is not configured.
 *
 * Either way the public URL is `/uploads/<key>` served by the uploads route,
 * so switching drivers never changes a path stored in the database.
 */

export type StoredFile = { key: string; size: number; modified: Date };
export type StoredBody = { stream: ReadableStream; size: number };

export type StorageDriver = {
  name: "r2" | "local";
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<StoredBody | null>;
  exists(key: string): Promise<boolean>;
  delete(key: string): Promise<void>;
  list(): Promise<StoredFile[]>;
  /** Cheap configuration check for the admin diagnostics. */
  healthy(): Promise<boolean>;
};

/* ---- local ----------------------------------------------------------------- */

function localDriver(): StorageDriver {
  const root = path.resolve(uploadDir);
  const fileOf = (key: string) => path.join(root, key);

  return {
    name: "local",
    async put(key, body) {
      await mkdir(path.dirname(fileOf(key)), { recursive: true });
      await writeFile(fileOf(key), body);
    },
    async get(key) {
      try {
        const info = await stat(fileOf(key));
        if (!info.isFile()) return null;
        return {
          stream: Readable.toWeb(
            createReadStream(fileOf(key)),
          ) as unknown as ReadableStream,
          size: info.size,
        };
      } catch {
        return null;
      }
    },
    async exists(key) {
      try {
        return (await stat(fileOf(key))).isFile();
      } catch {
        return false;
      }
    },
    async delete(key) {
      await unlink(fileOf(key));
    },
    async list() {
      const files: StoredFile[] = [];
      async function walk(directory: string, prefix: string) {
        let entries;
        try {
          entries = await readdir(directory, { withFileTypes: true });
        } catch {
          return; // The volume may not exist yet on a brand new deployment.
        }
        for (const entry of entries) {
          if (entry.name.startsWith(".")) continue;
          const full = path.join(directory, entry.name);
          if (entry.isDirectory()) {
            await walk(full, prefix ? `${prefix}/${entry.name}` : entry.name);
            continue;
          }
          const info = await stat(full);
          files.push({
            key: prefix ? `${prefix}/${entry.name}` : entry.name,
            size: info.size,
            modified: info.mtime,
          });
        }
      }
      await walk(root, "");
      return files;
    },
    async healthy() {
      try {
        await mkdir(root, { recursive: true });
        const { access, constants } = await import("node:fs/promises");
        await access(root, constants.W_OK);
        return true;
      } catch {
        return false;
      }
    },
  };
}

/* ---- Cloudflare R2 --------------------------------------------------------- */

function r2Driver(config: {
  accountId: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
}): StorageDriver {
  const client = new S3Client({
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
  const Bucket = config.bucket;

  return {
    name: "r2",
    async put(key, body, contentType) {
      await client.send(
        new PutObjectCommand({
          Bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
          CacheControl: "public, max-age=31536000, immutable",
        }),
      );
    },
    async get(key) {
      try {
        const object = await client.send(new GetObjectCommand({ Bucket, Key: key }));
        if (!object.Body) return null;
        return {
          stream: object.Body.transformToWebStream() as unknown as ReadableStream,
          size: object.ContentLength ?? 0,
        };
      } catch (error) {
        if ((error as { name?: string }).name === "NoSuchKey") return null;
        console.error("R2 get failed", error);
        return null;
      }
    },
    async exists(key) {
      try {
        await client.send(new HeadObjectCommand({ Bucket, Key: key }));
        return true;
      } catch {
        return false;
      }
    },
    async delete(key) {
      await client.send(new DeleteObjectCommand({ Bucket, Key: key }));
    },
    async list() {
      const files: StoredFile[] = [];
      let ContinuationToken: string | undefined;
      do {
        const page = await client.send(
          new ListObjectsV2Command({ Bucket, ContinuationToken, MaxKeys: 1000 }),
        );
        for (const item of page.Contents ?? []) {
          if (!item.Key) continue;
          files.push({
            key: item.Key,
            size: item.Size ?? 0,
            modified: item.LastModified ?? new Date(0),
          });
        }
        ContinuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
      } while (ContinuationToken);
      return files;
    },
    async healthy() {
      try {
        await client.send(new ListObjectsV2Command({ Bucket, MaxKeys: 1 }));
        return true;
      } catch (error) {
        console.error("R2 health check failed", error);
        return false;
      }
    },
  };
}

/* ---- selection ------------------------------------------------------------- */

let driver: StorageDriver | null = null;

export function storage(): StorageDriver {
  if (driver) return driver;
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const bucket = process.env.R2_BUCKET?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  driver =
    accountId && bucket && accessKeyId && secretAccessKey
      ? r2Driver({ accountId, bucket, accessKeyId, secretAccessKey })
      : localDriver();
  return driver;
}
