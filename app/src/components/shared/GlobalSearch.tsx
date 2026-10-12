import { lazy, Suspense, useEffect, useState } from "react";
import { SearchIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const loadDialog = () => import("@/components/shared/GlobalSearchDialog");
const GlobalSearchDialog = lazy(loadDialog);

/** Header search: players (server search) and teams (filtered locally). */
export function GlobalSearch({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  // Mount the dialog on first open and keep it mounted for its close animation.
  const [loaded, setLoaded] = useState(false);

  const show = (next: boolean) => {
    if (next) setLoaded(true);
    setOpen(next);
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setLoaded(true);
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => show(true)}
        onPointerEnter={loadDialog}
        onFocus={loadDialog}
        className={cn(
          "flex h-9 items-center gap-2 rounded-full border bg-card px-3.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
          className,
        )}
      >
        <SearchIcon className="size-4" />
        <span className="hidden flex-1 text-left sm:inline">
          Search players or teams
        </span>
        <kbd className="hidden rounded-md border bg-muted px-1.5 font-sans text-[11px] lg:inline">
          ⌘K
        </kbd>
        <span className="sr-only sm:hidden">Search</span>
      </button>
      {loaded && (
        <Suspense fallback={null}>
          <GlobalSearchDialog open={open} onOpenChange={show} />
        </Suspense>
      )}
    </>
  );
}
