/**
 * Builds the NHL headshot URL for a player based on their current team.
 * Returns a fallback URL if team is not available.
 */
export function getPlayerHeadshotUrl(
  playerId: number,
  teamAbbreviation?: string
): string {
  if (!teamAbbreviation) {
    // Return a generic NHL logo as fallback
    return `https://assets.nhle.com/logos/nhl/svg/NHL_light.svg`;
  }

  // NHL season runs Oct-Jun. Before October, use previous year as season start.
  const now = new Date();
  const seasonYear = now.getMonth() < 9 ? now.getFullYear() - 1 : now.getFullYear();
  const seasonId = `${seasonYear}${seasonYear + 1}`;

  return `https://assets.nhle.com/mugs/nhl/${seasonId}/${teamAbbreviation}/${playerId}.png`;
}

/**
 * Extracts initials from a player name (e.g., "Connor McDavid" -> "CM").
 * Returns up to 2 characters, uppercase.
 */
export function getPlayerInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
