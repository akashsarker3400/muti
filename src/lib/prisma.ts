import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";

/**
 * Prisma 7 talks to Postgres through a driver adapter (no Rust engine), so the
 * connection string lives here rather than in schema.prisma.
 */

/**
 * Tables the institute is a record keeper of (ERP addendum, 2.4). Deleting one
 * of these sets `deletedAt`; the row then has to disappear from every read, and
 * "every read" is the part a person forgets. Forty-odd call sites would each
 * have to remember the filter, so the client applies it instead.
 */
const SOFT_DELETED = new Set(["Course", "Batch", "Student", "Application"]);

/** Reads that must not see a deleted row. Writes are deliberately untouched. */
const FILTERED = new Set(["findFirst", "findFirstOrThrow", "findMany", "count"]);

/**
 * Spread into a `where` to look past the soft-delete filter on purpose.
 *
 * `undefined` is dropped by Prisma, and the extension steps aside as soon as
 * the caller mentions `deletedAt` at all. Needed wherever uniqueness is being
 * checked: a deleted student still owns their roll number, so a generator that
 * could not see them would hand it out twice.
 */
export const includingDeleted = { deletedAt: undefined } as const;

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env first.");
  }

  const client = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

  return client.$extends({
    name: "soft-delete",
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!model || !SOFT_DELETED.has(model)) return query(args);

          const input = args as { where?: Record<string, unknown> };

          if (FILTERED.has(operation)) {
            // An explicit `deletedAt` in the caller's own where wins, which is
            // how a "deleted items" screen would ask for them later.
            if (input.where && "deletedAt" in input.where) return query(args);
            return query({ ...args, where: { ...input.where, deletedAt: null } });
          }

          // `findUnique` cannot carry a non-unique filter, so it becomes a
          // `findFirst` with the same where. Callers get the same one row or
          // null, and a deleted row now reads as gone rather than as present.
          if (operation === "findUnique" || operation === "findUniqueOrThrow") {
            if (input.where && "deletedAt" in input.where) return query(args);
            const next = operation === "findUnique" ? "findFirst" : "findFirstOrThrow";
            const delegate = (client as unknown as Record<string, Record<string, (a: unknown) => unknown>>)[
              model.charAt(0).toLowerCase() + model.slice(1)
            ];
            return delegate[next]!({
              ...(args as object),
              where: { ...input.where, deletedAt: null },
            });
          }

          return query(args);
        },
      },
    },
  });
}

// Reuse the client across hot reloads in dev so we don't exhaust connections.
const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof createPrismaClient>;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
