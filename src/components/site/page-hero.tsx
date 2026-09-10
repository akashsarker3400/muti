import { cn } from "cn";

/** Compact page header used by every inner public page. */
export function PageHero({
  title,
  subtitle,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border-b border-[color:var(--border)] bg-[color:var(--bg-soft)]",
        className,
      )}
    >
      <div className="container-content py-10 md:py-14">
        <h1 className="h1 max-w-3xl">{title}</h1>
        {subtitle && (
          <p className="mt-3 max-w-2xl text-[color:var(--muted-foreground)]">
            {subtitle}
          </p>
        )}
        {children && <div className="mt-6">{children}</div>}
      </div>
    </div>
  );
}
