"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { createOfficeApplication } from "@/app/actions/admin-leads";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LEAD_SOURCE_LABELS } from "@/lib/lead-source";

const CONTROL =
  "h-11 w-full rounded-lg border border-[color:var(--input)] bg-white px-3 text-sm focus-visible:border-[color:var(--brand)] focus-visible:outline-none";

/**
 * "Enquiry taken at the office" (addendum 2, A3). Walk-ins and phone calls
 * belong in the same inbox as website applications, otherwise the lead-source
 * report only ever sees online traffic.
 */
export function OfficeApplicationButton({
  courses,
  batches,
}: {
  courses: Array<{ id: string; label: string }>;
  batches: Array<{ id: string; label: string }>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    startTransition(async () => {
      setErrors({});
      const result = await createOfficeApplication(Object.fromEntries(form.entries()));

      if (result.ok) {
        toast.success("Application added.");
        setOpen(false);
        router.refresh();
        return;
      }

      if (result.errors) setErrors(result.errors);
      else toast.error(result.error ?? "Could not save.");
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="brand" size="cta">
          <UserPlus className="size-4" aria-hidden="true" />
          Walk-in application
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Add a walk-in application</DialogTitle>
            <DialogDescription>
              Add enquiries made in person or by phone here so every application is in
              one place.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="office-name">Name</Label>
              <Input id="office-name" name="name" required className="h-11" />
              {errors.name && <FieldError>{errors.name}</FieldError>}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="office-phone">Mobile number</Label>
                <Input
                  id="office-phone"
                  name="phone"
                  type="tel"
                  dir="ltr"
                  required
                  placeholder="01XXXXXXXXX"
                  className="h-11 font-latin"
                />
                {errors.phone && <FieldError>{errors.phone}</FieldError>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="office-source">Source</Label>
                <select
                  id="office-source"
                  name="source"
                  defaultValue="WALK_IN"
                  className={CONTROL}
                >
                  {Object.entries(LEAD_SOURCE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="office-course">Course</Label>
                <select id="office-course" name="courseId" className={CONTROL}>
                  <option value="">— select —</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="office-batch">Batch</Label>
                <select id="office-batch" name="batchId" className={CONTROL}>
                  <option value="">— select —</option>
                  {batches.map((batch) => (
                    <option key={batch.id} value={batch.id}>
                      {batch.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="office-qualification">Qualification</Label>
                <Input
                  id="office-qualification"
                  name="qualification"
                  placeholder="MBBS"
                  className="h-11"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="office-medical-college">Medical college</Label>
                <Input
                  id="office-medical-college"
                  name="medicalCollege"
                  placeholder="e.g. Mymensingh Medical College"
                  className="h-11"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="office-message">Note</Label>
              <Textarea id="office-message" name="message" rows={3} />
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" size="cta">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" variant="brand" size="cta" disabled={pending}>
              {pending && (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              )}
              Add
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FieldError({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-medium text-[color:var(--error)]">{children}</p>;
}
