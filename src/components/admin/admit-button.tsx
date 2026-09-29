"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { admitApplication } from "@/app/actions/admin-students";
import { Button } from "@/components/ui/button";

/**
 * Turns an application into a student record (ERP addendum, 2.9).
 *
 * The office typed all of this once already at the desk, so the button copies
 * it across and takes the next roll in the course's series. Pressing it twice
 * is harmless: the second press opens the student that already exists.
 */
export function AdmitButton({
  id,
  name,
  admitted,
}: {
  id: string;
  name: string;
  /** Already has a student record, so the button becomes a link to it. */
  admitted: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={admitted ? `Open the student record for ${name}` : `Admit ${name}`}
      title={admitted ? "Open the student record" : "Admit: create the student record"}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          if (
            !admitted &&
            !window.confirm(
              `Admit ${name}? This creates a student record and takes the next roll number.`,
            )
          ) {
            return;
          }
          const result = await admitApplication(id);
          if (!result.ok) {
            toast.error(result.error);
            return;
          }
          toast.success(`Student record ready: ${result.roll}`);
          router.push(`/admin/students/${result.studentId}`);
        })
      }
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      ) : (
        <GraduationCap
          className={admitted ? "size-4 text-[color:var(--success)]" : "size-4"}
          aria-hidden="true"
        />
      )}
    </Button>
  );
}
