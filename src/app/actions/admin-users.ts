"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";

import type { SaveResult } from "@/components/admin/resource-form";
import { logActivity, requireSuperAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

/** Staff accounts — SUPER_ADMIN only (section 7.12). */

const userSchema = z.object({
  name: z.string().trim().min(2, "নাম আবশ্যক"),
  email: z.string().trim().email("সঠিক ইমেইল দিন"),
  role: z.enum(["SUPER_ADMIN", "STAFF"]),
  password: z.string().default(""),
  active: z.boolean().default(true),
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

  const { name, email, role, password, active } = parsed.data;

  // A password is required when creating; on edit an empty field means "keep".
  if (!id && password.length < 8) {
    return { ok: false, errors: { password: "পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে" } };
  }
  if (id && password && password.length < 8) {
    return { ok: false, errors: { password: "পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে" } };
  }

  // Never let the last active super admin lock everyone out.
  if (id && (role !== "SUPER_ADMIN" || !active)) {
    const others = await prisma.user.count({
      where: { role: "SUPER_ADMIN", active: true, id: { not: id } },
    });
    if (others === 0) {
      return {
        ok: false,
        error: "অন্তত একজন সক্রিয় সুপার অ্যাডমিন থাকতেই হবে।",
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
            ...(passwordHash ? { passwordHash } : {}),
          },
        })
      : await prisma.user.create({
          data: {
            name,
            email: email.toLowerCase(),
            role,
            active,
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
      return { ok: false, errors: { email: "এই ইমেইল ইতিমধ্যে ব্যবহৃত হয়েছে।" } };
    }
    console.error("saveUser failed", error);
    return { ok: false, error: "সংরক্ষণ করা যায়নি।" };
  }
}

export async function deleteUser(id: string): Promise<SaveResult> {
  const admin = await requireSuperAdmin();

  if (admin.id === id) {
    return { ok: false, error: "নিজের অ্যাকাউন্ট মুছে ফেলা যাবে না।" };
  }

  const remaining = await prisma.user.count({
    where: { role: "SUPER_ADMIN", active: true, id: { not: id } },
  });
  if (remaining === 0) {
    return { ok: false, error: "অন্তত একজন সক্রিয় সুপার অ্যাডমিন থাকতেই হবে।" };
  }

  try {
    await prisma.user.delete({ where: { id } });
    await logActivity(admin.id, "delete", "user", id);
    revalidatePath("/admin/users");
    return { ok: true };
  } catch (error) {
    console.error("deleteUser failed", error);
    return { ok: false, error: "মুছে ফেলা যায়নি।" };
  }
}
