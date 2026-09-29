import Link from "next/link";
import { ClipboardList } from "lucide-react";

import { AdminBadge, AdminPageHeader, EmptyState, Panel } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/admin-auth";
import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = { title: "My classes" };

/**
 * A teacher's own classes (addendum 2, B1).
 *
 * The whole of the panel a TEACHER account needs: the classes assigned to
 * them, nearest first, each opening its register. Anything else in the admin
 * belongs to the office.
 */
export default async function MyClassesPage() {
  const me = await requireAdmin();

  const faculty = await prisma.faculty.findUnique({
    where: { userId: me.id },
    select: { id: true, name: true },
  });

  const sessions = faculty
    ? await prisma.classSession.findMany({
        where: { teacherId: faculty.id },
        orderBy: [{ date: "asc" }],
        include: {
          batch: { select: { name: true, _count: { select: { students: true } } } },
          _count: { select: { attendance: true } },
        },
        take: 200,
      })
    : [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcoming = sessions.filter((session) => session.date >= today);
  const past = sessions.filter((session) => session.date < today).reverse();

  return (
    <>
      <AdminPageHeader
        title="My classes"
        description={
          faculty
            ? `${faculty.name} · ${upcoming.length} still to come`
            : "No faculty record is linked to this account."
        }
      />

      {!faculty ? (
        <EmptyState
          title="This account is not linked to a teacher yet."
          description="Ask the office to open your record under Faculty and connect it to this login."
        />
      ) : sessions.length === 0 ? (
        <EmptyState
          title="No classes are assigned to you."
          description="The office assigns a teacher to each class on the batch's Classes page."
        />
      ) : (
        <div className="space-y-5">
          <SessionList title="Coming up" sessions={upcoming} />
          <SessionList title="Already taught" sessions={past} />
        </div>
      )}
    </>
  );
}

type Row = {
  id: string;
  date: Date;
  startTime: string | null;
  topic: string;
  status: string;
  batch: { name: string; _count: { students: number } };
  _count: { attendance: number };
};

function SessionList({ title, sessions }: { title: string; sessions: Row[] }) {
  if (sessions.length === 0) return null;

  return (
    <Panel padded={false} className="overflow-hidden">
      <h2 className="border-b border-[color:var(--border)] bg-[color:var(--bg-soft)] px-4 py-3 text-sm font-semibold">
        {title}
      </h2>
      <ul className="divide-y divide-[color:var(--border)]">
        {sessions.map((session) => (
          <li key={session.id} className="flex flex-wrap items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <p className="font-medium">{session.topic}</p>
              <p className="text-sm text-[color:var(--muted-foreground)]">
                {formatDate(session.date, "en")}
                {session.startTime ? ` · ${session.startTime}` : ""} ·{" "}
                {session.batch.name}
              </p>
            </div>
            {session.status === "DONE" ? (
              <AdminBadge tone="success">
                Taken · {session._count.attendance}/{session.batch._count.students}
              </AdminBadge>
            ) : (
              <AdminBadge tone="neutral">Not taken</AdminBadge>
            )}
            <Button asChild variant="outline" size="cta">
              <Link href={`/admin/sessions/${session.id}`}>
                <ClipboardList className="size-4" aria-hidden="true" />
                Register
              </Link>
            </Button>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
