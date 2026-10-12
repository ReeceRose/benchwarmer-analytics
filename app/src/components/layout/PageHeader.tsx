import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: React.ReactNode;
  /** One plain sentence about what the page shows. */
  description?: React.ReactNode;
  /** Filters and view toggles, right-aligned on wide screens. */
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 md:flex-row md:items-end md:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="text-3xl font-bold leading-tight md:text-4xl">{title}</h1>
        {description && (
          <p className="mt-1.5 max-w-2xl text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      )}
    </div>
  );
}
