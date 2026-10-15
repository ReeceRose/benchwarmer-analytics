import { Fragment } from "react";
import { Table, TableBody, TableRow } from "@/components/ui/table";
import { StandingsRow } from "@/components/standings/StandingsRow";
import { StandingsTableHead } from "@/components/standings/StandingsTableHead";
import { getPlayoffStatus, getPlayoffCutoffIndex } from "@/lib/playoff";
import type { StandingsWithAnalytics, StandingsGrouping } from "@/types";

interface DivisionGroupProps {
  title?: string;
  teams: StandingsWithAnalytics[];
  analyticsLoading?: boolean;
  season?: number;
  grouping?: StandingsGrouping;
}

export function DivisionGroup({
  title,
  teams,
  analyticsLoading,
  season,
  grouping = "division",
}: DivisionGroupProps) {
  const playoffCutoffIndex = getPlayoffCutoffIndex(teams, grouping);

  return (
    <section className="space-y-2">
      {title && <h3 className="text-base font-semibold">{title}</h3>}
      <div className="overflow-hidden rounded-2xl border bg-card">
        <Table className="table-fixed">
          <StandingsTableHead />
          <TableBody>
            {teams.map((team, index) => {
              const position = index + 1;
              // Division view shows divisionRank; other views show list position.
              const displayRank = grouping === "division" ? team.divisionRank : position;
              return (
                <Fragment key={team.abbreviation}>
                  {index === playoffCutoffIndex && (
                    <TableRow className="h-0 hover:bg-transparent">
                      <td colSpan={100} className="border-b-0! p-0">
                        <div className="relative z-20 -mt-px border-t-2 border-dashed border-primary/40 bg-card" />
                      </td>
                    </TableRow>
                  )}
                  <StandingsRow
                    team={team}
                    analyticsLoading={analyticsLoading}
                    season={season}
                    playoffStatus={getPlayoffStatus(team, grouping, position)}
                    displayRank={displayRank}
                  />
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
