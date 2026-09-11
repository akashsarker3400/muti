"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileUp, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { importStudents, type ImportResult } from "@/app/actions/admin-students";
import { Panel } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";

const TEMPLATE =
  "roll,certificateNo,name,phone,courseCode,batchName,completionDate\n" +
  'DMU-2026-001,MUTI-2026-0001,Dr. Rahim Uddin,01778838644,DMU,"DMU Batch, Session 2026",2026-12-20\n';

/** CSV import for the students list (section 7.5). */
export function StudentImport() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [pending, startTransition] = useTransition();

  function onFile(file: File) {
    startTransition(async () => {
      const text = await file.text();
      const outcome = await importStudents(text);
      setResult(outcome);

      if (outcome.ok) {
        toast.success(
          `${outcome.created ?? 0} টি নতুন, ${outcome.updated ?? 0} টি হালনাগাদ হয়েছে।`,
        );
        router.refresh();
      } else {
        toast.error(outcome.error ?? "ইমপোর্ট করা যায়নি।");
      }

      if (inputRef.current) inputRef.current.value = "";
    });
  }

  return (
    <Panel className="mb-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold">CSV থেকে ইমপোর্ট</h2>
          <p className="mt-1 text-xs text-[color:var(--muted-foreground)]">
            কলাম:{" "}
            <span className="font-latin">
              roll, certificateNo, name, phone, courseCode, batchName, completionDate
            </span>
            । একই <span className="font-latin">roll</span> থাকলে সেই শিক্ষার্থীর তথ্য
            হালনাগাদ হবে। সমাপ্তির তারিখ দিলে সনদ স্বয়ংক্রিয়ভাবে যাচাইযোগ্য হয়ে যাবে।
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button asChild variant="ghost" size="cta">
            <a
              href={`data:text/csv;charset=utf-8,${encodeURIComponent(TEMPLATE)}`}
              download="muti-students-template.csv"
            >
              নমুনা ফাইল
            </a>
          </Button>

          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onFile(file);
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="cta"
            disabled={pending}
            onClick={() => inputRef.current?.click()}
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <FileUp className="size-4" aria-hidden="true" />
            )}
            CSV আপলোড
          </Button>
        </div>
      </div>

      {result?.ok && (
        <div className="mt-4 rounded-lg bg-[color:var(--bg-soft)] p-3 text-sm">
          <p>
            <strong className="nums">{result.created ?? 0}</strong> টি নতুন,{" "}
            <strong className="nums">{result.updated ?? 0}</strong> টি হালনাগাদ।
          </p>

          {result.skipped && result.skipped.length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer text-[color:var(--warning)]">
                {result.skipped.length} টি সারি বাদ পড়েছে — বিস্তারিত দেখুন
              </summary>
              <ul className="mt-2 space-y-1 text-xs">
                {result.skipped.map((row) => (
                  <li key={row.line}>
                    সারি <span className="nums">{row.line}</span>: {row.reason}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </Panel>
  );
}
