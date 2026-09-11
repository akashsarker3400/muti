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
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const PERMISSION_LABELS: Record<Permission, string> = {
  "certificates.manage": "সার্টিফিকেট যোগ/সম্পাদনা/বাতিল",
  "results.manage": "বোর্ড ফলাফল যোগ/সম্পাদনা",
  "results.publish": "ফলাফল প্রকাশ করা",
  "import.run": "CSV/Excel ইমপোর্ট চালানো",
  "leadership.manage": "নেতৃত্বের বক্তব্য সম্পাদনা",
  "advisors.manage": "উপদেষ্টা মণ্ডলী সম্পাদনা",
  "banners.manage": "হিরো ব্যানার সম্পাদনা",
  "verification.logs.view": "যাচাই লগ দেখা",
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
