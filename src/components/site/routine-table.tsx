import { getTranslations } from "next-intl/server";

import type { RoutineType } from "@/generated/prisma/enums";

type Routine = {
  id: string;
  semester: string | null;
  label: string;
  title: string;
  type: RoutineType;
};

const TYPE_STYLES: Record<RoutineType, string> = {
  LECTURE: "bg-[color:var(--brand)]/10 text-[color:var(--brand)]",
  PRACTICAL: "bg-[color:var(--success)]/12 text-[color:var(--success)]",
  EXAM: "bg-[color:var(--accent-red)]/10 text-[color:var(--accent-red)]",
  REVIEW: "bg-[color:var(--warning)]/12 text-[color:var(--warning)]",
};

/**
 * Syllabus / routine table grouped by semester (section 5.4 item 5).
 * Courses with no semesters render as a single unlabelled group.
 */
export async function RoutineTable({ routines }: { routines: Routine[] }) {
  if (routines.length === 0) return null;

  const [t, types] = await Promise.all([
    getTranslations("course"),
    getTranslations("routineType"),
  ]);

  // Preserve the admin's sort order while grouping.
  const groups = new Map<string, Routine[]>();
  for (const routine of routines) {
    const key = routine.semester ?? "";
    const group = groups.get(key);
    if (group) group.push(routine);
    else groups.set(key, [routine]);
  }

  return (
    <div className="space-y-6">
      {[...groups.entries()].map(([semester, rows]) => (
        <div key={semester || "default"}>
          <h3 className="mb-3 text-base font-semibold">
            {semester || t("syllabusNoSemester")}
          </h3>

          <div className="overflow-x-auto rounded-[14px] border border-[color:var(--border)] bg-white shadow-[var(--shadow-card)]">
            <table className="w-full min-w-[34rem] border-collapse text-sm">
              <caption className="sr-only">
                {semester || t("syllabusNoSemester")}
              </caption>
              <thead>
                <tr className="bg-[color:var(--bg-soft)] text-start">
                  <th scope="col" className="w-32 px-4 py-3 text-start font-semibold">
                    {t("colLabel")}
                  </th>
                  <th scope="col" className="px-4 py-3 text-start font-semibold">
                    {t("colTitle")}
                  </th>
                  <th scope="col" className="w-32 px-4 py-3 text-start font-semibold">
                    {t("colType")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--border)]">
                {rows.map((routine) => (
                  <tr key={routine.id}>
                    <td className="px-4 py-2.5 font-latin font-medium whitespace-nowrap">
                      {routine.label}
                    </td>
                    <td className="px-4 py-2.5 font-latin">{routine.title}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          TYPE_STYLES[routine.type]
                        }`}
                      >
                        {types(routine.type)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
