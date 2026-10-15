import { Link } from "@tanstack/react-router";
import { careerLine, careerSpan } from "@/components/draft/draft-format";
import { formatOrdinal } from "@/lib/formatters";
import type { DraftPick } from "@/types";

export function PickName({ pick }: { pick: DraftPick }) {
  return (
    <>
      {pick.hasPlayerPage && pick.playerId ? (
        <Link to="/players/$id" params={{ id: String(pick.playerId) }} className="font-medium hover:text-link">
          {pick.name}
        </Link>
      ) : (
        <span className="font-medium">{pick.name}</span>
      )}
      {pick.inHallOfFame && (
        <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[11px] font-semibold uppercase" title="Hockey Hall of Fame">
          HHOF
        </span>
      )}
    </>
  );
}

/** Stacked pick rows: pick number, player, where they came from, and their NHL career. */
export function DraftPickRows({ picks, showYear = false }: { picks: DraftPick[]; showYear?: boolean }) {
  return (
    <ol className="space-y-1">
      {picks.map((p) => (
        <li key={`${p.draftYear}-${p.overallPick}`} className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-muted/60">
          <span className="w-16 shrink-0 text-xs text-muted-foreground tabular-nums">
            {showYear && <span className="block font-medium text-foreground">{p.draftYear}</span>}
            {formatOrdinal(p.overallPick)} overall
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm">
              <PickName pick={p} />
              {p.position && <span className="ml-1.5 text-xs text-muted-foreground">{p.position}</span>}
            </div>
            <div className="truncate text-xs text-muted-foreground">
              {[p.amateurClub, p.amateurLeague].filter(Boolean).join(", ") || "–"}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className={p.career ? "text-sm font-semibold tabular-nums" : "text-sm text-muted-foreground"}>{careerLine(p)}</div>
            <div className="text-xs text-muted-foreground tabular-nums">{careerSpan(p)}</div>
          </div>
        </li>
      ))}
    </ol>
  );
}
