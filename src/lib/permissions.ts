import type { Role } from "@/generated/prisma/enums";

/**
 * Named permissions (addendum 3, §8). A SUPER_ADMIN holds every one; STAFF
 * hold the role defaults below plus whatever a SUPER_ADMIN grants on their
 * user record. Kept as plain strings so a new permission is one line here
 * and a checkbox in the user editor — no migration.
 */
export const PERMISSIONS = [
  "certificates.manage",
  "results.manage",
  "results.publish",
  "import.run",
  "leadership.manage",
  "advisors.manage",
  "banners.manage",
  "verification.logs.view",
  "health.manage",
  "health.appointments",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const PERMISSION_LABELS: Record<Permission, string> = {
  "certificates.manage": "Add/edit/revoke certificates",
  "results.manage": "Add/edit board results",
  "results.publish": "Publish results",
  "import.run": "Run CSV/Excel imports",
  "leadership.manage": "Edit leadership messages",
  "advisors.manage": "Edit the advisory board",
  "banners.manage": "Edit hero banners",
  "verification.logs.view": "View the verification log",
  "health.manage": "Health service settings and texts",
  "health.appointments": "View and update health service serials",
};

/**
 * What STAFF can do without an explicit grant. Publishing results and reading
 * the verification log are held back: one is a public commitment, the other
 * shows visitor IPs.
 */
const STAFF_DEFAULTS: ReadonlySet<Permission> = new Set([
  "certificates.manage",
  "results.manage",
  "import.run",
  "leadership.manage",
  "advisors.manage",
  "banners.manage",
  "health.manage",
  "health.appointments",
]);

export function hasPermission(
  user: { role: Role; permissions?: string[] },
  permission: Permission,
): boolean {
  if (user.role === "SUPER_ADMIN") return true;
  if (STAFF_DEFAULTS.has(permission)) return true;
  return (user.permissions ?? []).includes(permission);
}

/** Permissions a STAFF user does not get by default — the ones worth a checkbox. */
export const GRANTABLE: Permission[] = PERMISSIONS.filter(
  (p) => !STAFF_DEFAULTS.has(p),
);
