import { Panel, Section } from "@/components/layout";
import { InjuryList, InjuryListSkeleton, TransactionList, TransactionListSkeleton } from "@/components/injuries";
import { useLeagueInjuries, useLeagueTransactions } from "@/hooks";

export const HOME_INJURIES = 8;
export const HOME_TRANSACTIONS = 8;

/**
 * The newest additions to the league's injury list and the latest
 * transactions, side by side from `lg`. Both come from ESPN, refreshed twice
 * a day.
 */
export function InjuryReportSection() {
  const injuries = useLeagueInjuries(HOME_INJURIES);
  const transactions = useLeagueTransactions(HOME_TRANSACTIONS);
  const total = injuries.data?.total;

  return (
    <div className="grid items-start gap-8 lg:grid-cols-2">
      <Section
        title="New injuries"
        description={
          total
            ? `The latest players added to the injury list, of ${total} league-wide. Updated twice a day.`
            : "The latest players added to the injury list. Updated twice a day."
        }
      >
        <Panel>
          {injuries.isLoading ? (
            <InjuryListSkeleton rows={HOME_INJURIES} />
          ) : injuries.error ? (
            <p className="text-sm text-muted-foreground">Injuries couldn't be loaded.</p>
          ) : (
            <InjuryList players={injuries.data?.injuries ?? []} />
          )}
        </Panel>
      </Section>
      <Section title="Recent transactions" description="IR moves, call-ups, trades and signings across the league, newest first.">
        <Panel>
          {transactions.isLoading ? (
            <TransactionListSkeleton rows={HOME_TRANSACTIONS} />
          ) : transactions.error ? (
            <p className="text-sm text-muted-foreground">Transactions couldn't be loaded.</p>
          ) : (
            <TransactionList transactions={transactions.data?.transactions ?? []} shown={HOME_TRANSACTIONS} showTeam />
          )}
        </Panel>
      </Section>
    </div>
  );
}
