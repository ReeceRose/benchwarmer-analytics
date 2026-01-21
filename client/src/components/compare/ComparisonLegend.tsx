export function ComparisonLegend() {
  return (
    <div className="flex items-center gap-6 mt-4 text-sm">
      <div className="flex items-center gap-2">
        <span className="w-3 h-3 rounded bg-green-600 dark:bg-green-400" />
        <span className="text-muted-foreground">Best in category</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-3 h-3 rounded bg-red-600 dark:bg-red-400" />
        <span className="text-muted-foreground">Worst in category</span>
      </div>
    </div>
  );
}
