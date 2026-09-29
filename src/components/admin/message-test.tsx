"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";

import { sendTestMessage } from "@/app/actions/admin-messages";
import { Panel } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/**
 * Send one message by hand.
 *
 * Doubles as the gateway test. It is folded closed by default because the
 * outbox below it is what the page is for, and an open form invites somebody
 * to send a text nobody asked for.
 */
export function MessageTest() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [to, setTo] = useState("");
  const [body, setBody] = useState("");

  // Bangla costs 70 characters a part, English 160: the count is what stops
  // a friendly message quietly becoming three SMS.
  const bangla = /[ঀ-৿]/.test(body);
  const perPart = bangla ? 70 : 160;
  const parts = Math.max(1, Math.ceil(body.length / perPart));

  function send() {
    startTransition(async () => {
      const result = await sendTestMessage({ to, body });
      if (!result.ok) {
        toast.error(result.error ?? "The message did not go out.");
        router.refresh();
        return;
      }
      toast.success("Sent.");
      setBody("");
      router.refresh();
    });
  }

  if (!open) {
    return (
      <Button type="button" variant="outline" size="cta" onClick={() => setOpen(true)}>
        <Send className="size-4" aria-hidden="true" />
        Send a message
      </Button>
    );
  }

  return (
    <Panel>
      <h2 className="text-base font-semibold">Send one message</h2>
      <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
        Goes out through the same gateway as the automatic messages, and is
        recorded in the list below either way.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-[16rem_1fr]">
        <div>
          <Label htmlFor="msg-to">Mobile number</Label>
          <Input
            id="msg-to"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            placeholder="01778-838644"
            inputMode="tel"
            dir="ltr"
            className="mt-1 h-11 font-latin"
          />
        </div>
        <div>
          <Label htmlFor="msg-body">Message</Label>
          <Textarea
            id="msg-body"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={3}
            className="mt-1"
          />
          <p className="mt-1 text-xs text-[color:var(--muted-foreground)]">
            {body.length} characters · {parts} SMS{parts === 1 ? "" : " parts"} (
            {bangla ? "Bangla, 70 per part" : "English, 160 per part"})
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="brand"
          size="cta"
          disabled={pending || !to || !body}
          onClick={send}
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Send className="size-4" aria-hidden="true" />
          )}
          Send
        </Button>
        <Button type="button" variant="outline" size="cta" onClick={() => setOpen(false)}>
          Close
        </Button>
      </div>
    </Panel>
  );
}
