import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SortableTableHeader, TeamLogo } from "@/components/shared";
import type { TeamSpecialTeamsRanking } from "@/types";

type SortField =
  | "penaltiesDrawn"
  | "penaltiesTaken"
  | "netPenalties"
  | "penaltiesDrawnPer60"
  | "penaltiesTakenPer60"
  | "netPenaltiesPer60"
  | "pimTaken"
  | "ppMinutesPerGame"
  | "pkMinutesPerGame"
  | "ppGoalsPer60"
  | "pkGoalsAgainstPer60";

// Fields where fewer is better sort ascending first.
const LOWER_IS_BETTER = new Set<SortField>([
  "penaltiesTaken",
  "penaltiesTakenPer60",
  "pimTaken",
  "pkMinutesPerGame",
  "pkGoalsAgainstPer60",
]);

const COLUMNS: { field: SortField; label: string; tooltip: string; format: (t: TeamSpecialTeamsRanking) => string }[] = [
  { field: "penaltiesDrawn", label: "Drawn", tooltip: "Penalties drawn (taken by opponents)", format: (t) => String(t.penaltiesDrawn) },
  { field: "penaltiesTaken", label: "Taken", tooltip: "Penalties taken", format: (t) => String(t.penaltiesTaken) },
  { field: "netPenalties", label: "Net", tooltip: "Drawn minus taken", format: (t) => signed(t.netPenalties, 0) },
  { field: "penaltiesDrawnPer60", label: "Drawn/60", tooltip: "Penalties drawn per 60 minutes, all situations", format: (t) => t.penaltiesDrawnPer60.toFixed(2) },
  { field: "penaltiesTakenPer60", label: "Taken/60", tooltip: "Penalties taken per 60 minutes, all situations", format: (t) => t.penaltiesTakenPer60.toFixed(2) },
  { field: "netPenaltiesPer60", label: "Net/60", tooltip: "Drawn minus taken, per 60 minutes", format: (t) => signed(t.netPenaltiesPer60, 2) },
  { field: "pimTaken", label: "PIM", tooltip: "Penalty minutes taken", format: (t) => String(t.pimTaken) },
  { field: "ppMinutesPerGame", label: "PP min/GP", tooltip: "Minutes per game at 5-on-4", format: (t) => t.ppMinutesPerGame.toFixed(2) },
  { field: "pkMinutesPerGame", label: "PK min/GP", tooltip: "Minutes per game at 4-on-5", format: (t) => t.pkMinutesPerGame.toFixed(2) },
  { field: "ppGoalsPer60", label: "PP GF/60", tooltip: "Goals per 60 minutes at 5-on-4", format: (t) => t.ppGoalsPer60.toFixed(2) },
  { field: "pkGoalsAgainstPer60", label: "PK GA/60", tooltip: "Goals against per 60 minutes at 4-on-5", format: (t) => t.pkGoalsAgainstPer60.toFixed(2) },
];

function signed(v: number, digits: number) {
  return `${v > 0 ? "+" : ""}${v.toFixed(digits)}`;
}

interface TeamPenaltiesTableProps {
  teams: TeamSpecialTeamsRanking[];
  season?: number;
}

/** Penalties drawn and taken, and the special-teams time they produce, for every team. */
export function TeamPenaltiesTable({ teams, season }: TeamPenaltiesTableProps) {
  const [sortField, setSortField] = useState<SortField>("netPenaltiesPer60");
  const [sortDesc, setSortDesc] = useState(true);

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDesc(!sortDesc);
    } else {
      setSortField(field);
      setSortDesc(!LOWER_IS_BETTER.has(field));
    }
  };

  const sorted = [...teams].sort((a, b) =>
    sortDesc ? b[sortField] - a[sortField] : a[sortField] - b[sortField],
  );

  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">#</TableHead>
            <TableHead className="sticky left-0 z-10 bg-card">Team</TableHead>
            <TableHead className="text-right">GP</TableHead>
            {COLUMNS.map((col) => (
              <SortableTableHeader
                key={col.field}
                label={col.label}
                tooltip={col.tooltip}
                sortKey={col.field}
                currentSort={sortField}
                sortDesc={sortDesc}
                onSort={handleSort}
                lowerIsBetter={LOWER_IS_BETTER.has(col.field)}
              />
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((team, index) => (
            <TableRow key={team.teamAbbreviation}>
              <TableCell className="text-muted-foreground">{index + 1}</TableCell>
              <TableCell className="sticky left-0 z-10 bg-card">
                <Link
                  to="/teams/$abbrev/special-teams"
                  params={{ abbrev: team.teamAbbreviation }}
                  search={season ? { season } : undefined}
                  className="flex items-center gap-3 transition-colors hover:text-link"
                >
                  <TeamLogo abbrev={team.teamAbbreviation} size="sm" />
                  <span className="font-medium whitespace-nowrap">{team.teamName}</span>
                </Link>
              </TableCell>
              <TableCell className="text-right text-muted-foreground">{team.gamesPlayed}</TableCell>
              {COLUMNS.map((col) => (
                <TableCell
                  key={col.field}
                  className={col.field === sortField ? "text-right font-semibold" : "text-right"}
                >
                  {col.format(team)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
