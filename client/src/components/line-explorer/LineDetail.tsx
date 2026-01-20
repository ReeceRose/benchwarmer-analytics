import { TableCell, TableRow } from "@/components/ui/table";
import { formatToi } from "@/lib/formatters";
import type { LineCombination } from "@/types";

interface LineDetailProps {
  line: LineCombination;
}

export function LineDetail({ line }: LineDetailProps) {
  // Calculate derived stats
  const goalDiff = line.goalsFor - line.goalsAgainst;
  const toiPerGame = line.gamesPlayed > 0 ? line.iceTimeSeconds / line.gamesPlayed : 0;
  const gfPer60 = line.iceTimeSeconds > 0 ? (line.goalsFor / line.iceTimeSeconds) * 3600 : 0;
  const gaPer60 = line.iceTimeSeconds > 0 ? (line.goalsAgainst / line.iceTimeSeconds) * 3600 : 0;

  return (
    <TableRow className="bg-muted/30 hover:bg-muted/40">
      <TableCell colSpan={8}>
        <div className="py-2 px-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 text-sm">
            <StatItem label="Goal Diff" value={goalDiff > 0 ? `+${goalDiff}` : goalDiff.toString()} />
            <StatItem label="TOI/GP" value={formatToi(Math.round(toiPerGame))} />
            <StatItem label="GF/60" value={gfPer60.toFixed(2)} />
            <StatItem label="GA/60" value={gaPer60.toFixed(2)} />
            <StatItem label="Situation" value={formatSituation(line.situation)} />
            <StatItem label="Season" value={`${line.season}-${(line.season + 1).toString().slice(-2)}`} />
          </div>
        </div>
      </TableCell>
    </TableRow>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-muted-foreground text-xs">{label}</span>
      <p className="font-medium tabular-nums">{value}</p>
    </div>
  );
}

function formatSituation(situation: string): string {
  const map: Record<string, string> = {
    all: "All Situations",
    "5on5": "5v5",
    "5on4": "5v4 (PP)",
    "4on5": "4v5 (PK)",
    "5on3": "5v3 (PP)",
    "3on5": "3v5 (PK)",
    "4on4": "4v4",
    "3on3": "3v3",
    other: "Other",
  };
  return map[situation] || situation;
}
