import { cn } from "@/lib/utils";

/**
 * Underlined tab row that sits under a page hero. Each tab is rendered by the
 * caller (usually a router <Link>) and marks itself active with
 * `data-active="true"` or the router's `active` class.
 */
export function PageTabs({
  className,
  children,
  "aria-label": ariaLabel,
}: {
  className?: string;
  children: React.ReactNode;
  "aria-label": string;
}) {
  return (
    <nav
      aria-label={ariaLabel}
      className={cn("border-b bg-card", className)}
    >
      <div className="container flex gap-1 overflow-x-auto [scrollbar-width:none]">
        {children}
      </div>
    </nav>
  );
}

export const pageTabClass =
  "relative shrink-0 px-3 py-3.5 text-sm text-muted-foreground transition-colors hover:text-foreground after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-transparent data-[active=true]:font-semibold data-[active=true]:text-foreground data-[active=true]:after:bg-primary [&.active]:font-semibold [&.active]:text-foreground [&.active]:after:bg-primary";
