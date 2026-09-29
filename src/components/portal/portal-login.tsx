"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { requestCode, signIn } from "@/app/actions/portal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Phone and a one-time code (addendum 2, B12).
 *
 * No password, because a student who last signed in eight months ago will not
 * remember one, and a password they do remember is the one they use elsewhere.
 * The number the office already has is the identity.
 */
export function PortalLogin() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);

  function ask() {
    startTransition(async () => {
      const result = await requestCode(phone);
      if (!result.ok) {
        toast.error(result.error ?? "কোড পাঠানো গেল না।");
        return;
      }
      setSent(true);
      // The same message whether or not the number belongs to a student:
      // telling a stranger which numbers are students would hand out the roll.
      toast.success("নম্বরটি আমাদের তালিকায় থাকলে কোড চলে গেছে।");
    });
  }

  function submit() {
    startTransition(async () => {
      const result = await signIn(phone, code);
      if (!result.ok) {
        toast.error(result.error ?? "কোড মিলল না।");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-sm rounded-2xl bg-white p-6">
      <h1 className="text-xl font-semibold">শিক্ষার্থী পোর্টাল</h1>
      <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
        অফিসে যে মোবাইল নম্বরটি দিয়েছেন সেটি লিখুন। পাসওয়ার্ড লাগবে না।
      </p>

      <div className="mt-5 space-y-4">
        <div>
          <Label htmlFor="portal-phone">মোবাইল নম্বর</Label>
          <Input
            id="portal-phone"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            inputMode="tel"
            dir="ltr"
            placeholder="01778838644"
            className="mt-1 h-12 font-latin"
          />
        </div>

        {sent && (
          <div>
            <Label htmlFor="portal-code">ছয় অঙ্কের কোড</Label>
            <Input
              id="portal-code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              inputMode="numeric"
              autoComplete="one-time-code"
              dir="ltr"
              placeholder="123456"
              className="mt-1 h-12 font-latin tracking-[0.3em]"
            />
          </div>
        )}

        <Button
          type="button"
          variant="brand"
          size="cta"
          className="w-full"
          disabled={pending || !phone}
          onClick={sent ? submit : ask}
        >
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          {sent ? "ঢুকুন" : "কোড পাঠান"}
        </Button>

        {sent && (
          <button
            type="button"
            className="w-full text-sm text-[color:var(--muted-foreground)] underline"
            onClick={ask}
            disabled={pending}
          >
            আবার কোড পাঠান
          </button>
        )}
      </div>
    </div>
  );
}
