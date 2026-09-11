"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { Panel } from "@/components/admin/ui";
import { UploadField } from "@/components/admin/upload-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { FieldDef, FormSection, FormValues } from "@/lib/admin/fields";
import { cn } from "cn";

export type SaveResult =
  | { ok: true; id?: string }
  | { ok: false; errors?: Record<string, string>; error?: string };

/**
 * Renders an admin form from field definitions (section 7). Bilingual fields
 * are grouped into Bangla/English tabs automatically, and sections become
 * top-level tabs when a resource declares more than one.
 */
export function ResourceForm({
  sections,
  defaultValues,
  onSave,
  submitLabel = "সংরক্ষণ করুন",
  cancelHref,
  extra,
}: {
  sections: FormSection[];
  defaultValues: FormValues;
  onSave: (values: FormValues) => Promise<SaveResult>;
  submitLabel?: string;
  cancelHref: string;
  /** Rendered below the sections, e.g. the course routine editor. */
  extra?: React.ReactNode;
}) {
  const router = useRouter();
  const [values, setValues] = useState<FormValues>(defaultValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  function setValue(name: string, value: FormValues[string]) {
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => {
      if (!current[name]) return current;
      const next = { ...current };
      delete next[name];
      return next;
    });
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await onSave(values);

      if (result.ok) {
        toast.success("সংরক্ষণ করা হয়েছে।");
        router.push(cancelHref);
        router.refresh();
        return;
      }

      if (result.errors) {
        setErrors(result.errors);
        toast.error("কিছু ফিল্ড ঠিক করতে হবে।");
        return;
      }

      toast.error(result.error ?? "সংরক্ষণ করা যায়নি।");
    });
  }

  const multiSection = sections.length > 1;

  const body = multiSection ? (
    <Tabs defaultValue={sections[0]!.id}>
      <TabsList className="mb-4 flex-wrap">
        {sections.map((section) => (
          <TabsTrigger key={section.id} value={section.id}>
            {section.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {sections.map((section) => (
        <TabsContent key={section.id} value={section.id}>
          <SectionBody
            section={section}
            values={values}
            errors={errors}
            setValue={setValue}
          />
        </TabsContent>
      ))}
    </Tabs>
  ) : (
    <SectionBody
      section={sections[0]!}
      values={values}
      errors={errors}
      setValue={setValue}
    />
  );

  return (
    <form onSubmit={submit} className="space-y-5">
      <Panel>{body}</Panel>

      {extra}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" variant="brand" size="cta" disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          {submitLabel}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="cta"
          onClick={() => router.push(cancelHref)}
          disabled={pending}
        >
          বাতিল
        </Button>
      </div>
    </form>
  );
}

function SectionBody({
  section,
  values,
  errors,
  setValue,
}: {
  section: FormSection;
  values: FormValues;
  errors: Record<string, string>;
  setValue: (name: string, value: FormValues[string]) => void;
}) {
  const bilingual = section.fields.filter((field) => field.lang);
  const plain = section.fields.filter((field) => !field.lang);
  // The BN/EN block sits where the first bilingual field was declared.
  const bilingualIndex = section.fields.findIndex((field) => field.lang);

  const before = bilingualIndex === -1 ? plain : plain.slice(0, bilingualIndex);
  const after = bilingualIndex === -1 ? [] : plain.slice(bilingualIndex);

  return (
    <div className="space-y-5">
      {section.description && (
        <p className="text-sm text-[color:var(--muted-foreground)]">
          {section.description}
        </p>
      )}

      <FieldGrid fields={before} values={values} errors={errors} setValue={setValue} />

      {bilingual.length > 0 && (
        <Tabs defaultValue="bn">
          <TabsList className="mb-3">
            <TabsTrigger value="bn">বাংলা</TabsTrigger>
            <TabsTrigger value="en">English</TabsTrigger>
          </TabsList>
          <TabsContent value="bn">
            <FieldGrid
              fields={bilingual.filter((field) => field.lang === "bn")}
              values={values}
              errors={errors}
              setValue={setValue}
            />
          </TabsContent>
          <TabsContent value="en">
            <FieldGrid
              fields={bilingual.filter((field) => field.lang === "en")}
              values={values}
              errors={errors}
              setValue={setValue}
            />
            <p className="mt-3 text-xs text-[color:var(--muted-foreground)]">
              ইংরেজি ফাঁকা রাখলে ওয়েবসাইটে বাংলা লেখাটিই দেখানো হবে।
            </p>
          </TabsContent>
        </Tabs>
      )}

      <FieldGrid fields={after} values={values} errors={errors} setValue={setValue} />
    </div>
  );
}

function FieldGrid({
  fields,
  values,
  errors,
  setValue,
}: {
  fields: FieldDef[];
  values: FormValues;
  errors: Record<string, string>;
  setValue: (name: string, value: FormValues[string]) => void;
}) {
  if (fields.length === 0) return null;

  return (
    <div className="grid gap-5 md:grid-cols-2">
      {fields.map((field) => (
        <FieldControl
          key={field.name}
          field={field}
          value={values[field.name]}
          error={errors[field.name]}
          setValue={setValue}
        />
      ))}
    </div>
  );
}

function FieldControl({
  field,
  value,
  error,
  setValue,
}: {
  field: FieldDef;
  value: FormValues[string];
  error?: string;
  setValue: (name: string, value: FormValues[string]) => void;
}) {
  const id = `field-${field.name}`;
  const wide =
    field.full ||
    field.type === "richtext" ||
    field.type === "textarea" ||
    field.type === "image" ||
    field.type === "file" ||
    field.type === "tags";

  const inputClass = cn("h-11", field.latin && "font-latin");

  return (
    <div className={cn("space-y-1.5", wide && "md:col-span-2")}>
      {field.type !== "checkbox" && (
        <Label htmlFor={id}>
          {field.label}
          {field.required && (
            <span className="text-[color:var(--accent-red)]" aria-hidden="true">
              *
            </span>
          )}
        </Label>
      )}

      {field.type === "text" && (
        <Input
          id={id}
          value={String(value ?? "")}
          onChange={(event) => setValue(field.name, event.target.value)}
          placeholder={field.placeholder}
          dir={field.latin ? "ltr" : undefined}
          aria-invalid={error ? true : undefined}
          className={inputClass}
        />
      )}

      {field.type === "number" && (
        <Input
          id={id}
          type="number"
          value={value === null || value === undefined ? "" : String(value)}
          onChange={(event) =>
            setValue(
              field.name,
              event.target.value === "" ? "" : Number(event.target.value),
            )
          }
          placeholder={field.placeholder}
          dir="ltr"
          aria-invalid={error ? true : undefined}
          className="h-11 font-latin"
        />
      )}

      {field.type === "date" && (
        <Input
          id={id}
          type="date"
          value={String(value ?? "")}
          onChange={(event) => setValue(field.name, event.target.value)}
          dir="ltr"
          aria-invalid={error ? true : undefined}
          className="h-11 font-latin"
        />
      )}

      {field.type === "textarea" && (
        <Textarea
          id={id}
          rows={4}
          value={String(value ?? "")}
          onChange={(event) => setValue(field.name, event.target.value)}
          placeholder={field.placeholder}
          aria-invalid={error ? true : undefined}
        />
      )}

      {field.type === "richtext" && (
        <RichTextEditor
          value={String(value ?? "")}
          onChange={(html) => setValue(field.name, html)}
          placeholder={field.placeholder}
        />
      )}

      {field.type === "select" && (
        <select
          id={id}
          value={String(value ?? "")}
          onChange={(event) => setValue(field.name, event.target.value)}
          aria-invalid={error ? true : undefined}
          className="h-11 w-full rounded-lg border border-[color:var(--input)] bg-white px-3 text-sm focus-visible:border-[color:var(--brand)] focus-visible:outline-none"
        >
          <option value="">— বাছাই করুন —</option>
          {field.options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}

      {field.type === "checkbox" && (
        <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm">
          <input
            id={id}
            type="checkbox"
            checked={Boolean(value)}
            onChange={(event) => setValue(field.name, event.target.checked)}
            className="size-4 accent-[color:var(--brand)]"
          />
          {field.label}
        </label>
      )}

      {(field.type === "image" || field.type === "file") && (
        <UploadField
          value={String(value ?? "")}
          onChange={(url) => setValue(field.name, url)}
          kind={field.type === "image" ? "image" : "file"}
          accept={field.type === "image" ? "image/*" : "application/pdf,image/*"}
        />
      )}

      {field.type === "tags" && (
        <Input
          id={id}
          value={Array.isArray(value) ? value.join(", ") : String(value ?? "")}
          onChange={(event) =>
            setValue(
              field.name,
              event.target.value
                .split(",")
                .map((tag) => tag.trim())
                .filter(Boolean),
            )
          }
          placeholder={field.placeholder ?? "কমা দিয়ে আলাদা করুন"}
          dir="ltr"
          className="h-11 font-latin"
        />
      )}

      {field.hint && !error && (
        <p className="text-xs text-[color:var(--muted-foreground)]">{field.hint}</p>
      )}
      {error && (
        <p className="text-xs font-medium text-[color:var(--error)]">{error}</p>
      )}
    </div>
  );
}
