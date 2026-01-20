import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSeasons, useTeamSeasons } from "@/hooks";
import { Skeleton } from "@/components/ui/skeleton";

interface SeasonSelectorProps {
  value?: number;
  onValueChange: (value: number | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  /** If provided, show only seasons for this team */
  teamAbbrev?: string;
}

export function SeasonSelector({
  value,
  onValueChange,
  placeholder = "Select season",
  disabled = false,
  teamAbbrev,
}: SeasonSelectorProps) {
  const globalSeasons = useSeasons();
  const teamSeasons = useTeamSeasons(teamAbbrev ?? "");

  // Use team-specific seasons if teamAbbrev is provided
  const { data, isLoading } = teamAbbrev ? teamSeasons : globalSeasons;

  if (isLoading) {
    return <Skeleton className="h-9 w-35" />;
  }

  const seasons = data?.seasons ?? [];

  return (
    <Select
      value={value?.toString()}
      onValueChange={(v) => onValueChange(Number(v))}
      disabled={disabled}
    >
      <SelectTrigger className="w-35">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {seasons.map((season) => (
          <SelectItem key={season.year} value={season.year.toString()}>
            {season.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
