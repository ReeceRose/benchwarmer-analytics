import { SegmentedControl } from "@/components/layout/SegmentedControl";

export type TableOrCharts = "table" | "charts";

/** The Table / Charts switch used by most stats pages. */
export function ViewToggle({
  value,
  onValueChange,
}: {
  value: TableOrCharts;
  onValueChange: (value: TableOrCharts) => void;
}) {
  return (
    <SegmentedControl
      aria-label="View"
      value={value}
      onValueChange={onValueChange}
      options={[
        { value: "table", label: "Table" },
        { value: "charts", label: "Charts" },
      ]}
    />
  );
}
