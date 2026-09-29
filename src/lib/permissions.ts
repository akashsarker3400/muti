import type { Role } from "@/generated/prisma/enums";

/**
 * Named permissions (addendum 3, §8). A SUPER_ADMIN holds every one; STAFF
 * hold the role defaults below plus whatever a SUPER_ADMIN grants on their
 * user record. Kept as plain strings so a new permission is one line here
 * and a checkbox in the user editor — no migration.
 */
export const PERMISSIONS = [
  "certificates.manage",
  "certificates.issue",
  "results.manage",
  "results.publish",
  "import.run",
  "leadership.manage",
  "advisors.manage",
  "banners.manage",
  "verification.logs.view",
  "health.manage",
  "health.appointments",
  "promos.manage",
  "videos.manage",
  "book.manage",
  "messages.manage",
  "attendance.mark",
  "attendance.view",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const PERMISSION_LABELS: Record<Permission, string> = {
  "certificates.manage": "Add/edit/revoke certificates",
  "certificates.issue": "Approve certificates for printing and handover",
  "results.manage": "Add/edit board results",
  "results.publish": "Publish results",
  "import.run": "Run CSV/Excel imports",
  "leadership.manage": "Edit leadership messages",
  "advisors.manage": "Edit the advisory board",
  "banners.manage": "Edit hero banners",
  "verification.logs.view": "View the verification log",
  "health.manage": "Health service settings and texts",
  "health.appointments": "View and update health service serials",
  "promos.manage": "Edit homepage promos",
  "videos.manage": "Edit institute videos",
  "book.manage": "Edit the course book",
  "messages.manage": "Edit message templates and send SMS",
  "attendance.mark": "Mark class attendance",
  "attendance.view": "See attendance registers and percentages",
};

/**
 * What STAFF can do without an explicit grant. Publishing results, approving
 * certificates and reading the verification log are held back: the first two
 * are public commitments the institute cannot take back, and the last shows
 * visitor IPs.
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
  "promos.manage",
  "videos.manage",
  "book.manage",
  "messages.manage",
  "attendance.mark",
  "attendance.view",
]);

/**
 * What a TEACHER can do (addendum 2, B1). Nothing but their own classes: a
 * teacher signing in must not be able to read the applications inbox or the
 * fees, so their role grants two permissions and nothing else is inherited.
 */
const TEACHER_DEFAULTS: ReadonlySet<Permission> = new Set([
  "attendance.mark",
  "attendance.view",
]);

export function hasPermission(
  user: { role: Role; permissions?: string[] },
  permission: Permission,
): boolean {
  if (user.role === "SUPER_ADMIN") return true;
  if (user.role === "TEACHER") {
    return (
      TEACHER_DEFAULTS.has(permission) ||
      (user.permissions ?? []).includes(permission)
    );
  }
  if (STAFF_DEFAULTS.has(permission)) return true;
  return (user.permissions ?? []).includes(permission);
}

/** Permissions a STAFF user does not get by default — the ones worth a checkbox. */
export const GRANTABLE: Permission[] = PERMISSIONS.filter(
  (p) => !STAFF_DEFAULTS.has(p),
);
