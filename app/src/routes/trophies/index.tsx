import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader, Section } from "@/components/layout";
import { ErrorState } from "@/components/shared";
import { Skeleton } from "@/components/ui/skeleton";
import { TrophyImage } from "@/components/trophies/TrophyImage";
import { usePageTitle, useTrophies } from "@/hooks";
import { formatSeason } from "@/lib/formatters";
import type { TrophyCategory, TrophySummary } from "@/types";

export const Route = createFileRoute("/trophies/")({
  component: TrophiesPage,
});

const GROUPS: { category: TrophyCategory; title: string; description: string }[] = [
  { category: "player", title: "Player awards", description: "Individual trophies, from the Hart to the Masterton." },
  { category: "team", title: "Team trophies", description: "The Stanley Cup, conference titles and the Presidents' Trophy." },
  { category: "coach", title: "Coaches", description: "" },
  { category: "gm", title: "General managers", description: "" },
  { category: "other", title: "Other honours", description: "Service to the game, prospects and the community." },
];

// Player awards, biggest first; anything else keeps the NHL's order after these.
const PLAYER_ORDER = [
  "hart-memorial", "ted-lindsay", "vezina", "james-norris", "calder-memorial", "conn-smythe", "art-ross",
  "maurice-richard", "frank-j-selke", "william-m-jennings", "lady-byng", "bill-masterton", "king-clancey",
  "mark-messier", "foundation-player",
];
const rank = (slug: string) => {
  const i = PLAYER_ORDER.indexOf(slug);
  return i === -1 ? PLAYER_ORDER.length : i;
};

function latest(t: TrophySummary): string {
  if (t.latestWinners.length === 0) return "Not awarded yet";
  const season = formatSeason(t.latestWinners[0].season);
  const names = t.latestWinners.map((w) => (w.team && w.playerId ? `${w.name} (${w.team})` : w.name)).join(" and ");
  return `${season}: ${names}`;
}

function TrophyCard({ trophy }: { trophy: TrophySummary }) {
  return (
    <Link
      to="/trophies/$slug"
      params={{ slug: trophy.slug }}
      className="group flex gap-4 rounded-2xl border bg-card p-4 transition-colors hover:bg-muted/60"
    >
      <TrophyImage src={trophy.imageUrl} className="w-14" />
      <div className="min-w-0">
        <div className="font-medium group-hover:text-link">{trophy.name}</div>
        {trophy.description && <div className="mt-0.5 text-sm text-muted-foreground">{trophy.description}</div>}
        <div className="mt-2 text-xs text-muted-foreground">{latest(trophy)}</div>
      </div>
    </Link>
  );
}

function TrophiesPage() {
  usePageTitle("Trophies");
  const { data, isLoading, error, refetch } = useTrophies();

  return (
    <div className="container space-y-8 py-8">
      <PageHeader
        title="Trophies"
        description="Every NHL trophy and award, with every winner, runner-up and finalist back to the 1920s."
      />
      {error ? (
        <ErrorState title="Couldn't load trophies" message="The trophies request failed." onRetry={() => refetch()} />
      ) : isLoading || !data ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }, (_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      ) : (
        GROUPS.map((g) => {
          const list = data.trophies.filter((t) => t.category === g.category).sort((a, b) => rank(a.slug) - rank(b.slug));
          if (list.length === 0) return null;
          return (
            <Section key={g.category} title={g.title} description={g.description || undefined}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((t) => (
                  <TrophyCard key={t.slug} trophy={t} />
                ))}
              </div>
            </Section>
          );
        })
      )}
    </div>
  );
}
