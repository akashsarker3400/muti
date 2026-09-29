"use client";

import { useTransition } from "react";
import { Printer } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Opens the browser print dialog; the print pages are server components.
 *
 * `onPrinted` is how the certificate print log is written: the page hands in a
 * server action and it is awaited before the dialog opens, because a print the
 * register never heard about is worse than a dialog that takes a moment. A
 * failure to log never stops the printing. The office should not have to
 * remember to record a reprint, so the act of printing records itself.
 */
export function PrintButton({
  label = "Print",
  onPrinted,
}: {
  label?: string;
  onPrinted?: () => Promise<unknown>;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="brand"
      size="cta"
      disabled={pending}
      onClick={() => {
        if (!onPrinted) {
          window.print();
          return;
        }
        startTransition(async () => {
          try {
            await onPrinted();
          } catch (error) {
            console.error("Could not record the print", error);
          }
          window.print();
        });
      }}
    >
      <Printer className="size-4" aria-hidden="true" />
      {label}
    </Button>
  );
}
