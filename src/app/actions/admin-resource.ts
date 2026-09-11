"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { SaveResult } from "@/components/admin/resource-form";
import { logActivity, requireAdmin, requirePermission } from "@/lib/admin-auth";
import { getResource, type ResourceConfig } from "@/lib/admin/resources";
import { prisma } from "@/lib/prisma";

/**
 * Generic create / update / delete for the resources registered in
 * `src/lib/admin/resources.ts`. Each action re-checks authentication: a server
 * action is a public endpoint, so it can never assume the page that rendered
 * the form did the check.
 */

/**
 * Prisma delegates all expose the same subset of methods we need; the registry
 * restricts `model` to a known union, so this cast is safe.
 */
type Delegate = {
  create: (args: { data: Record<string, unknown> }) => Promise<{ id: string }>;
  update: (args: {
    where: { id: string };
    data: Record<string, unknown>;
  }) => Promise<{ id: string }>;
  delete: (args: { where: { id: string } }) => Promise<unknown>;
  findUnique: (args: { where: { id: string } }) => Promise<unknown>;
};

function delegate(resource: ResourceConfig): Delegate {
  return (prisma as unknown as Record<string, Delegate>)[resource.model];
}

export async function saveResource(
  resourceKey: string,
  id: string | null,
  values: Record<string, unknown>,
): Promise<SaveResult> {
  const resource = getResource(resourceKey);
  if (!resource) return { ok: false, error: "Unknown resource." };
  if (resource.permission) await requirePermission(resource.permission);
  else await requireAdmin();

  const parsed = resource.schema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, errors: zodFieldErrors(parsed.error) };
  }

  const admin = await requireAdmin();

  // Some resources need to compare against the row as it is today — batches
  // use it to notice a hand-edited seat count (addendum 2, A1).
  const existing =
    id && (resource.beforeWrite || resource.afterWrite)
      ? ((await delegate(resource).findUnique({
          where: { id },
        })) as Record<string, unknown> | null)
      : null;

  let data = resource.toData(parsed.data as Record<string, unknown>);
  if (resource.beforeWrite) data = resource.beforeWrite(data, existing);

  try {
    const record = id
      ? await delegate(resource).update({ where: { id }, data })
      : await delegate(resource).create({ data });

    if (resource.afterWrite) await resource.afterWrite(record, data, existing);

    await logActivity(admin.id, id ? "update" : "create", resource.model, record.id);

    revalidatePath("/admin/" + resource.key);
    revalidatePath("/", "layout");

    return { ok: true, id: record.id };
  } catch (error) {
    return { ok: false, error: describePrismaError(error) };
  }
}

export async function deleteResource(
  resourceKey: string,
  id: string,
): Promise<SaveResult> {
  const resource = getResource(resourceKey);
  if (!resource) return { ok: false, error: "Unknown resource." };
  const admin = resource.permission
    ? await requirePermission(resource.permission)
    : await requireAdmin();

  try {
    // Certificates are soft-deleted: a number once issued must stay unique.
    if (resource.model === "certificate") {
      await prisma.certificate.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
    } else {
      await delegate(resource).delete({ where: { id } });
    }
    if (resource.afterWrite) await resource.afterWrite({ id }, {}, null);
    await logActivity(admin.id, "delete", resource.model, id);

    revalidatePath("/admin/" + resource.key);
    revalidatePath("/", "layout");

    return { ok: true };
  } catch (error) {
    return { ok: false, error: describePrismaError(error) };
  }
}

/** Publish / unpublish toggle used directly from the list rows. */
export async function setResourceFlag(
  resourceKey: string,
  id: string,
  field: "published" | "active" | "pinned" | "verifiable",
  value: boolean,
): Promise<SaveResult> {
  const resource = getResource(resourceKey);
  if (!resource) return { ok: false, error: "Unknown resource." };
  const admin = resource.permission
    ? await requirePermission(resource.permission)
    : await requireAdmin();
  // Publishing board results is its own permission (addendum 3, §8).
  if (resource.key === "board-exams" && field === "published") {
    await requirePermission("results.publish");
  }

  try {
    await delegate(resource).update({ where: { id }, data: { [field]: value } });
    if (resource.afterWrite) await resource.afterWrite({ id }, {}, null);
    await logActivity(admin.id, `${field}:${value}`, resource.model, id);

    revalidatePath("/admin/" + resource.key);
    revalidatePath("/", "layout");

    return { ok: true };
  } catch (error) {
    return { ok: false, error: describePrismaError(error) };
  }
}

function zodFieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    if (!result[key]) result[key] = issue.message;
  }
  return result;
}

/** Turns the Prisma error codes staff can actually trigger into Bangla. */
function describePrismaError(error: unknown): string {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code: unknown }).code)
      : "";

  switch (code) {
    case "P2002":
      return "This value is already in use (slug, roll or code). Choose another.";
    case "P2003":
      return "A related record was not found. Check the course or batch selection.";
    case "P2025":
      return "Record not found. It may already have been deleted.";
    default:
      console.error("Admin resource action failed", error);
      return "Could not save. Please try again.";
  }
}

/**
 * Drag-to-reorder for lists with a `sortOrder` column (promos, chapters …).
 * Stores 10, 20, 30 … so the office can still slot a row in between by hand.
 */
export async function reorderResource(
  resourceKey: string,
  ids: string[],
): Promise<SaveResult> {
  const resource = getResource(resourceKey);
  if (!resource) return { ok: false, error: "Unknown resource." };
  const admin = resource.permission
    ? await requirePermission(resource.permission)
    : await requireAdmin();
  const clean = ids.filter((id) => /^[a-z0-9-]{10,40}$/i.test(id));

  try {
    await prisma.$transaction(async (tx) => {
      const model = (tx as unknown as Record<string, Delegate>)[resource.model];
      for (const [index, id] of clean.entries()) {
        await model.update({ where: { id }, data: { sortOrder: (index + 1) * 10 } });
      }
    });
    await logActivity(admin.id, "reorder", resource.model, null);
    revalidatePath("/admin/" + resource.key);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: describePrismaError(error) };
  }
}
