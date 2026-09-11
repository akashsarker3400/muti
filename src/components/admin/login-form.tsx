"use client";

import { useState, useTransition } from "react";
import { AlertCircle } from "lucide-react";

import { adminSignIn } from "@/app/actions/admin-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const MESSAGES = {
  invalid: "ইমেইল বা পাসওয়ার্ড সঠিক নয়।",
  rateLimited: "অনেকবার চেষ্টা করা হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।",
} as const;

export function LoginForm({ next }: { next: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<keyof typeof MESSAGES | null>(null);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    startTransition(async () => {
      setError(null);
      const result = await adminSignIn(
        String(form.get("email") ?? ""),
        String(form.get("password") ?? ""),
        next,
      );
      if (!result.ok) setError(result.error ?? "invalid");
    });
  }

  return (
    <form
      onSubmit={onSubmit}
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
        <Label htmlFor="email">ইমেইল</Label>
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
        <Label htmlFor="password">পাসওয়ার্ড</Label>
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

      <Button
        type="submit"
        variant="brand"
        size="cta"
        disabled={pending}
        className="w-full"
      >
        {pending ? "লগইন হচ্ছে…" : "লগইন"}
      </Button>
    </form>
  );
}
