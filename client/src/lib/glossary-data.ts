export interface MetricDefinition {
  name: string;
  abbreviation?: string;
  category: "basic" | "possession" | "expected" | "shooting" | "context";
  description: string;
  formula?: string;
  interpretation?: string;
}

export const metrics: MetricDefinition[] = [
  // Basic Stats
  {
    name: "Goals",
    abbreviation: "G",
    category: "basic",
    description: "The number of goals scored by a player.",
  },
  {
    name: "Primary Assists",
    abbreviation: "A1",
    category: "basic",
    description:
      "Assists credited to the player who made the final pass before the goal. Primary assists are more predictive of future scoring than secondary assists.",
  },
  {
    name: "Secondary Assists",
    abbreviation: "A2",
    category: "basic",
    description:
      "Assists credited to the player who passed to the primary assister. These are less directly tied to the goal-scoring play.",
  },
  {
    name: "Points",
    abbreviation: "P",
    category: "basic",
    description: "The sum of goals and assists.",
    formula: "Goals + Assists",
  },
  {
    name: "Shots on Goal",
    abbreviation: "SOG",
    category: "basic",
    description:
      "Shots that would have gone in the net if not stopped by the goalie. Does not include missed or blocked shots.",
  },
  {
    name: "Time on Ice",
    abbreviation: "TOI",
    category: "basic",
    description:
      "Total time a player spends on the ice during a game or season. Often used to normalize other statistics.",
  },

  // Possession Metrics
  {
    name: "Corsi",
    abbreviation: "CF / CA",
    category: "possession",
    description:
      "All shot attempts (goals, shots on goal, missed shots, and blocked shots) while a player is on the ice. Named after former NHL goalie coach Jim Corsi.",
    interpretation:
      "Higher Corsi For (CF) suggests the team is generating more offensive opportunities. Corsi is the broadest measure of puck possession.",
  },
  {
    name: "Corsi For Percentage",
    abbreviation: "CF%",
    category: "possession",
    description:
      "The percentage of total shot attempts that are for a player's team while they are on the ice.",
    formula: "CF / (CF + CA) × 100",
    interpretation:
      "Above 50% means the team generates more shot attempts than it allows when this player is on the ice. Elite players typically have CF% above 55%.",
  },
  {
    name: "Fenwick",
    abbreviation: "FF / FA",
    category: "possession",
    description:
      "Unblocked shot attempts (goals, shots on goal, and missed shots). Excludes blocked shots since blocking is somewhat random.",
    interpretation:
      "A slightly refined version of Corsi that removes blocked shots, which can be influenced by shot-blocking systems or random variance.",
  },
  {
    name: "Fenwick For Percentage",
    abbreviation: "FF%",
    category: "possession",
    description:
      "The percentage of unblocked shot attempts that are for a player's team.",
    formula: "FF / (FF + FA) × 100",
    interpretation:
      "Similar to CF%, but focuses on unblocked attempts. Often used alongside CF% to get a fuller picture of possession.",
  },

  // Expected Goals
  {
    name: "Expected Goals",
    abbreviation: "xG",
    category: "expected",
    description:
      "A probability model that estimates the likelihood of a shot becoming a goal based on factors like shot location, shot type, whether it was a rebound, rush, or one-timer, and game situation.",
    interpretation:
      "xG values range from 0 to 1 for each shot. A shot from the slot might be worth 0.15 xG (15% chance of scoring), while a shot from the point might only be 0.02 xG.",
  },
  {
    name: "Expected Goals For Percentage",
    abbreviation: "xGF%",
    category: "expected",
    description:
      "The percentage of expected goals that are for a player's team while they are on the ice.",
    formula: "xGF / (xGF + xGA) × 100",
    interpretation:
      "The most comprehensive single metric for evaluating a player's two-way impact. Above 50% is positive, above 55% is excellent.",
  },
  {
    name: "Expected Goals Per 60",
    abbreviation: "xG/60",
    category: "expected",
    description:
      "Expected goals normalized to per-60-minutes of ice time, allowing fair comparison between players with different ice time.",
    formula: "(xG / TOI) × 60",
    interpretation:
      "Useful for comparing players who play different amounts. A first-line forward and fourth-line forward can be compared on equal footing.",
  },
  {
    name: "Goals Above Expected",
    abbreviation: "G-xG",
    category: "expected",
    description:
      "The difference between actual goals and expected goals. Positive values indicate the player (or their team) is outperforming shot quality.",
    formula: "Goals - Expected Goals",
    interpretation:
      "Can indicate shooting skill, finishing ability, or luck. Over small samples, this is often variance. Over large samples, it may reflect true skill.",
  },

  // Shooting Quality
  {
    name: "High Danger Chances",
    abbreviation: "HD",
    category: "shooting",
    description:
      "Shots taken from the most dangerous areas of the ice, primarily the slot and crease area. These shots typically have xG values above 0.10.",
    interpretation:
      "Teams that generate more high-danger chances tend to score more goals. This metric filters out low-value shots from the point.",
  },
  {
    name: "Medium Danger Chances",
    abbreviation: "MD",
    category: "shooting",
    description:
      "Shots from areas between high and low danger zones, such as the top of the circles or the lower parts of the slot.",
  },
  {
    name: "Low Danger Chances",
    abbreviation: "LD",
    category: "shooting",
    description:
      "Shots from low-probability areas like the point or along the boards. These rarely result in goals without deflections or screens.",
  },
  {
    name: "Shooting Percentage",
    abbreviation: "SH%",
    category: "shooting",
    description:
      "The percentage of a player's shots on goal that result in goals.",
    formula: "Goals / Shots on Goal × 100",
    interpretation:
      "League average is typically around 9-10%. Very high or low shooting percentages often regress toward the mean over time.",
  },
  {
    name: "On-Ice Shooting Percentage",
    abbreviation: "oiSH%",
    category: "shooting",
    description:
      "The team's shooting percentage while this player is on the ice.",
    interpretation:
      "A measure that includes teammates' shooting. High values may indicate good linemates or positive shooting luck.",
  },
  {
    name: "On-Ice Save Percentage",
    abbreviation: "oiSV%",
    category: "shooting",
    description: "The goalie's save percentage while this player is on the ice.",
    interpretation:
      "Heavily influenced by goaltending quality. Extreme values in either direction are often not sustainable.",
  },

  // Game Context
  {
    name: "5v5 / Even Strength",
    abbreviation: "5v5",
    category: "context",
    description:
      "Statistics collected when both teams have five skaters on the ice. The most common game state and typically the most predictive of team quality.",
    interpretation:
      "5v5 stats remove the noise of special teams and provide the clearest picture of a player's typical impact.",
  },
  {
    name: "Power Play",
    abbreviation: "PP / 5v4",
    category: "context",
    description:
      "Statistics collected when a player's team has a one-man advantage due to an opponent penalty.",
    interpretation:
      "PP stats are useful for evaluating offensive skill but should be considered separately from even-strength performance.",
  },
  {
    name: "Penalty Kill",
    abbreviation: "PK / 4v5",
    category: "context",
    description:
      "Statistics collected when a player's team is shorthanded due to a penalty.",
    interpretation:
      "PK specialists often have poor raw numbers due to playing in disadvantaged situations. Context is critical.",
  },
  {
    name: "Score-Adjusted",
    category: "context",
    description:
      "Statistics adjusted for game score. Teams trailing tend to generate more shots (desperation offense), while leading teams generate fewer (protecting leads).",
    interpretation:
      "Removes the bias caused by game state. Especially important for players on teams that are often ahead or behind.",
  },
];

export const categoryInfo = {
  basic: {
    label: "Basic Stats",
    description: "Traditional counting statistics that form the foundation of hockey analysis.",
  },
  possession: {
    label: "Possession",
    description:
      "Metrics that measure which team controls the puck more, based on shot attempts.",
  },
  expected: {
    label: "Expected Goals",
    description:
      "Probability-based metrics that weight shots by their likelihood of becoming goals.",
  },
  shooting: {
    label: "Shooting Quality",
    description: "Metrics that evaluate the quality and location of shots.",
  },
  context: {
    label: "Game Context",
    description: "Situational modifiers that affect how statistics should be interpreted.",
  },
};

export const categoryOrder: Array<keyof typeof categoryInfo> = [
  "basic",
  "possession",
  "expected",
  "shooting",
  "context",
];
