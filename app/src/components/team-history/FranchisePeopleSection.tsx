import { useState, type ReactNode } from "react";
import { Panel, Section } from "@/components/layout";
import { Button } from "@/components/ui/button";
import type { FranchisePeople, FranchisePerson } from "@/types";

const SHOWN = 8;

function PeopleList<T extends FranchisePerson>({ title, people, extra }: { title: string; people: T[]; extra?: (p: T) => ReactNode }) {
  const [showAll, setShowAll] = useState(false);
  if (people.length === 0) return null;
  const rows = showAll ? people : people.slice(0, SHOWN);
  return (
    <Panel>
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      <ol className="space-y-2 text-sm">
        {rows.map((p, i) => (
          <li key={`${p.name}-${i}`}>
            <div>
              <span className={i === 0 ? "font-medium" : undefined}>{p.name}</span>
              {extra?.(p)}
            </div>
            <div className="text-xs text-muted-foreground tabular-nums">{p.tenure ?? "–"}</div>
          </li>
        ))}
      </ol>
      {people.length > SHOWN && (
        <Button variant="ghost" size="sm" className="mt-2 -ml-3" onClick={() => setShowAll((v) => !v)}>
          {showAll ? "Show fewer" : `Show all ${people.length}`}
        </Button>
      )}
    </Panel>
  );
}

/** Captains, head coaches and general managers (newest first) and retired numbers. */
export function FranchisePeopleSection({ people }: { people: FranchisePeople }) {
  const { captains, coaches, generalManagers, retiredNumbers } = people;
  if (captains.length + coaches.length + generalManagers.length + retiredNumbers.length === 0) return null;
  return (
    <Section title="People" description="Captains, head coaches and general managers, newest first, and the franchise's retired numbers.">
      <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 xl:grid-cols-4">
        {retiredNumbers.length > 0 && (
          <Panel>
            <h3 className="mb-3 text-sm font-semibold">Retired numbers</h3>
            <ol className="space-y-2 text-sm">
              {retiredNumbers.map((r) => (
                <li key={`${r.number}-${r.name}`} className="flex items-baseline gap-3">
                  <span className="w-8 shrink-0 text-right font-display text-lg leading-none font-bold tabular-nums">{r.number ?? "–"}</span>
                  <span className="min-w-0 flex-1">{r.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{r.tenure}</span>
                </li>
              ))}
            </ol>
          </Panel>
        )}
        <PeopleList title="Captains" people={captains} />
        <PeopleList
          title="Head coaches"
          people={coaches}
          extra={(c) => (
            <>
              {c.stanleyCups ? (
                <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[11px] font-semibold" title="Stanley Cups won as a head coach, with any team">
                  {c.stanleyCups} {c.stanleyCups === 1 ? "Cup" : "Cups"}
                </span>
              ) : null}
              {c.inHallOfFame && (
                <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[11px] font-semibold uppercase" title="Hockey Hall of Fame">
                  HHOF
                </span>
              )}
            </>
          )}
        />
        <PeopleList title="General managers" people={generalManagers} />
      </div>
    </Section>
  );
}
