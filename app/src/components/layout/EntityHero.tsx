import { getTeamColours } from "@/lib/team-colours";
import { getTeamLogoUrl } from "@/lib/team-logos";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface EntityHeroProps {
  // Team whose colours and watermark the hero takes on.
  teamAbbrev?: string | null;
  /** Small line above the hero content, e.g. a breadcrumb. */
  crumb?: React.ReactNode;
  /** Headshot or logo, bottom-aligned with the hero edge. */
  media?: React.ReactNode;
  badges?: React.ReactNode;
  title: React.ReactNode;
  meta?: React.ReactNode;
  /** Headline numbers, usually <HeroStat>s. */
  stats?: React.ReactNode;
  statsCaption?: React.ReactNode;
}

/**
 * Team-coloured header for player, team and game pages: the one loud element
 * on those pages. Everything below it stays on the neutral theme.
 */
export function EntityHero({
  teamAbbrev,
  crumb,
  media,
  badges,
  title,
  meta,
  stats,
  statsCaption,
}: EntityHeroProps) {
  const colours = getTeamColours(teamAbbrev);

  return (
    <div
      className="relative overflow-hidden text-white"
      style={{
        backgroundColor: colours.primary,
        backgroundImage:
          "linear-gradient(115deg, rgb(255 255 255 / 0.06), rgb(0 0 0 / 0.18))",
        borderBottom: `4px solid ${colours.accent}`,
      }}
    >
      {teamAbbrev && (
        <img
          src={getTeamLogoUrl(teamAbbrev, "dark")}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute -top-16 -right-16 w-80 opacity-[0.08] select-none md:w-104"
        />
      )}
      <div className="container relative pt-5">
        {crumb && <div className="mb-3 text-sm text-white/75">{crumb}</div>}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:gap-6">
          <div className="flex min-w-0 flex-1 items-end gap-4 sm:gap-6">
            {media && <div className="shrink-0">{media}</div>}
            <div className="min-w-0 pb-5">
              {badges && (
                <div className="mb-2 flex flex-wrap gap-1.5">{badges}</div>
              )}
              <h1 className="text-2xl leading-[1.05] font-bold text-white min-[420px]:text-3xl sm:text-4xl lg:text-[2.75rem]">
                {title}
              </h1>
              {meta && (
                <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/85">
                  {meta}
                </div>
              )}
            </div>
          </div>
          {stats && (
            <div className="pb-5 lg:shrink-0">
              {statsCaption && (
                <div className="mb-1.5 text-xs text-white/75 lg:text-right">
                  {statsCaption}
                </div>
              )}
              <dl className="grid auto-cols-fr grid-flow-col gap-0.5 rounded-2xl bg-black/20 p-1.5 sm:flex">
                {stats}
              </dl>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function HeroBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold">
      {children}
    </span>
  );
}

export function HeroStat({
  label,
  value,
  note,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  /** Small highlight under the value, e.g. a league rank. */
  note?: React.ReactNode;
}) {
  return (
    <div className="min-w-0 px-2 py-1.5 sm:min-w-17 sm:px-4">
      <dt className="truncate text-xs text-white/75">{label}</dt>
      <dd className="font-display text-lg leading-tight font-bold tabular-nums min-[420px]:text-2xl sm:text-3xl">
        {value}
      </dd>
      {note && (
        <dd className="text-[11px] font-semibold whitespace-nowrap text-white/90">
          {note}
        </dd>
      )}
    </div>
  );
}

/** Neutral placeholder with the same footprint as a loaded hero. */
export function EntityHeroSkeleton({ media = "square" }: { media?: "square" | "none" }) {
  return (
    <div className="border-b-4 border-border bg-muted">
      <div className="container pt-5">
        <Skeleton className="mb-3 h-4 w-32 bg-background/60" />
        <div className="flex items-end gap-6">
          {media === "square" && (
            <Skeleton className="size-28 rounded-b-none bg-background/60 sm:size-36" />
          )}
          <div className={cn("flex-1 space-y-3 pb-5")}>
            <Skeleton className="h-5 w-24 bg-background/60" />
            <Skeleton className="h-10 w-72 max-w-full bg-background/60" />
            <Skeleton className="h-4 w-56 bg-background/60" />
          </div>
          <Skeleton className="mb-5 hidden h-20 w-96 rounded-2xl bg-background/60 lg:block" />
        </div>
      </div>
    </div>
  );
}
