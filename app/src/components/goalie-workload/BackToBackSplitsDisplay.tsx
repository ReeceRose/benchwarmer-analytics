import { formatSavePct } from "@/lib/formatters";
import type { BackToBackSplits } from "@/types";

interface BackToBackSplitsDisplayProps {
  splits: BackToBackSplits;
}

function Split({
  label,
  games,
  savePct,
  gaa,
  gsax,
}: {
  label: string;
  games: number;
  savePct: number;
  gaa: number;
  gsax: number;
}) {
  return (
    <div className="rounded-xl border px-3.5 py-3">
      <div className="text-xs text-muted-foreground">
        {label} · {games} {games === 1 ? "game" : "games"}
      </div>
      <div className="mt-0.5 font-display text-2xl font-bold tabular-nums">
        {formatSavePct(savePct)}
      </div>
      <div className="text-xs text-muted-foreground tabular-nums">
        {gaa.toFixed(2)} GAA · {gsax > 0 ? "+" : ""}
        {gsax.toFixed(2)} GSAx
      </div>
    </div>
  );
}

export function BackToBackSplitsDisplay({ splits }: BackToBackSplitsDisplayProps) {
  const svPctDrop =
    (splits.nonBackToBackSavePercentage - splits.backToBackSavePercentage) * 100;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-3">
        <Split
          label="Second of a back-to-back"
          games={splits.backToBackGames}
          savePct={splits.backToBackSavePercentage}
          gaa={splits.backToBackGAA}
          gsax={splits.backToBackGSAx}
        />
        <Split
          label="With rest"
          games={splits.nonBackToBackGames}
          savePct={splits.nonBackToBackSavePercentage}
          gaa={splits.nonBackToBackGAA}
          gsax={splits.nonBackToBackGSAx}
        />
      </div>
      {splits.backToBackGames > 0 && splits.nonBackToBackGames > 0 && (
        <p className="text-xs text-muted-foreground">
          {svPctDrop > 0 ? (
            <>
              Save % is{" "}
              <span className="font-medium text-warning">{svPctDrop.toFixed(1)} points lower</span>{" "}
              on back-to-backs.
            </>
          ) : (
            "No drop in save % on back-to-backs."
          )}
        </p>
      )}
    </div>
  );
}
