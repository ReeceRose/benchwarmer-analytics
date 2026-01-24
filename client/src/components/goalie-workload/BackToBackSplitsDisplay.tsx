import { formatSavePct } from "@/lib/formatters";
import type { BackToBackSplits } from "@/types";

interface BackToBackSplitsDisplayProps {
  splits: BackToBackSplits;
}

export function BackToBackSplitsDisplay({
  splits,
}: BackToBackSplitsDisplayProps) {
  const svPctDiff =
    (splits.nonBackToBackSavePercentage - splits.backToBackSavePercentage) *
    100;

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="rounded-lg border p-3">
        <div className="text-xs text-muted-foreground mb-1">
          Back-to-Back ({splits.backToBackGames} games)
        </div>
        <div className="text-lg font-semibold">
          {formatSavePct(splits.backToBackSavePercentage)} SV%
        </div>
        <div className="text-xs text-muted-foreground">
          {splits.backToBackGAA.toFixed(2)} GAA
        </div>
        <div className="text-xs">GSAx: {splits.backToBackGSAx.toFixed(2)}</div>
      </div>
      <div className="rounded-lg border p-3">
        <div className="text-xs text-muted-foreground mb-1">
          With Rest ({splits.nonBackToBackGames} games)
        </div>
        <div className="text-lg font-semibold">
          {formatSavePct(splits.nonBackToBackSavePercentage)} SV%
        </div>
        <div className="text-xs text-muted-foreground">
          {splits.nonBackToBackGAA.toFixed(2)} GAA
        </div>
        <div className="text-xs">
          GSAx: {splits.nonBackToBackGSAx.toFixed(2)}
        </div>
      </div>
      {splits.backToBackGames > 0 && splits.nonBackToBackGames > 0 && (
        <div className="col-span-2 text-xs text-center text-muted-foreground">
          {svPctDiff > 0 ? (
            <span>
              SV% drops by{" "}
              <span className="text-orange-500 font-medium">
                {svPctDiff.toFixed(1)}%
              </span>{" "}
              in back-to-backs
            </span>
          ) : (
            <span className="text-green-500">
              No significant B2B performance drop
            </span>
          )}
        </div>
      )}
    </div>
  );
}
