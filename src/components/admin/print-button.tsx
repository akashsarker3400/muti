"use client";

import { Printer } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Opens the browser print dialog; the print pages are server components. */
export function PrintButton({ label = "Print" }: { label?: string }) {
  return (
    <Button type="button" variant="brand" size="cta" onClick={() => window.print()}>
      <Printer className="size-4" aria-hidden="true" />
      {label}
    </Button>
  );
}
