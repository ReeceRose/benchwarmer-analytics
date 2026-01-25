import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { HeaderWithTooltip } from "@/components/shared";
import { StandingsRow } from "@/components/standings/StandingsRow";
import type { StandingsWithAnalytics } from "@/types";

interface DivisionGroupProps {
  title: string;
  teams: StandingsWithAnalytics[];
  analyticsLoading?: boolean;
}

export function DivisionGroup({
  title,
  teams,
  analyticsLoading,
}: DivisionGroupProps) {
  return (
    <Card className="py-0 gap-0">
      <CardHeader className="py-3 px-4 border-b">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table className="table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">#</TableHead>
              <TableHead className="w-48">Team</TableHead>
              <HeaderWithTooltip
                label="GP"
                tooltip="Games played"
                className="text-right w-11"
              />
              <HeaderWithTooltip
                label="W"
                tooltip="Wins"
                className="text-right w-10"
              />
              <HeaderWithTooltip
                label="L"
                tooltip="Losses"
                className="text-right w-10"
              />
              <HeaderWithTooltip
                label="OT"
                tooltip="Overtime losses"
                className="text-right w-10"
              />
              <HeaderWithTooltip
                label="Pts"
                tooltip="Points (W×2 + OT)"
                className="text-right font-semibold w-11"
              />
              <HeaderWithTooltip
                label="Pts%"
                tooltip="Points percentage"
                metric="Pts%"
                className="text-right w-13"
              />
              <HeaderWithTooltip
                label="GF"
                tooltip="Goals for"
                className="text-right w-11"
              />
              <HeaderWithTooltip
                label="GA"
                tooltip="Goals against"
                className="text-right w-11"
              />
              <HeaderWithTooltip
                label="Diff"
                tooltip="Goal differential"
                metric="Diff"
                className="text-right w-12"
              />
              <HeaderWithTooltip
                label="Home"
                tooltip="Home record"
                className="text-right w-16"
              />
              <HeaderWithTooltip
                label="Away"
                tooltip="Away record"
                className="text-right w-16"
              />
              <HeaderWithTooltip
                label="L10"
                tooltip="Last 10 games"
                className="text-right w-14"
              />
              <HeaderWithTooltip
                label="Strk"
                tooltip="Current streak"
                className="text-right w-12"
              />
              <HeaderWithTooltip
                label="xGF"
                tooltip="Expected goals for"
                className="text-right w-12"
              />
              <HeaderWithTooltip
                label="xGA"
                tooltip="Expected goals against"
                className="text-right w-12"
              />
              <HeaderWithTooltip
                label="xG±"
                tooltip="Expected goal differential"
                metric="xG±"
                className="text-right w-12"
              />
              <HeaderWithTooltip
                label="xPts"
                tooltip="Expected points"
                metric="xPts"
                className="text-right w-12"
              />
              <HeaderWithTooltip
                label="xG%"
                tooltip="Expected goals percentage"
                metric="xG%"
                className="text-right w-13"
              />
              <HeaderWithTooltip
                label="CF%"
                tooltip="Corsi percentage"
                metric="CF%"
                className="text-right w-13"
              />
              <HeaderWithTooltip
                label="FF%"
                tooltip="Fenwick percentage"
                metric="FF%"
                className="text-right w-13"
              />
              <HeaderWithTooltip
                label="Sh%"
                tooltip="Team shooting percentage"
                metric="Sh%"
                className="text-right w-12"
              />
              <HeaderWithTooltip
                label="Sv%"
                tooltip="Team save percentage"
                metric="Sv%"
                className="text-right w-12"
              />
              <HeaderWithTooltip
                label="PDO"
                tooltip="Sh% + Sv% (luck indicator)"
                metric="PDO"
                className="text-right w-13"
              />
              <HeaderWithTooltip
                label="Pts±"
                tooltip="Points vs expected"
                metric="Pts±"
                className="text-right w-12"
              />
            </TableRow>
          </TableHeader>
          <TableBody>
            {teams.map((team) => (
              <StandingsRow
                key={team.abbreviation}
                team={team}
                analyticsLoading={analyticsLoading}
              />
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
