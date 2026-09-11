"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type AdvisorCardData = {
  id: string;
  name: string;
  degrees: string | null;
  designation: string;
  organization: string | null;
  bio: string | null;
  photo: string | null;
};

/**
 * Advisor cards (addendum 3, §5). A card with a bio opens a modal; one
 * without is plain. Square rounded portraits so a mix of headshots lines up.
 */
export function AdvisorGrid({
  advisors,
  columns = 4,
}: {
  advisors: AdvisorCardData[];
  columns?: 3 | 4;
}) {
  const t = useTranslations("advisors");
  const [open, setOpen] = useState<AdvisorCardData | null>(null);

  return (
    <>
      <ul
        className={`grid gap-4 sm:grid-cols-2 ${columns === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}
      >
        {advisors.map((advisor) => {
          const body = (
            <>
              <Portrait advisor={advisor} />
              <h3 className="mt-4 text-base leading-snug font-semibold">
                {advisor.name}
              </h3>
              {advisor.degrees && (
                <p className="mt-0.5 font-latin text-xs text-[color:var(--muted-foreground)]">
                  {advisor.degrees}
                </p>
              )}
              <p className="mt-2 text-sm font-medium text-[color:var(--brand)]">
                {advisor.designation}
              </p>
              {advisor.organization && (
                <p className="mt-0.5 text-xs text-[color:var(--muted-foreground)]">
                  {advisor.organization}
                </p>
              )}
            </>
          );
          const classes =
            "flex h-full w-full flex-col items-center rounded-[14px] border border-[color:var(--border)] bg-white p-5 text-center shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-hover)]";
          return (
            <li key={advisor.id}>
              {advisor.bio ? (
                <button
                  type="button"
                  onClick={() => setOpen(advisor)}
                  className={`${classes} cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--brand)]`}
                  aria-haspopup="dialog"
                >
                  {body}
                  <span className="mt-3 text-xs font-semibold text-[color:var(--accent-red-ink)]">
                    {t("readBio")}
                  </span>
                </button>
              ) : (
                <article className={classes}>{body}</article>
              )}
            </li>
          );
        })}
      </ul>

      <Dialog open={open !== null} onOpenChange={(next) => !next && setOpen(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          {open && (
            <>
              <DialogHeader className="items-center text-center">
                <Portrait advisor={open} size={112} />
                <DialogTitle className="mt-3">{open.name}</DialogTitle>
                <DialogDescription className="font-latin">
                  {[open.degrees, open.designation, open.organization]
                    .filter(Boolean)
                    .join(" · ")}
                </DialogDescription>
              </DialogHeader>
              <p className="text-sm leading-relaxed whitespace-pre-line text-[color:var(--foreground)]">
                {open.bio}
              </p>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Portrait({
  advisor,
  size = 112,
}: {
  advisor: AdvisorCardData;
  size?: number;
}) {
  if (advisor.photo) {
    return (
      <Image
        src={advisor.photo}
        alt={advisor.name}
        width={size}
        height={size}
        className="rounded-2xl object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className="grid place-items-center rounded-2xl bg-[color:var(--brand-soft)] text-3xl font-bold text-[color:var(--brand)]"
      style={{ width: size, height: size }}
    >
      {advisor.name.trim().charAt(0)}
    </span>
  );
}
