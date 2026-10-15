import { createFileRoute, useNavigate } from "@tanstack/react-router";
import * as z from "zod/mini";
import { EmptyState, PageHeader, Panel, Section, StatTile } from "@/components/layout";
import { ErrorState, TableSkeleton } from "@/components/shared";
import { DraftTable } from "@/components/draft";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useDraft, usePageTitle, useTeams } from "@/hooks";
import { getTeamName } from "@/lib/team-names";
import type { DraftLottery } from "@/types";

const searchSchema = z.object({
  year: z.optional(z.number()),
  team: z.optional(z.string()),
});

export const Route = createFileRoute("/draft")({
  component: DraftPage,
  validateSearch: searchSchema,
});

const ALL_TEAMS = "all";

/** That year's lottery: the format as the NHL tells it, and its odds chart. */
function DraftLotteryPanel({ lottery, year }: { lottery: DraftLottery; year: number }) {
  const paragraphs = (text: string | null) => (text ? text.split("\n").filter(Boolean) : []);
  return (
    <Section title={`${year} draft lottery`} description="How the lottery worked and the odds going in, from NHL records.">
      <Panel className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3 text-sm leading-relaxed">
          {[...paragraphs(lottery.format), ...paragraphs(lottery.results)].map((p, i) => (
            <p key={i}>{p}</p>
          ))}
          {paragraphs(lottery.notes).map((p, i) => (
            <p key={`n${i}`} className="text-xs text-muted-foreground">
              {p}
            </p>
          ))}
        </div>
        {lottery.oddsImageUrl && (
          <a href={lottery.oddsImageUrl} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl border">
            <img src={lottery.oddsImageUrl} alt={`${year} draft lottery odds`} loading="lazy" className="w-full" />
          </a>
        )}
      </Panel>
    </Section>
  );
}

function share(count: number, total: number): string {
  return total > 0 ? `${Math.round((100 * count) / total)}% of picks` : "–";
}

function DraftPage() {
  usePageTitle("Entry draft");
  const { year, team } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { data, isLoading, error, refetch } = useDraft(year, team);
  const { data: teamsData } = useTeams();
  const teams = (teamsData?.teams ?? []).filter((t) => t.isActive).sort((a, b) => a.name.localeCompare(b.name));

  const selectedYear = data?.year ?? year;

  return (
    <div className="container space-y-6 py-8">
      <PageHeader
        title="Entry draft"
        description="Every pick in a draft class and the NHL career that followed, from NHL records."
        actions={
          <>
            <Select
              value={selectedYear?.toString()}
              onValueChange={(v) => navigate({ search: (prev) => ({ ...prev, year: Number(v) }) })}
            >
              <SelectTrigger className="w-28" aria-label="Draft year">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {(data?.years ?? []).map((y) => (
                  <SelectItem key={y} value={y.toString()}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={team ?? ALL_TEAMS}
              onValueChange={(v) => navigate({ search: (prev) => ({ ...prev, team: v === ALL_TEAMS ? undefined : v }) })}
            >
              <SelectTrigger className="w-48" aria-label="Team">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_TEAMS}>All teams</SelectItem>
                {teams.map((t) => (
                  <SelectItem key={t.abbreviation} value={t.abbreviation}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        }
      />

      {error ? (
        <ErrorState title="Couldn't load the draft" message="The draft request failed." onRetry={() => refetch()} />
      ) : isLoading || !data ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-24 rounded-2xl" />
            ))}
          </div>
          <TableSkeleton rows={12} />
        </>
      ) : data.picks.length === 0 ? (
        <EmptyState
          title={data.years.length === 0 ? "No draft data yet" : `No picks in ${data.year}`}
          hint={data.years.length === 0 ? "NHL records load weekly; check back after the next update." : "Try another year or all teams."}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatTile
              label="Picks"
              value={data.summary.picks}
              note={data.team ? `${getTeamName(data.team)}, ${data.year}` : `${data.year} draft`}
            />
            <StatTile label="Played an NHL game" value={data.summary.playedOne} note={share(data.summary.playedOne, data.summary.picks)} />
            <StatTile label="Played 200+ NHL games" value={data.summary.played200} note={share(data.summary.played200, data.summary.picks)} />
          </div>
          <DraftTable picks={data.picks} />
          {data.lottery && !data.team && <DraftLotteryPanel lottery={data.lottery} year={data.year} />}
          <p className="text-xs text-muted-foreground">
            NHL regular-season careers in every era, updated weekly. Player links go to our player pages, which start in 2008–09.
          </p>
        </>
      )}
    </div>
  );
}
