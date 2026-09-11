"use client";

import { useMemo, useState, useTransition } from "react";
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

type Lang = "bn" | "en";

/** Where each field lives, so a validation error can be brought into view. */
type FieldPlace = { sectionId: string; lang?: Lang; label: string };

function indexFields(sections: FormSection[]): Map<string, FieldPlace> {
  const places = new Map<string, FieldPlace>();
  for (const section of sections) {
    for (const field of section.fields) {
      places.set(field.name, {
        sectionId: section.id,
        lang: field.lang,
        label: field.label,
      });
    }
  }
  return places;
}

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
  // Both tab levels are controlled so a failed save can open the tab that
  // holds the offending field — an error under a closed tab is invisible.
  const [section, setSection] = useState(sections[0]!.id);
  const [lang, setLang] = useState<Lang>("bn");
  const places = useMemo(() => indexFields(sections), [sections]);

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
        revealErrors(result.errors);
        return;
      }

      toast.error(result.error ?? "সংরক্ষণ করা যায়নি।");
    });
  }

  /**
   * Name the fields that failed, open the tab holding the first one and put
   * the cursor there. Field order follows the form, not the server's object.
   */
  function revealErrors(fieldErrors: Record<string, string>) {
    const failed = [...places.entries()].filter(([name]) => fieldErrors[name]);
    // Errors on fields this form does not render (e.g. a unique-slug clash
    // reported under another key) still need to be surfaced somewhere.
    const unplaced = Object.keys(fieldErrors).filter((name) => !places.has(name));

    const lines = [
      ...failed.map(([name, place]) => `${place.label}: ${fieldErrors[name]}`),
      ...unplaced.map((name) => `${name}: ${fieldErrors[name]}`),
    ];

    toast.error("কিছু ফিল্ড ঠিক করতে হবে।", {
      description: (
        <ul className="mt-1 list-disc space-y-0.5 ps-4">
          {lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ),
      duration: 8000,
    });

    const first = failed[0];
    if (!first) return;
    const [name, place] = first;
    setSection(place.sectionId);
    if (place.lang) setLang(place.lang);

    // The tab content mounts on the next frame; only then can it be focused.
    requestAnimationFrame(() => {
      const wrapper = document.querySelector<HTMLElement>(`[data-field="${name}"]`);
      wrapper?.scrollIntoView({ block: "center", behavior: "smooth" });
      document.getElementById(`field-${name}`)?.focus({ preventScroll: true });
    });
  }

  const sectionErrorCount = (sectionId: string) =>
    [...places.entries()].filter(
      ([name, place]) => place.sectionId === sectionId && errors[name],
    ).length;

  const multiSection = sections.length > 1;

  const body = multiSection ? (
    <Tabs value={section} onValueChange={setSection}>
      <TabsList className="mb-4 flex-wrap">
        {sections.map((item) => (
          <TabsTrigger key={item.id} value={item.id}>
            {item.label}
            <ErrorDot count={sectionErrorCount(item.id)} />
          </TabsTrigger>
        ))}
      </TabsList>
      {sections.map((item) => (
        <TabsContent key={item.id} value={item.id}>
          <SectionBody
            section={item}
            values={values}
            errors={errors}
            setValue={setValue}
            lang={lang}
            setLang={setLang}
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
      lang={lang}
      setLang={setLang}
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

/** Red badge on a tab trigger so a hidden error is still visible. */
function ErrorDot({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span
      className="ms-1.5 inline-flex min-w-4 items-center justify-center rounded-full bg-[color:var(--error)] px-1 font-latin text-[10px] leading-4 font-bold text-white"
      aria-label={`${count} ভুল`}
    >
      {count}
    </span>
  );
}

function SectionBody({
  section,
  values,
  errors,
  setValue,
  lang,
  setLang,
}: {
  section: FormSection;
  values: FormValues;
  errors: Record<string, string>;
  setValue: (name: string, value: FormValues[string]) => void;
  lang: Lang;
  setLang: (lang: Lang) => void;
}) {
  const bilingual = section.fields.filter((field) => field.lang);
  const langErrorCount = (which: Lang) =>
    bilingual.filter((field) => field.lang === which && errors[field.name]).length;
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
        <Tabs value={lang} onValueChange={(value) => setLang(value as Lang)}>
          <TabsList className="mb-3">
            <TabsTrigger value="bn">
              বাংলা
              <ErrorDot count={langErrorCount("bn")} />
            </TabsTrigger>
            <TabsTrigger value="en">
              English
              <ErrorDot count={langErrorCount("en")} />
            </TabsTrigger>
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
    // `min-w-0` lets the cell shrink below its content's intrinsic width —
    // without it a grid item's default `min-width: auto` pushes the whole
    // form wider than a phone screen.
    <div
      data-field={field.name}
      className={cn("min-w-0 space-y-1.5", wide && "md:col-span-2")}
    >
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
          id={id}
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
