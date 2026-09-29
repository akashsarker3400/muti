"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

import { signOut } from "@/app/actions/portal";
import { Button } from "@/components/ui/button";

/** Ends the student's session. */
export function PortalSignOut() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={pending}
      aria-label="লগ আউট"
      onClick={() =>
        startTransition(async () => {
          await signOut();
          router.push("/portal");
          router.refresh();
        })
      }
    >
      <LogOut className="size-4" aria-hidden="true" />
    </Button>
  );
}
