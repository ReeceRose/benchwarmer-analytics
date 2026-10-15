import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { shortDate, TRANSACTION_LABELS } from "@/lib/injuries";
import type { Transaction } from "@/types";

const rowClass = "-mx-2 grid grid-cols-[3.25rem_1fr] gap-3 rounded-xl px-2 py-1.5 text-sm";

function TransactionRow({ t }: { t: Transaction }) {
  const content = (
    <>
      <span className="pt-px text-xs text-muted-foreground tabular-nums">{shortDate(t.date)}</span>
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{TRANSACTION_LABELS[t.kind]}</div>
        <p className="group-hover:text-link">{t.description}</p>
      </div>
    </>
  );
  return (
    <li>
      {t.playerId ? (
        <Link to="/players/$id" params={{ id: String(t.playerId) }} className={`group ${rowClass} hover:bg-muted/60`}>
          {content}
        </Link>
      ) : (
        <div className={rowClass}>{content}</div>
      )}
    </li>
  );
}

/**
 * Transactions newest first: date in a muted column, the kind as a small
 * label over ESPN's text. Rows link to the player the move is about when we
 * know them. Long lists show `shown` rows and a ghost "Show all".
 */
export function TransactionList({
  transactions,
  shown = 8,
  empty = "No recent transactions.",
}: {
  transactions: Transaction[];
  shown?: number;
  empty?: string;
}) {
  const [showAll, setShowAll] = useState(false);
  if (transactions.length === 0) return <p className="text-sm text-muted-foreground">{empty}</p>;
  const rows = showAll ? transactions : transactions.slice(0, shown);
  return (
    <>
      <ol className="space-y-1">
        {rows.map((t, i) => (
          <TransactionRow key={`${t.date}-${i}`} t={t} />
        ))}
      </ol>
      {transactions.length > shown && (
        <Button variant="ghost" size="sm" className="mt-2 -ml-3" onClick={() => setShowAll((v) => !v)}>
          {showAll ? "Show fewer" : `Show all ${transactions.length}`}
        </Button>
      )}
    </>
  );
}

export function TransactionListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-1">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="grid grid-cols-[3.25rem_1fr] gap-3 py-1.5">
          <Skeleton className="h-3 w-10" />
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
