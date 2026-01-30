import { useState, useCallback } from "react";

/**
 * Hook for managing chart data point selection on touch devices.
 * Provides tap-to-select behavior with preview before navigation.
 */
export function useChartSelection<T>() {
  const [selectedItem, setSelectedItem] = useState<T | null>(null);

  const handleSelect = useCallback((item: T) => {
    setSelectedItem((prev) => {
      // If same item is selected, clear selection (toggle behavior)
      if (prev && JSON.stringify(prev) === JSON.stringify(item)) {
        return null;
      }
      return item;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedItem(null);
  }, []);

  return {
    selectedItem,
    handleSelect,
    clearSelection,
    isSelected: (item: T) =>
      selectedItem !== null &&
      JSON.stringify(selectedItem) === JSON.stringify(item),
  };
}
