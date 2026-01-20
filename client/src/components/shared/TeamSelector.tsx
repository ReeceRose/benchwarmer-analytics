import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTeams } from "@/hooks";
import { Skeleton } from "@/components/ui/skeleton";

interface TeamSelectorProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function TeamSelector({
  value,
  onValueChange,
  placeholder = "Select team",
  disabled = false,
}: TeamSelectorProps) {
  const { data, isLoading } = useTeams();

  if (isLoading) {
    return <Skeleton className="h-9 w-45" />;
  }

  const teams = data?.teams ?? [];

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className="w-45">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {teams.map((team) => (
          <SelectItem key={team.abbreviation} value={team.abbreviation}>
            {team.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
