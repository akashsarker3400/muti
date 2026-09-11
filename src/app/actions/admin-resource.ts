"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { SaveResult } from "@/components/admin/resource-form";
import { logActivity, requireAdmin } from "@/lib/admin-auth";
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
  await requireAdmin();

  const resource = getResource(resourceKey);
  if (!resource) return { ok: false, error: "অজানা রিসোর্স।" };

  const parsed = resource.schema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, errors: zodFieldErrors(parsed.error) };
  }

  const data = resource.toData(parsed.data as Record<string, unknown>);
  const admin = await requireAdmin();

  try {
    const record = id
      ? await delegate(resource).update({ where: { id }, data })
      : await delegate(resource).create({ data });

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
  const admin = await requireAdmin();

  const resource = getResource(resourceKey);
  if (!resource) return { ok: false, error: "অজানা রিসোর্স।" };

  try {
    await delegate(resource).delete({ where: { id } });
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
  const admin = await requireAdmin();

  const resource = getResource(resourceKey);
  if (!resource) return { ok: false, error: "অজানা রিসোর্স।" };

  try {
    await delegate(resource).update({ where: { id }, data: { [field]: value } });
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
      return "এই মানটি ইতিমধ্যে ব্যবহৃত হয়েছে (যেমন slug, রোল বা কোড)। অন্য একটি দিন।";
    case "P2003":
      return "সম্পর্কিত রেকর্ড পাওয়া যায়নি। কোর্স বা ব্যাচ ঠিকভাবে বাছাই করুন।";
    case "P2025":
      return "রেকর্ডটি পাওয়া যায়নি — সম্ভবত এটি আগেই মুছে ফেলা হয়েছে।";
    default:
      console.error("Admin resource action failed", error);
      return "সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।";
  }
}
