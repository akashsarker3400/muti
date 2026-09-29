"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, KeyRound, Loader2, ShieldCheck, ShieldOff } from "lucide-react";
import { toast } from "sonner";

import {
  beginTwoFactor,
  confirmTwoFactor,
  disableTwoFactor,
  regenerateBackupCodes,
} from "@/app/actions/admin-2fa";
import { Panel } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Turning two-factor on, off, and printing a new sheet of backup codes.
 *
 * The enrolment secret is held in component state and never written anywhere
 * until a code proves the authenticator and the server agree; a half-finished
 * enrolment therefore cannot lock anyone out.
 */
export function TwoFactorSetup({
  enabled,
  enabledAt,
  remainingCodes,
  qrFor,
}: {
  enabled: boolean;
  enabledAt: string | null;
  remainingCodes: number;
  /** Server action that renders the QR for a secret, so no key leaves in a URL. */
  qrFor: (uri: string) => Promise<string>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [setup, setSetup] = useState<{
    secret: string;
    uri: string;
    qr: string;
  } | null>(null);
  const [code, setCode] = useState("");
  const [codes, setCodes] = useState<string[] | null>(null);

  function start() {
    startTransition(async () => {
      const enrolment = await beginTwoFactor();
      setSetup({ ...enrolment, qr: await qrFor(enrolment.uri) });
      setCode("");
    });
  }

  function confirm() {
    if (!setup) return;
    startTransition(async () => {
      const result = await confirmTwoFactor(setup.secret, code);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setCodes(result.backupCodes);
      setSetup(null);
      setCode("");
      toast.success("Two-factor authentication is on.");
      router.refresh();
    });
  }

  function turnOff() {
    startTransition(async () => {
      const result = await disableTwoFactor(code);
      if (!result.ok) {
        toast.error(result.error ?? "Could not turn it off.");
        return;
      }
      setCode("");
      setCodes(null);
      toast.success("Two-factor authentication is off.");
      router.refresh();
    });
  }

  function newCodes() {
    startTransition(async () => {
      const result = await regenerateBackupCodes(code);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setCodes(result.backupCodes);
      setCode("");
      toast.success("New backup codes. The old ones no longer work.");
      router.refresh();
    });
  }

  // ---- the sheet of codes, shown once --------------------------------------
  if (codes) {
    return (
      <Panel>
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <KeyRound className="size-4" aria-hidden="true" />
          Your backup codes
        </h2>
        <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
          Each code signs you in once, if you ever lose your phone. Print this or write
          it down now: <strong>they are not shown again</strong>.
        </p>
        <ul className="mt-4 grid max-w-md grid-cols-2 gap-2 font-latin text-sm">
          {codes.map((entry) => (
            <li
              key={entry}
              className="rounded-md border border-[color:var(--border)] bg-[color:var(--bg-soft)] px-3 py-2 text-center tracking-wider"
            >
              {entry}
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="cta"
            onClick={() => {
              void navigator.clipboard.writeText(codes.join("\n"));
              toast.success("Copied.");
            }}
          >
            <Copy className="size-4" aria-hidden="true" />
            Copy all
          </Button>
          <Button
            type="button"
            variant="outline"
            size="cta"
            onClick={() => window.print()}
          >
            Print
          </Button>
          <Button
            type="button"
            variant="brand"
            size="cta"
            onClick={() => setCodes(null)}
          >
            <Check className="size-4" aria-hidden="true" />I have saved them
          </Button>
        </div>
      </Panel>
    );
  }

  // ---- enrolment in progress ----------------------------------------------
  if (setup) {
    return (
      <Panel>
        <h2 className="text-base font-semibold">Scan this with your authenticator</h2>
        <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
          Google Authenticator, Microsoft Authenticator, Authy or any TOTP app. Then
          type the six-digit code it shows to finish.
        </p>
        <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-start">
          <span
            className="block w-[180px] shrink-0 rounded-lg border border-[color:var(--border)] bg-white p-2 [&>svg]:size-full"
            dangerouslySetInnerHTML={{ __html: setup.qr }}
          />
          <div className="min-w-0 flex-1">
            <Label htmlFor="totp-code">Six-digit code</Label>
            <Input
              id="totp-code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
              dir="ltr"
              className="mt-1 h-11 max-w-[12rem] font-latin tracking-[0.3em]"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="brand"
                size="cta"
                disabled={pending}
                onClick={confirm}
              >
                {pending && (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                )}
                Turn on
              </Button>
              <Button
                type="button"
                variant="outline"
                size="cta"
                onClick={() => setSetup(null)}
              >
                Cancel
              </Button>
            </div>
            <details className="mt-4 text-xs text-[color:var(--muted-foreground)]">
              <summary className="cursor-pointer">Cannot scan the code?</summary>
              <p className="mt-1">
                Type this key into the app by hand:{" "}
                <code className="font-latin break-all select-all">{setup.secret}</code>
              </p>
            </details>
          </div>
        </div>
      </Panel>
    );
  }

  // ---- steady state --------------------------------------------------------
  return (
    <Panel>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            {enabled ? (
              <ShieldCheck
                className="size-4 text-[color:var(--success)]"
                aria-hidden="true"
              />
            ) : (
              <ShieldOff
                className="size-4 text-[color:var(--muted-foreground)]"
                aria-hidden="true"
              />
            )}
            Two-factor authentication
          </h2>
          <p className="mt-1 max-w-prose text-sm text-[color:var(--muted-foreground)]">
            {enabled
              ? `On since ${enabledAt}. Signing in asks for a code from your authenticator app, so a stolen password is not enough on its own. ${remainingCodes} backup code${remainingCodes === 1 ? "" : "s"} left.`
              : "Adds a six-digit code from your phone to the password. Worth turning on for every account that can edit the site, and especially for super admins."}
          </p>
        </div>
        {!enabled && (
          <Button
            type="button"
            variant="brand"
            size="cta"
            disabled={pending}
            onClick={start}
          >
            {pending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            Turn on
          </Button>
        )}
      </div>

      {enabled && (
        <div className="mt-4 border-t border-[color:var(--border)] pt-4">
          <Label htmlFor="totp-current">Current code from your app</Label>
          <Input
            id="totp-current"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            dir="ltr"
            className="mt-1 h-11 max-w-[12rem] font-latin tracking-[0.3em]"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="cta"
              disabled={pending || code.length < 6}
              onClick={newCodes}
            >
              <KeyRound className="size-4" aria-hidden="true" />
              New backup codes
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="cta"
              disabled={pending || code.length < 6}
              onClick={turnOff}
            >
              <ShieldOff className="size-4" aria-hidden="true" />
              Turn off
            </Button>
          </div>
        </div>
      )}
    </Panel>
  );
}
