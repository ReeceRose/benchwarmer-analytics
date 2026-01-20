import { useState, Fragment } from "react";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LineRow } from "@/components/line-explorer/LineRow";
import { LineDetail } from "@/components/line-explorer/LineDetail";
import type { LineCombination } from "@/types";

interface LineTableProps {
  lines: LineCombination[];
  teamAvgXgPct?: number;
  teamAvgCfPct?: number;
}

export function LineTable({ lines, teamAvgXgPct, teamAvgCfPct }: LineTableProps) {
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

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="min-w-70">Players</TableHead>
            <TableHead className="text-right w-16">GP</TableHead>
            <TableHead className="text-right w-20">TOI</TableHead>
            <TableHead className="text-right w-16">GF</TableHead>
            <TableHead className="text-right w-16">GA</TableHead>
            <TableHead className="text-right w-20">xG%</TableHead>
            <TableHead className="text-right w-20">CF%</TableHead>
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
    </div>
  );
}
