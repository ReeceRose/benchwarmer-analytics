import { useState, useMemo, useCallback } from "react";

interface UseSortableTableOptions<T, K extends string> {
  data: T[];
  defaultSortKey: K;
  defaultSortDesc?: boolean;
  getValue: (item: T, key: K) => number | null | undefined;
}

interface UseSortableTableResult<T, K extends string> {
  sortedData: T[];
  sortKey: K;
  sortDesc: boolean;
  handleSort: (key: K) => void;
}

/**
 * Generic hook for client-side table sorting.
 *
 * @param options.data - Array of items to sort
 * @param options.defaultSortKey - Initial sort key
 * @param options.defaultSortDesc - Initial sort direction (default: true)
 * @param options.getValue - Function to extract sortable value from an item
 * @returns Sorted data and sort controls
 */
export function useSortableTable<T, K extends string>({
  data,
  defaultSortKey,
  defaultSortDesc = true,
  getValue,
}: UseSortableTableOptions<T, K>): UseSortableTableResult<T, K> {
  const [sortKey, setSortKey] = useState<K>(defaultSortKey);
  const [sortDesc, setSortDesc] = useState(defaultSortDesc);

  const handleSort = useCallback(
    (key: K) => {
      if (sortKey === key) {
        setSortDesc((prev) => !prev);
      } else {
        setSortKey(key);
        setSortDesc(true);
      }
    },
    [sortKey]
  );

  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      const aVal = getValue(a, sortKey) ?? 0;
      const bVal = getValue(b, sortKey) ?? 0;
      return sortDesc ? bVal - aVal : aVal - bVal;
    });
  }, [data, sortKey, sortDesc, getValue]);

  return {
    sortedData,
    sortKey,
    sortDesc,
    handleSort,
  };
}
