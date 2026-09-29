"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LockOpen, ShieldOff } from "lucide-react";
import { toast } from "sonner";

import { clearTwoFactorFor, unlockAccount } from "@/app/actions/admin-2fa";
import { Button } from "@/components/ui/button";

/**
 * Recovery controls a super admin needs when a colleague is locked out or has
 * lost the phone holding their authenticator. Both are audited.
 */
export function UserSecurityActions({
  userId,
  name,
  locked,
  twoFactor,
}: {
  userId: string;
  name: string;
  locked: boolean;
  twoFactor: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (!locked && !twoFactor) return null;

  return (
    <>
      {locked && (
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label={`Unlock ${name}`}
          title="Unlock this account"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await unlockAccount(userId);
              if (result.ok) {
                toast.success("Account unlocked.");
                router.refresh();
              } else toast.error(result.error ?? "Could not unlock.");
            })
          }
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <LockOpen className="size-4" aria-hidden="true" />
          )}
        </Button>
      )}

      {twoFactor && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Clear two-factor for ${name}`}
          title="Clear two-factor (lost phone)"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              if (
                !window.confirm(
                  `Clear two-factor authentication for ${name}? They will sign in with the password alone until they set it up again. This is recorded in the activity log.`,
                )
              )
                return;
              const result = await clearTwoFactorFor(userId);
              if (result.ok) {
                toast.success("Two-factor cleared.");
                router.refresh();
              } else toast.error(result.error ?? "Could not update that account.");
            })
          }
        >
          <ShieldOff
            className="size-4 text-[color:var(--accent-red)]"
            aria-hidden="true"
          />
        </Button>
      )}
    </>
  );
}
