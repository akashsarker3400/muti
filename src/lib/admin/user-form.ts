import type { FormSection, FormValues } from "@/lib/admin/fields";
import { GRANTABLE, PERMISSION_LABELS } from "@/lib/permissions";

/** Staff account fields (section 7.12). */
export function userFormSections(isNew: boolean): FormSection[] {
  return [
    {
      id: "main",
      label: "Users",
      fields: [
        { name: "name", label: "Name", type: "text", required: true },
        {
          name: "email",
          label: "Email",
          type: "text",
          required: true,
          latin: true,
        },
        {
          name: "role",
          label: "Role",
          type: "select",
          required: true,
          options: [
            { value: "STAFF", label: "Staff" },
            { value: "SUPER_ADMIN", label: "Super admin" },
          ],
        },
        {
          name: "password",
          label: isNew ? "Password" : "New password",
          type: "text",
          required: isNew,
          latin: true,
          hint: isNew
            ? "At least 8 characters."
            : "Fill in only to change the password; leave empty to keep the current one.",
        },
        { name: "active", label: "Active", type: "checkbox" },
        {
          name: "permissions",
          label: "Extra permissions (staff only)",
          type: "multiselect",
          full: true,
          hint: "Super admins can do everything. Staff can edit certificates, results, imports, leadership, advisors and banners by default; the permissions below must be granted separately.",
          options: GRANTABLE.map((value) => ({
            value,
            label: PERMISSION_LABELS[value],
          })),
        },
      ],
    },
  ];
}

export function userToForm(row: Record<string, unknown>): FormValues {
  const text = (value: unknown) => (value == null ? "" : String(value));
  return {
    name: text(row.name),
    email: text(row.email),
    role: text(row.role) || "STAFF",
    password: "",
    active: row.active === undefined ? true : Boolean(row.active),
    permissions: Array.isArray(row.permissions) ? (row.permissions as string[]) : [],
  };
}
