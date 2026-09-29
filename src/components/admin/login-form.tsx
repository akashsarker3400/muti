"use client";

import { useState, useTransition } from "react";
import { AlertCircle } from "lucide-react";

import { adminSignIn } from "@/app/actions/admin-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const MESSAGES = {
  invalid: "Incorrect email or password.",
  rateLimited: "Too many attempts. Please try again in a few minutes.",
  locked:
    "This account is locked after too many failed attempts. Try again in 15 minutes, or ask a super admin to unlock it.",
  "2fa_invalid": "That code did not match. Check your authenticator and try again.",
} as const;

export function LoginForm({ next }: { next: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<keyof typeof MESSAGES | null>(null);
  // The form only learns an account has 2FA after the password was accepted,
  // so the code field appears on the second step rather than always.
  const [needsCode, setNeedsCode] = useState(false);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    startTransition(async () => {
      setError(null);
      const result = await adminSignIn(
        String(form.get("email") ?? ""),
        String(form.get("password") ?? ""),
        next,
        String(form.get("code") ?? ""),
      );
      if (result.ok) return;
      if (result.error === "2fa_required") {
        setNeedsCode(true);
        return;
      }
      if (result.error === "2fa_invalid") setNeedsCode(true);
      setError(
        result.error === "rateLimited" ? "rateLimited" : (result.error ?? "invalid"),
      );
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      /*
       * Sign-in runs through a server action, so this form is submitted by
       * JavaScript. `method="post"` matters for the moment before hydration
       * finishes: without it a browser would submit natively as a GET and put
       * the password in the URL, where it would reach server logs and browser
       * history.
       */
      method="post"
      className="space-y-4 rounded-[14px] border border-[color:var(--border)] bg-white p-6 shadow-[var(--shadow-card)]"
    >
      {error && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-lg bg-[color:var(--error)]/10 p-3 text-sm text-[color:var(--error)]"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {MESSAGES[error]}
        </p>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="username"
          dir="ltr"
          className="h-11 font-latin"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          dir="ltr"
          className="h-11 font-latin"
        />
      </div>

      {needsCode && (
        <div className="space-y-1.5">
          <Label htmlFor="code">Authentication code</Label>
          <Input
            id="code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            placeholder="123456"
            dir="ltr"
            className="h-11 font-latin tracking-[0.3em]"
          />
          <p className="text-xs text-[color:var(--muted-foreground)]">
            The six-digit code from your authenticator app. Lost your phone? Type one of
            your backup codes instead.
          </p>
        </div>
      )}

      <Button
        type="submit"
        variant="brand"
        size="cta"
        disabled={pending}
        className="w-full"
      >
        {pending ? "Signing in…" : needsCode ? "Verify and sign in" : "Sign in"}
      </Button>
    </form>
  );
}
