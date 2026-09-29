import { redirect } from "next/navigation";

import { myCertificates, myResults } from "@/app/actions/portal";
import { formatDate } from "@/lib/format";
import { currentStudent } from "@/lib/portal-auth";
import { siteUrl } from "@/lib/env";

export const dynamic = "force-dynamic";
export const metadata = { title: "ফলাফল" };

/**
 * Published results and issued certificates (addendum 2, B12).
 *
 * Unpublished marks are not here: a mark the office has not released is not
 * the student's to see yet, however it got typed.
 */
export default async function PortalResults() {
  if (!(await currentStudent())) redirect("/portal");
  const [results, certificates] = await Promise.all([myResults(), myCertificates()]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">ফলাফল</h1>

      {results.length === 0 ? (
        <p className="rounded-2xl bg-white p-5 text-sm text-[color:var(--muted-foreground)]">
          এখনো কোনো ফল প্রকাশিত হয়নি।
        </p>
      ) : (
        <ul className="divide-y divide-[color:var(--border)] overflow-hidden rounded-2xl bg-white">
          {results.map((result) => (
            <li key={result.id} className="flex items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{result.exam.name}</p>
                <p className="text-sm text-[color:var(--muted-foreground)]">
                  {result.exam.date ? formatDate(result.exam.date, "bn") : ""}
                </p>
              </div>
              <div className="text-end">
                <p className="font-latin text-lg font-semibold">
                  {result.marks === null ? "—" : `${result.marks}/${result.exam.fullMarks}`}
                </p>
                {result.grade && (
                  <p className="font-latin text-sm text-[color:var(--muted-foreground)]">
                    {result.grade}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {certificates.length > 0 && (
        <section className="overflow-hidden rounded-2xl bg-white">
          <h2 className="border-b border-[color:var(--border)] px-4 py-3 font-semibold">
            সনদ
          </h2>
          <ul className="divide-y divide-[color:var(--border)]">
            {certificates.map((certificate) => (
              <li key={certificate.id} className="p-4">
                <p className="font-medium">{certificate.course.nameEn}</p>
                <p className="font-latin text-sm text-[color:var(--muted-foreground)]">
                  {certificate.certificateNo}
                  {certificate.issuedAt
                    ? ` · ${formatDate(certificate.issuedAt, "bn")}`
                    : ""}
                </p>
                <a
                  href={`${siteUrl}/verify?t=${certificate.verifyToken}`}
                  className="mt-1 inline-block text-sm underline"
                >
                  যাচাই করুন
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
