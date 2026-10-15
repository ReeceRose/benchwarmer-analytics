import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { Panel } from "@/components/layout";
import {
  SMALL_SAMPLE_SHARE,
  lastName,
  pairKey,
} from "@/components/chemistry/chemistry-utils";
import { STATUS_COLOURS } from "@/lib/chart-colours";
import { formatIceTimeLong } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { ChemistryPair } from "@/types";

// The bar scale: 50% in the middle, clamped to ±20 points.
const SPREAD = 20;

function PairRow({
  pair,
  selected,
  onSelect,
}: {
  pair: ChemistryPair;
  selected: boolean;
  onSelect: (pair: ChemistryPair) => void;
}) {
  const xg = pair.expectedGoalsPct ?? 50;
  const offset = Math.max(-SPREAD, Math.min(SPREAD, xg - 50));
  const width = `${(Math.abs(offset) / SPREAD) * 50}%`;
  return (
    <div
      className={cn(
        "-mx-2 grid grid-cols-[minmax(0,1fr)_6rem_3.25rem] items-center gap-3 rounded-xl px-2 py-1.5 transition-colors hover:bg-muted/60 sm:grid-cols-[minmax(0,1fr)_9rem_3.25rem]",
        selected && "bg-muted/60",
      )}
    >
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">
          <Link
            to="/players/$id"
            params={{ id: String(pair.player1Id) }}
            className="hover:text-link"
          >
            {lastName(pair.player1Name)}
          </Link>
          <span className="text-muted-foreground"> & </span>
          <Link
            to="/players/$id"
            params={{ id: String(pair.player2Id) }}
            className="hover:text-link"
          >
            {lastName(pair.player2Name)}
          </Link>
        </div>
        <div className="text-xs text-muted-foreground tabular-nums">
          {formatIceTimeLong(pair.totalIceTimeSeconds)} together ·{" "}
          {pair.gamesPlayed} GP
        </div>
      </div>
      <button
        type="button"
        onClick={() => onSelect(pair)}
        aria-label={`Show ${pair.player1Name} and ${pair.player2Name}`}
        className="relative h-2.5 rounded-full bg-muted"
      >
        <span
          aria-hidden
          className="absolute inset-y-0 left-1/2 w-px bg-muted-foreground/40"
        />
        <span
          aria-hidden
          className={cn(
            "absolute inset-y-0",
            offset >= 0
              ? "left-1/2 rounded-r-full"
              : "right-1/2 rounded-l-full",
          )}
          style={{
            width,
            background:
              offset >= 0 ? STATUS_COLOURS.good : STATUS_COLOURS.bad,
          }}
        />
      </button>
      <span className="text-right text-sm font-semibold tabular-nums">
        {xg.toFixed(1)}%
      </span>
    </div>
  );
}

function PairList({
  title,
  pairs,
  empty,
  selectedKey,
  onSelect,
}: {
  title: string;
  pairs: ChemistryPair[];
  empty: string;
  selectedKey?: string;
  onSelect: (pair: ChemistryPair) => void;
}) {
  return (
    <Panel>
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      {pairs.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <div className="space-y-1">
          {pairs.map((pair) => (
            <PairRow
              key={pairKey(pair.player1Id, pair.player2Id)}
              pair={pair}
              selected={selectedKey === pairKey(pair.player1Id, pair.player2Id)}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </Panel>
  );
}

/** Pairs above and below an even xG share, best and worst first, leaving out small samples. */
export function ChemistryRankedPairs({
  pairs,
  count = 10,
  selectedKey,
  onSelect,
}: {
  pairs: ChemistryPair[];
  count?: number;
  selectedKey?: string;
  onSelect: (pair: ChemistryPair) => void;
}) {
  const { best, worst } = useMemo(() => {
    const maxToi = Math.max(0, ...pairs.map((p) => p.totalIceTimeSeconds));
    const rated = pairs.filter(
      (p) =>
        p.expectedGoalsPct != null &&
        p.totalIceTimeSeconds >= maxToi * SMALL_SAMPLE_SHARE,
    );
    return {
      best: rated
        .filter((p) => p.expectedGoalsPct! >= 50)
        .sort((a, b) => b.expectedGoalsPct! - a.expectedGoalsPct!)
        .slice(0, count),
      worst: rated
        .filter((p) => p.expectedGoalsPct! < 50)
        .sort((a, b) => a.expectedGoalsPct! - b.expectedGoalsPct!)
        .slice(0, count),
    };
  }, [pairs, count]);

  return (
    <div className="space-y-3">
      <div className="grid gap-4 lg:grid-cols-2">
        <PairList
          title="Best pairs"
          pairs={best}
          empty="No pair is above an even share yet"
          selectedKey={selectedKey}
          onSelect={onSelect}
        />
        <PairList
          title="Worst pairs"
          pairs={worst}
          empty="No pair is below an even share yet"
          selectedKey={selectedKey}
          onSelect={onSelect}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Pairs with under a fifth of the busiest pair's time together are left
        out. The bar runs from 30% to 70%, centred on an even share.
      </p>
    </div>
  );
}
