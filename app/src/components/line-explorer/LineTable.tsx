import { useState, Fragment } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SortableTableHeader } from "@/components/shared";
import { LineRow } from "@/components/line-explorer/LineRow";
import { LineDetail } from "@/components/line-explorer/LineDetail";
import type { LineCombination, LineSortField, SortDirection } from "@/types";

interface LineTableProps {
  lines: LineCombination[];
  teamAvgXgPct?: number;
  teamAvgCfPct?: number;
  sortBy: LineSortField;
  sortDir: SortDirection;
  onSort: (key: LineSortField) => void;
}

export function LineTable({
  lines,
  teamAvgXgPct,
  teamAvgCfPct,
  sortBy,
  sortDir,
  onSort,
}: LineTableProps) {
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const toggleExpanded = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (lines.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground border rounded-md">
        <p className="font-medium">No line combinations found</p>
        <p className="text-sm mt-1">
          Try adjusting the filters or selecting a different season.
        </p>
      </div>
    );
  }

  const sortDesc = sortDir === "desc";

  return (
    <Card className="py-0 gap-0">
      <CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="min-w-70">Players</TableHead>
              <SortableTableHeader
                label="GP"
                tooltip="Games played together"
                sortKey="gp"
                currentSort={sortBy}
                sortDesc={sortDesc}
                onSort={onSort}
                className="w-16"
              />
              <SortableTableHeader
                label="TOI"
                tooltip="Total time on ice together"
                sortKey="toi"
                currentSort={sortBy}
                sortDesc={sortDesc}
                onSort={onSort}
                className="w-20"
              />
              <SortableTableHeader
                label="GF"
                tooltip="Goals for while on ice together"
                sortKey="gf"
                currentSort={sortBy}
                sortDesc={sortDesc}
                onSort={onSort}
                className="w-16"
              />
              <SortableTableHeader
                label="GA"
                tooltip="Goals against while on ice together"
                sortKey="ga"
                currentSort={sortBy}
                sortDesc={sortDesc}
                onSort={onSort}
                lowerIsBetter
                className="w-16"
              />
              <SortableTableHeader
                label="xG%"
                tooltip="Expected goals percentage — share of expected goals while on ice"
                sortKey="xgpct"
                currentSort={sortBy}
                sortDesc={sortDesc}
                onSort={onSort}
                className="w-20"
              />
              <SortableTableHeader
                label="CF%"
                tooltip="Corsi For % — shot attempt share while on ice together"
                sortKey="cfpct"
                currentSort={sortBy}
                sortDesc={sortDesc}
                onSort={onSort}
                className="w-20"
              />
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((line) => (
              <Fragment key={line.id}>
                <LineRow
                  line={line}
                  isExpanded={expandedIds.has(line.id)}
                  onToggleExpand={() => toggleExpanded(line.id)}
                  teamAvgXgPct={teamAvgXgPct}
                  teamAvgCfPct={teamAvgCfPct}
                />
                {expandedIds.has(line.id) && <LineDetail line={line} />}
              </Fragment>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
