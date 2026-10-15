import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Section } from "@/components/layout";
import { ErrorState, TableSkeleton } from "@/components/shared";
import { useOfficials, usePageTitle } from "@/hooks";
import { formatSeason } from "@/lib/formatters";
import type { Official } from "@/types";

export const Route = createFileRoute("/officials")({
  component: OfficialsPage,
});

function OfficialsTable({ officials }: { officials: Official[] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-xs">
            <th className="w-12 px-3 py-2 text-right font-medium">#</th>
            <th className="px-3 py-2 text-left font-medium">Name</th>
            <th className="px-3 py-2 text-left font-medium">First NHL game</th>
            <th className="px-3 py-2 text-left font-medium">First playoff game</th>
            <th className="px-3 py-2 text-left font-medium">From</th>
          </tr>
        </thead>
        <tbody>
          {officials.map((o) => (
            <tr key={o.id} className="border-b last:border-0">
              <td className="px-3 py-2 text-right font-semibold tabular-nums">{o.sweaterNumber ?? "–"}</td>
              <td className="px-3 py-2 font-medium whitespace-nowrap">{o.name}</td>
              <td className="px-3 py-2 text-muted-foreground">{o.firstSeason ? formatSeason(o.firstSeason) : "–"}</td>
              <td className="px-3 py-2 text-muted-foreground">{o.firstPlayoffSeason ? formatSeason(o.firstPlayoffSeason) : "–"}</td>
              <td className="px-3 py-2 text-muted-foreground">{o.countryCode ?? "–"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OfficialsPage() {
  usePageTitle("Officials");
  const { data, isLoading, error, refetch } = useOfficials();
  const referees = data?.officials.filter((o) => o.type === "Referee") ?? [];
  const linespeople = data?.officials.filter((o) => o.type !== "Referee") ?? [];

  return (
    <div className="container space-y-8 py-8">
      <PageHeader title="Officials" description="This season's NHL referees and linespeople, by sweater number, from NHL records." />
      {error ? (
        <ErrorState title="Couldn't load officials" message="The records request failed." onRetry={() => refetch()} />
      ) : isLoading || !data ? (
        <TableSkeleton rows={12} columns={5} />
      ) : (
        <div className="grid grid-cols-1 items-start gap-8 xl:grid-cols-2">
          <Section title="Referees" description={`${referees.length} active`}>
            <OfficialsTable officials={referees} />
          </Section>
          <Section title="Linespeople" description={`${linespeople.length} active`}>
            <OfficialsTable officials={linespeople} />
          </Section>
        </div>
      )}
    </div>
  );
}
