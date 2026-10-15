import { Panel, Section } from "@/components/layout";
import { InjuryList, InjuryListSkeleton } from "@/components/injuries/InjuryList";
import { TransactionList, TransactionListSkeleton } from "@/components/injuries/TransactionList";
import { useTeamInjuries, useTeamTransactions } from "@/hooks";

/**
 * A team's current injuries and recent transactions, side by side from `lg`.
 * Both come from ESPN, refreshed twice a day.
 */
export function TeamAvailability({ abbrev }: { abbrev: string }) {
  const injuries = useTeamInjuries(abbrev);
  const transactions = useTeamTransactions(abbrev, 25);
  return (
    <div className="grid items-start gap-8 lg:grid-cols-2">
      <Section title="Injuries" description="Players on the injury list, most serious first. Updated twice a day.">
        <Panel>
          {injuries.isLoading ? (
            <InjuryListSkeleton />
          ) : injuries.error ? (
            <p className="text-sm text-muted-foreground">Injuries couldn't be loaded.</p>
          ) : (
            <InjuryList players={injuries.data?.injuries ?? []} team={abbrev} />
          )}
        </Panel>
      </Section>
      <Section title="Recent transactions" description="IR moves, call-ups, trades and signings, newest first.">
        <Panel>
          {transactions.isLoading ? (
            <TransactionListSkeleton />
          ) : transactions.error ? (
            <p className="text-sm text-muted-foreground">Transactions couldn't be loaded.</p>
          ) : (
            <TransactionList transactions={transactions.data?.transactions ?? []} />
          )}
        </Panel>
      </Section>
    </div>
  );
}
