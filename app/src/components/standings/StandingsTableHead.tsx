import { TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { HeaderWithTooltip } from "@/components/shared";

function GroupHead({
  span,
  children,
}: {
  span: number;
  children: React.ReactNode;
}) {
  return (
    <TableHead
      colSpan={span}
      className="h-8 border-l text-center text-[11px] font-semibold text-foreground/80"
    >
      {children}
    </TableHead>
  );
}

// Column widths in rem, in column order. table-fixed takes widths from the
// first header row, which here is the group row, so they live in a colgroup.
const COLUMN_WIDTHS = [
  3.5, 14, 2.75, 2.5, 2.5, 2.5, 2.75, 3.25, 2.75, 2.75, 3, 4, 4, 3.5, 3, 3, 3,
  3, 3, 3.25, 3.25, 3.25, 3, 3, 3.25, 3,
];

/** Two-row header shared by every standings grouping. */
export function StandingsTableHead() {
  return (
    <>
      <colgroup>
        {COLUMN_WIDTHS.map((w, i) => (
          <col key={i} style={{ width: `${w}rem` }} />
        ))}
      </colgroup>
      <TableHeader>
        <TableRow className="hover:bg-transparent [&>th]:border-b-0">
          <TableHead colSpan={2} className="sticky left-0 z-10 bg-card" />
          <GroupHead span={6}>Record</GroupHead>
          <GroupHead span={3}>Goals</GroupHead>
          <GroupHead span={4}>Splits</GroupHead>
          <GroupHead span={11}>Underlying numbers</GroupHead>
        </TableRow>
        <TableRow>
          <TableHead className="sticky left-0 z-10 w-16 bg-card">#</TableHead>
          <TableHead className="sticky left-14 z-10 w-48 bg-card">Team</TableHead>
          <HeaderWithTooltip
            label="GP"
            tooltip="Games played"
            className="border-l text-right w-11"
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
            className="border-l text-right w-11"
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
            className="border-l text-right w-16"
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
            className="border-l text-right w-12"
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
    </>
  );
}
