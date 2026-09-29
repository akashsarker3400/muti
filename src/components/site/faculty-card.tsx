import type { Locale } from "@/i18n/routing";
import { pick } from "@/lib/format";
import type { getFaculty } from "@/lib/queries";
import { PersonPortrait } from "@/components/site/person-portrait";

type Faculty = Awaited<ReturnType<typeof getFaculty>>[number];

export function FacultyCard({
  member,
  locale,
  compact = false,
}: {
  member: Faculty;
  locale: Locale;
  compact?: boolean;
}) {
  const name = pick(locale, member.nameBn, member.name);
  const designation = pick(locale, member.designationBn, member.designation);

  return (
    <article className="flex h-full flex-col rounded-[14px] border border-[color:var(--border)] bg-white p-5 text-center shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-hover)]">
      <div className="mx-auto">
        <PersonPortrait src={member.photo} name={name} width={128} />
      </div>

      <h3 className="mt-4 text-base font-semibold">{name}</h3>
      <p className="mt-1 font-latin text-xs text-[color:var(--muted-foreground)]">
        {member.degrees}
      </p>
      <p className="mt-2 text-sm font-medium text-[color:var(--brand)]">
        {designation}
      </p>

      {!compact && member.bio && (
        <p className="mt-3 text-sm leading-relaxed text-[color:var(--muted-foreground)]">
          {member.bio}
        </p>
      )}
    </article>
  );
}
