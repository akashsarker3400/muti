"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { PERMISSIONS } from "@/lib/permissions";

import type { SaveResult } from "@/components/admin/resource-form";
import { logActivity, requireSuperAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

/** Staff accounts — SUPER_ADMIN only (section 7.12). */

const userSchema = z.object({
  name: z.string().trim().min(2, "Name is required"),
  email: z.string().trim().email("Enter a valid email"),
  role: z.enum(["SUPER_ADMIN", "STAFF"]),
  password: z.string().default(""),
  active: z.boolean().default(true),
  /** Extra grants for STAFF (addendum 3, §8); only known names are kept. */
  permissions: z
    .array(z.string())
    .default([])
    .transform((list) =>
      list.filter((p) => (PERMISSIONS as readonly string[]).includes(p)),
    ),
});

export async function saveUser(
  id: string | null,
  values: Record<string, unknown>,
): Promise<SaveResult> {
  const admin = await requireSuperAdmin();

  const parsed = userSchema.safeParse(values);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".") || "form";
      if (!errors[key]) errors[key] = issue.message;
    }
    return { ok: false, errors };
  }

  const { name, email, role, password, active, permissions } = parsed.data;

  // A password is required when creating; on edit an empty field means "keep".
  if (!id && password.length < 8) {
    return {
      ok: false,
      errors: { password: "Password must be at least 8 characters" },
    };
  }
  if (id && password && password.length < 8) {
    return {
      ok: false,
      errors: { password: "Password must be at least 8 characters" },
    };
  }

  // Never let the last active super admin lock everyone out.
  if (id && (role !== "SUPER_ADMIN" || !active)) {
    const others = await prisma.user.count({
      where: { role: "SUPER_ADMIN", active: true, id: { not: id } },
    });
    if (others === 0) {
      return {
        ok: false,
        error: "At least one active super admin must remain.",
      };
    }
  }

  try {
    // bcrypt cost 12 (section 11). On edit an empty password keeps the old hash.
    const passwordHash = password ? await bcrypt.hash(password, 12) : undefined;

    const user = id
      ? await prisma.user.update({
          where: { id },
          data: {
            name,
            email: email.toLowerCase(),
            role,
            active,
            permissions,
            ...(passwordHash ? { passwordHash } : {}),
          },
        })
      : await prisma.user.create({
          data: {
            name,
            email: email.toLowerCase(),
            role,
            active,
            permissions,
            passwordHash: passwordHash!,
          },
        });

    await logActivity(admin.id, id ? "update" : "create", "user", user.id);
    revalidatePath("/admin/users");

    return { ok: true, id: user.id };
  } catch (error) {
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String((error as { code: unknown }).code)
        : "";
    if (code === "P2002") {
      return { ok: false, errors: { email: "This email is already in use." } };
    }
    console.error("saveUser failed", error);
    return { ok: false, error: "Could not save." };
  }
}

export async function deleteUser(id: string): Promise<SaveResult> {
  const admin = await requireSuperAdmin();

  if (admin.id === id) {
    return { ok: false, error: "You cannot delete your own account." };
  }

  const remaining = await prisma.user.count({
    where: { role: "SUPER_ADMIN", active: true, id: { not: id } },
  });
  if (remaining === 0) {
    return { ok: false, error: "At least one active super admin must remain." };
  }

  try {
    await prisma.user.delete({ where: { id } });
    await logActivity(admin.id, "delete", "user", id);
    revalidatePath("/admin/users");
    return { ok: true };
  } catch (error) {
    console.error("deleteUser failed", error);
    return { ok: false, error: "Could not delete." };
  }
}
