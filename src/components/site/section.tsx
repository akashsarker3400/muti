import { cn } from "cn";

/**
 * Standard section rhythm and heading block, so every public page shares the
 * same vertical spacing and title treatment (section 4).
 */
export function Section({
  children,
  soft = false,
  className,
  id,
}: {
  children: React.ReactNode;
  soft?: boolean;
  className?: string;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={cn("section", soft && "bg-[color:var(--bg-soft)]", className)}
    >
      <div className="container-content">{children}</div>
    </section>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "start",
  action,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: "start" | "center";
  action?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "mb-8 flex flex-col gap-3 md:mb-10",
        align === "center" && "items-center text-center",
        action && "md:flex-row md:items-end md:justify-between md:text-start",
      )}
    >
      <div className={cn("space-y-2", align === "center" && "max-w-2xl")}>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2 className="h2">{title}</h2>
        {subtitle && (
          <p className="max-w-2xl text-[color:var(--muted-foreground)]">{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
