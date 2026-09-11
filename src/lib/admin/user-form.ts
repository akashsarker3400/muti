import type { FormSection, FormValues } from "@/lib/admin/fields";
import { GRANTABLE, PERMISSION_LABELS } from "@/lib/permissions";

/** Staff account fields (section 7.12). */
export function userFormSections(isNew: boolean): FormSection[] {
  return [
    {
      id: "main",
      label: "ব্যবহারকারী",
      fields: [
        { name: "name", label: "নাম", type: "text", required: true },
        {
          name: "email",
          label: "ইমেইল",
          type: "text",
          required: true,
          latin: true,
        },
        {
          name: "role",
          label: "ভূমিকা",
          type: "select",
          required: true,
          options: [
            { value: "STAFF", label: "স্টাফ" },
            { value: "SUPER_ADMIN", label: "সুপার অ্যাডমিন" },
          ],
        },
        {
          name: "password",
          label: isNew ? "পাসওয়ার্ড" : "নতুন পাসওয়ার্ড",
          type: "text",
          required: isNew,
          latin: true,
          hint: isNew
            ? "কমপক্ষে ৮ অক্ষর।"
            : "পাসওয়ার্ড পরিবর্তন করতে চাইলে তবেই লিখুন; ফাঁকা রাখলে আগেরটিই থাকবে।",
        },
        { name: "active", label: "সক্রিয়", type: "checkbox" },
        {
          name: "permissions",
          label: "অতিরিক্ত অনুমতি (শুধু স্টাফের জন্য)",
          type: "multiselect",
          full: true,
          hint: "সুপার অ্যাডমিন সব পারেন। স্টাফ ডিফল্টে সার্টিফিকেট, ফলাফল, ইমপোর্ট, নেতৃত্ব, উপদেষ্টা ও ব্যানার সম্পাদনা করতে পারেন; নিচেরগুলো আলাদাভাবে দিতে হয়।",
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
