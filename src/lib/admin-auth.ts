import { redirect } from "next/navigation";

import { auth } from "@/auth";
import type { Role } from "@/generated/prisma/enums";
import { hasPermission, type Permission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

/**
 * Guard used by every admin page and server action. The middleware already
 * blocks unauthenticated requests to /admin, but each entry point re-checks:
 * a server action is a public HTTP endpoint and must never rely on the page
 * that rendered its form having done the check.
 */
export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  permissions: string[];
};

export async function currentAdmin(): Promise<AdminUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  // Re-read the row so a deactivated account loses access immediately rather
  // than when its 12-hour JWT expires.
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      permissions: true,
    },
  });

  if (!user || !user.active) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    permissions: user.permissions,
  };
}

export async function requireAdmin(): Promise<AdminUser> {
  const user = await currentAdmin();
  if (!user) redirect("/admin/login");
  return user;
}

export async function requireSuperAdmin(): Promise<AdminUser> {
  const user = await requireAdmin();
  if (user.role !== "SUPER_ADMIN") redirect("/admin");
  return user;
}

/**
 * Page/action guard for one named permission (addendum 3, §8). A page
 * redirects to the dashboard; a server action gets the same redirect, which
 * the client sees as a failed call.
 */
export async function requirePermission(permission: Permission): Promise<AdminUser> {
  const user = await requireAdmin();
  if (!hasPermission(user, permission)) redirect("/admin?denied=1");
  return user;
}

/** Writes an audit row (section 7.14). Never throws into the caller's flow. */
export async function logActivity(
  userId: string,
  action: string,
  entity: string,
  entityId?: string | null,
) {
  try {
    await prisma.activityLog.create({
      data: { userId, action, entity, entityId: entityId ?? null },
    });
  } catch (error) {
    console.error("Failed to write activity log", error);
  }
}
