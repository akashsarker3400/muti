import { myRoutine } from "@/app/actions/portal";
import { currentStudent } from "@/lib/portal-auth";
import { formatDate } from "@/lib/format";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata = { title: "রুটিন" };

/** The student's own class list (addendum 2, B12). */
export default async function PortalRoutine() {
  if (!(await currentStudent())) redirect("/portal");
  const sessions = await myRoutine();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">রুটিন</h1>

      {sessions.length === 0 ? (
        <p className="rounded-2xl bg-white p-5 text-sm text-[color:var(--muted-foreground)]">
          আপনার ব্যাচের ক্লাসের তালিকা এখনো তৈরি হয়নি।
        </p>
      ) : (
        <ul className="divide-y divide-[color:var(--border)] overflow-hidden rounded-2xl bg-white">
          {sessions.map((session) => {
            const past = session.date < today;
            return (
              <li
                key={session.id}
                className={`flex items-center gap-3 p-4 ${past ? "opacity-60" : ""}`}
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{session.topic}</p>
                  <p className="text-sm text-[color:var(--muted-foreground)]">
                    {formatDate(session.date, "bn")}
                    {session.startTime ? ` · ${session.startTime}` : ""}
                    {session.teacher ? ` · ${session.teacher.name}` : ""}
                  </p>
                </div>
                {session.status === "CANCELLED" && (
                  <span className="text-xs text-[color:var(--error)]">বাতিল</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
