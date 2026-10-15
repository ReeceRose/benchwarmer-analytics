import { Panel, Section } from "@/components/layout";
import { TransactionList } from "@/components/injuries/TransactionList";
import type { Transaction } from "@/types";

/** A player's recent transactions (IR moves, call-ups, trades); hidden when there are none. */
export function PlayerTransactions({ transactions }: { transactions: Transaction[] }) {
  if (transactions.length === 0) return null;
  return (
    <Section title="Transactions" description="Recent moves involving this player, newest first.">
      <Panel>
        <TransactionList transactions={transactions} shown={5} />
      </Panel>
    </Section>
  );
}
