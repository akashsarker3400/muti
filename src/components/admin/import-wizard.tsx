"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

import {
  previewImport,
  runImport,
  type DuplicateMode,
  type ImportPreview,
  type ImportSummary,
  type RowIssue,
} from "@/app/actions/admin-import";
import { AdminBadge, Panel } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { parseCsv } from "@/lib/admin/csv";
import {
  IMPORT_ENTITIES,
  MAX_FILE_BYTES,
  MAX_ROWS,
  missingColumns,
  rowsToRecords,
} from "@/lib/admin/import/entities";

const SELECT =
  "h-11 w-full rounded-lg border border-[color:var(--input)] bg-white px-3 text-sm focus-visible:border-[color:var(--brand)] focus-visible:outline-none";

type Step = "choose" | "preview" | "done";

/**
 * Four-step import (addendum 3, §3): pick the entity and grab a template,
 * upload a .csv/.xlsx, review validation, run. The spreadsheet is parsed in
 * the browser so a 20,000-row file never has to be uploaded raw; only the
 * cleaned rows travel to the server, which validates them again.
 */
export function ImportWizard({
  initialEntity,
  exams,
  initialExamId,
}: {
  initialEntity: string;
  exams: Array<{ id: string; label: string }>;
  initialExamId: string;
}) {
  const router = useRouter();
  const [entityKey, setEntityKey] = useState(
    IMPORT_ENTITIES[initialEntity] ? initialEntity : "students",
  );
  const [examId, setExamId] = useState(initialExamId);
  const [fileName, setFileName] = useState("");
  const [records, setRecords] = useState<Array<Record<string, string>>>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [mode, setMode] = useState<DuplicateMode>("skip");
  const [skipInvalid, setSkipInvalid] = useState(true);
  const [step, setStep] = useState<Step>("choose");
  const [pending, startTransition] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);

  const entity = IMPORT_ENTITIES[entityKey]!;
  const context = entity.needsContext === "examId" ? examId : "";
  const missing = useMemo(() => missingColumns(entity, headers), [entity, headers]);

  async function onFile(file: File) {
    if (file.size > MAX_FILE_BYTES) {
      toast.error("The file is larger than 5 MB.");
      return;
    }
    try {
      let table: string[][];
      if (/\.xlsx?$/i.test(file.name)) {
        const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]!]!;
        table = XLSX.utils.sheet_to_json<string[]>(sheet, {
          header: 1,
          raw: false,
          defval: "",
        });
      } else {
        table = parseCsv((await file.text()).replace(/^﻿/, ""));
      }
      if (table.length - 1 > MAX_ROWS) {
        toast.error(`At most ${MAX_ROWS.toLocaleString()} rows.`);
        return;
      }
      const parsed = rowsToRecords(entity, table);
      setFileName(file.name);
      setHeaders(parsed.headers.map(String));
      setRecords(parsed.records);
      setPreview(null);
      setSummary(null);

      const gaps = missingColumns(entity, parsed.headers.map(String));
      if (gaps.length > 0) {
        toast.error(`Missing required columns: ${gaps.join(", ")}`);
        return;
      }
      if (parsed.records.length === 0) {
        toast.error("The file has no data rows.");
        return;
      }
      startTransition(async () => {
        const result = await previewImport({
          entity: entityKey,
          rows: parsed.records,
          context,
        });
        if (!result.ok) {
          toast.error(result.error ?? "Validation failed.");
          return;
        }
        setPreview(result);
        setStep("preview");
      });
    } catch (error) {
      console.error(error);
      toast.error("The file could not be read. It must be .csv or .xlsx.");
    } finally {
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  function run() {
    if (!preview) return;
    if (preview.issues.length > 0 && !skipInvalid) {
      toast.error(
        "Fix the invalid rows and upload again, or choose “Skip invalid rows and import the rest”.",
      );
      return;
    }
    startTransition(async () => {
      const result = await runImport(
        { entity: entityKey, rows: records, context },
        { mode, fileName },
      );
      if (!result.ok) {
        toast.error(result.error ?? "Import failed.");
        return;
      }
      setSummary(result);
      setStep("done");
      router.refresh();
    });
  }

  function reset() {
    setRecords([]);
    setHeaders([]);
    setPreview(null);
    setSummary(null);
    setFileName("");
    setStep("choose");
  }

  const issueRows = new Set((preview?.issues ?? []).map((i) => i.row));
  const previewRows = records.slice(0, 50);

  return (
    <div className="space-y-5">
      {/* ---- Step 1: entity + template ------------------------------------ */}
      <Panel>
        <h2 className="mb-3 text-base font-semibold">1. What to import</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="import-entity">Data type</Label>
            <select
              id="import-entity"
              value={entityKey}
              onChange={(event) => {
                setEntityKey(event.target.value);
                reset();
              }}
              className={SELECT}
              disabled={step !== "choose"}
            >
              {Object.values(IMPORT_ENTITIES).map((item) => (
                <option key={item.key} value={item.key}>
                  {item.labelEn}
                </option>
              ))}
            </select>
          </div>

          {entity.needsContext === "examId" && (
            <div className="space-y-1.5">
              <Label htmlFor="import-exam">Which exam</Label>
              <select
                id="import-exam"
                value={examId}
                onChange={(event) => setExamId(event.target.value)}
                className={SELECT}
                disabled={step !== "choose"}
              >
                <option value="">— select —</option>
                {exams.map((exam) => (
                  <option key={exam.id} value={exam.id}>
                    {exam.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-sm text-[color:var(--muted-foreground)]">
            Template:
          </span>
          <Button asChild variant="outline" size="cta">
            <a href={`/api/admin/import/template?entity=${entity.key}&format=xlsx`}>
              <FileSpreadsheet className="size-4" aria-hidden="true" />
              Excel (.xlsx)
            </a>
          </Button>
          <Button asChild variant="outline" size="cta">
            <a href={`/api/admin/import/template?entity=${entity.key}&format=csv`}>
              <Download className="size-4" aria-hidden="true" />
              CSV
            </a>
          </Button>
        </div>

        <details className="mt-4 text-sm">
          <summary className="cursor-pointer font-medium">Columns</summary>
          <ul className="mt-2 grid gap-1 sm:grid-cols-2">
            {entity.columns.map((column) => (
              <li key={column.key} className="flex gap-2">
                <code className="font-latin text-xs font-semibold text-[color:var(--brand)]">
                  {column.key}
                  {column.required && (
                    <span className="text-[color:var(--accent-red)]">*</span>
                  )}
                </code>
                <span className="text-[color:var(--muted-foreground)]">
                  {column.en}
                </span>
              </li>
            ))}
          </ul>
        </details>
      </Panel>

      {/* ---- Step 2: file ------------------------------------------------- */}
      {step === "choose" && (
        <Panel>
          <h2 className="mb-3 text-base font-semibold">2. Upload the file</h2>
          <input
            ref={fileInput}
            type="file"
            accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void onFile(file);
            }}
          />
          <Button
            type="button"
            variant="brand"
            size="cta"
            disabled={pending || (entity.needsContext === "examId" && !examId)}
            onClick={() => fileInput.current?.click()}
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Upload className="size-4" aria-hidden="true" />
            )}
            Choose a .csv / .xlsx file
          </Button>
          <p className="mt-2 text-xs text-[color:var(--muted-foreground)]">
            Up to 5 MB and {MAX_ROWS.toLocaleString("en")} rows. Header names are
            matched ignoring case, spaces and underscores. Bangla digits are accepted.
          </p>
          {missing.length > 0 && (
            <p className="mt-2 text-sm font-medium text-[color:var(--error)]">
              Missing required columns: {missing.join(", ")}
            </p>
          )}
        </Panel>
      )}

      {/* ---- Step 3: preview ---------------------------------------------- */}
      {step === "preview" && preview && (
        <Panel>
          <h2 className="mb-3 text-base font-semibold">3. Review: {fileName}</h2>
          <div className="mb-4 flex flex-wrap gap-2 text-sm">
            <AdminBadge tone="neutral">Total {preview.total}</AdminBadge>
            <AdminBadge tone="success">Valid {preview.valid}</AdminBadge>
            <AdminBadge tone="warning">Already exist {preview.duplicates}</AdminBadge>
            <AdminBadge tone={preview.issues.length ? "danger" : "neutral"}>
              Invalid {preview.issues.length}
            </AdminBadge>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="import-mode">Rows that already exist</Label>
              <select
                id="import-mode"
                value={mode}
                onChange={(event) => setMode(event.target.value as DuplicateMode)}
                className={SELECT}
              >
                <option value="skip">Skip duplicates</option>
                <option value="update">Update existing</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="import-invalid">Invalid rows</Label>
              <select
                id="import-invalid"
                value={skipInvalid ? "skip" : "stop"}
                onChange={(event) => setSkipInvalid(event.target.value === "skip")}
                className={SELECT}
              >
                <option value="skip">Skip invalid rows and import the rest</option>
                <option value="stop">Fix and re-upload</option>
              </select>
            </div>
          </div>

          {preview.issues.length > 0 && (
            <div className="mt-4 rounded-lg border border-[color:var(--error)]/30 bg-[color:var(--error)]/5 p-3 text-sm">
              <p className="mb-1 flex items-center gap-1.5 font-medium text-[color:var(--error)]">
                <AlertTriangle className="size-4" aria-hidden="true" />
                {preview.issues.length} rows have problems
              </p>
              <ul className="max-h-40 space-y-0.5 overflow-y-auto font-latin text-xs">
                {preview.issues.slice(0, 100).map((issue) => (
                  <li key={`${issue.row}-${issue.message}`}>
                    Row {issue.row}: <span className="font-sans">{issue.message}</span>
                  </li>
                ))}
              </ul>
              <IssuesDownload issues={preview.issues} fileName={fileName} />
            </div>
          )}

          <div className="mt-4 overflow-x-auto rounded-lg border border-[color:var(--border)]">
            <table className="w-full text-xs">
              <thead className="bg-[color:var(--bg-soft)] text-[color:var(--muted-foreground)]">
                <tr>
                  <th className="px-2 py-1.5 text-start font-medium">#</th>
                  {entity.columns.map((column) => (
                    <th
                      key={column.key}
                      className="px-2 py-1.5 text-start font-latin font-medium whitespace-nowrap"
                    >
                      {column.key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--border)]">
                {previewRows.map((record, index) => {
                  const line = index + 2;
                  const bad = issueRows.has(line);
                  return (
                    <tr key={line} className={bad ? "bg-[color:var(--error)]/8" : ""}>
                      <td className="px-2 py-1 font-latin text-[color:var(--muted-foreground)]">
                        {line}
                      </td>
                      {entity.columns.map((column) => (
                        <td
                          key={column.key}
                          className="max-w-[16rem] truncate px-2 py-1"
                        >
                          {record[column.key] ?? ""}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {records.length > previewRows.length && (
              <p className="px-2 py-1.5 text-xs text-[color:var(--muted-foreground)]">
                Showing the first {previewRows.length} rows of {records.length}.
              </p>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="brand"
              size="cta"
              onClick={run}
              disabled={pending}
            >
              {pending && (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              )}
              4. Import
            </Button>
            <Button
              type="button"
              variant="outline"
              size="cta"
              onClick={reset}
              disabled={pending}
            >
              Another file
            </Button>
          </div>
        </Panel>
      )}

      {/* ---- Step 4: summary ---------------------------------------------- */}
      {step === "done" && summary && (
        <Panel>
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold">
            <CheckCircle2
              className="size-5 text-[color:var(--success)]"
              aria-hidden="true"
            />
            Import complete
          </h2>
          <dl className="grid gap-3 text-sm sm:grid-cols-4">
            <Stat label="Total rows" value={summary.total} />
            <Stat label="New" value={summary.created} />
            <Stat label="Updated" value={summary.updated} />
            <Stat label="Skipped" value={summary.skipped} />
          </dl>
          {summary.issues.length > 0 && (
            <div className="mt-4 text-sm">
              <p className="font-medium text-[color:var(--error)]">
                {summary.issues.length} rows were skipped because of errors.
              </p>
              <IssuesDownload issues={summary.issues} fileName={fileName} />
            </div>
          )}
          <Button
            type="button"
            variant="outline"
            size="cta"
            className="mt-4"
            onClick={reset}
          >
            Import another file
          </Button>
        </Panel>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-[color:var(--border)] p-3">
      <dt className="text-xs text-[color:var(--muted-foreground)]">{label}</dt>
      <dd className="font-latin text-xl font-bold">{value}</dd>
    </div>
  );
}

/** The error list as a CSV the office can open next to the original file. */
function IssuesDownload({
  issues,
  fileName,
}: {
  issues: RowIssue[];
  fileName: string;
}) {
  const csv = `﻿row,message\r\n${issues
    .map((issue) => `${issue.row},"${issue.message.replace(/"/g, '""')}"`)
    .join("\r\n")}\r\n`;
  const href = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
  return (
    <a
      href={href}
      download={`${fileName.replace(/\.[^.]+$/, "") || "import"}-errors.csv`}
      className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[color:var(--brand)] underline"
    >
      <Download className="size-3.5" aria-hidden="true" />
      Error list (CSV)
    </a>
  );
}
