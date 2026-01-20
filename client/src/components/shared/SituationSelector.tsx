import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Situation } from "@/types";

const SITUATIONS: { value: Situation; label: string }[] = [
  { value: "all", label: "All Situations" },
  { value: "5on5", label: "5v5" },
  { value: "5on4", label: "5v4 (PP)" },
  { value: "4on5", label: "4v5 (PK)" },
  { value: "5on3", label: "5v3 (PP)" },
  { value: "3on5", label: "3v5 (PK)" },
  { value: "4on4", label: "4v4" },
  { value: "3on3", label: "3v3" },
  { value: "other", label: "Other" },
];

interface SituationSelectorProps {
  value?: Situation;
  onValueChange: (value: Situation) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Show only common situations (all, 5v5, PP, PK) */
  compact?: boolean;
}

export function SituationSelector({
  value = "all",
  onValueChange,
  placeholder = "Select situation",
  disabled = false,
  compact = false,
}: SituationSelectorProps) {
  const options = compact
    ? SITUATIONS.filter((s) =>
        ["all", "5on5", "5on4", "4on5"].includes(s.value)
      )
    : SITUATIONS;

  return (
    <Select
      value={value}
      onValueChange={(v) => onValueChange(v as Situation)}
      disabled={disabled}
    >
      <SelectTrigger className="w-35">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((situation) => (
          <SelectItem key={situation.value} value={situation.value}>
            {situation.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
