import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { TeamLogo } from "@/components/team-detail/TeamLogo";
import { usePlayerSearch, useTeams } from "@/hooks";
import { getPlayerHeadshotUrl } from "@/lib/player-headshots";
import { formatPosition } from "@/lib/formatters";
import { getTeamName } from "@/lib/team-names";

// Loaded on demand by GlobalSearch, so cmdk stays out of the main bundle.
export default function GlobalSearchDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="top-[15%] translate-y-0 gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-xl"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">Search</DialogTitle>
        <DialogDescription className="sr-only">
          Find a player or team by name
        </DialogDescription>
        {open && <SearchPanel onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function SearchPanel({ onDone }: { onDone: () => void }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const trimmed = query.trim();
  const { data: playerData, isFetching } = usePlayerSearch(trimmed, 1, 8);
  const { data: teamData } = useTeams();

  const teams = useMemo(() => {
    if (trimmed.length < 2) return [];
    const q = trimmed.toLowerCase();
    return (teamData?.teams ?? [])
      .filter(
        (t) =>
          t.isActive &&
          (getTeamName(t.abbreviation).toLowerCase().includes(q) ||
            t.abbreviation.toLowerCase() === q),
      )
      .slice(0, 4);
  }, [teamData, trimmed]);

  const players = trimmed.length >= 2 ? (playerData?.players ?? []) : [];
  const searching = trimmed.length >= 2 && isFetching && players.length === 0;

  return (
    <Command shouldFilter={false} className="rounded-2xl">
      <CommandInput
        value={query}
        onValueChange={setQuery}
        placeholder="Search players or teams"
        className="h-12"
      />
      <CommandList className="max-h-96">
        {trimmed.length < 2 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">
            Type at least two letters of a name.
          </p>
        ) : searching ? (
          <div className="flex justify-center py-6">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <CommandEmpty>No players or teams match "{trimmed}".</CommandEmpty>
        )}
        {teams.length > 0 && (
          <CommandGroup heading="Teams">
            {teams.map((team) => (
              <CommandItem
                key={team.abbreviation}
                value={`team-${team.abbreviation}`}
                onSelect={() => {
                  navigate({
                    to: "/teams/$abbrev",
                    params: { abbrev: team.abbreviation },
                  });
                  onDone();
                }}
                className="gap-3 rounded-lg py-2"
              >
                <TeamLogo abbrev={team.abbreviation} size="md" />
                <span className="font-medium">{getTeamName(team.abbreviation)}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {team.division}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {players.length > 0 && (
          <CommandGroup heading="Players">
            {players.map((player) => (
              <CommandItem
                key={player.id}
                value={`player-${player.id}`}
                onSelect={() => {
                  navigate({
                    to: "/players/$id",
                    params: { id: String(player.id) },
                  });
                  onDone();
                }}
                className="gap-3 rounded-lg py-2"
              >
                <img
                  src={getPlayerHeadshotUrl(
                    player.id,
                    player.currentTeamAbbreviation,
                  )}
                  alt=""
                  className="size-8 rounded-full bg-muted object-cover"
                />
                <span className="font-medium">{player.name}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {[
                    player.position && formatPosition(player.position),
                    player.currentTeamAbbreviation,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </Command>
  );
}
