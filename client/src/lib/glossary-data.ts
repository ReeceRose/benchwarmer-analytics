export interface MetricDefinition {
  name: string;
  abbreviation?: string;
  category: "basic" | "possession" | "expected" | "shooting" | "context" | "derived";
  description: string;
  formula?: string;
  interpretation?: string;
  /** Alternate keys used in tables/headers (e.g. "xPts", "Pts±") */
  aliases?: string[];
  /** True when this stat is derived/calculated by this app (not a raw field) */
  isCalculated?: boolean;
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
    name: "Points per Game",
    abbreviation: "P/GP",
    aliases: ["PPG"],
    category: "derived",
    isCalculated: true,
    description: "Points normalized by games played.",
    formula: "Points / Games Played",
    interpretation:
      "Useful for comparing players with different games played. More stable over time than raw points early in the season.",
  },
  {
    name: "Goals per 60",
    abbreviation: "G/60",
    category: "derived",
    isCalculated: true,
    description: "Goals normalized to 60 minutes of ice time.",
    formula: "G/60 = (Goals ÷ TOI) × 60  (TOI in minutes)",
    interpretation:
      "A rate stat that lets you compare players with different ice time. More volatile in small samples than per-game.",
  },
  {
    name: "Assists per 60",
    abbreviation: "A/60",
    category: "derived",
    isCalculated: true,
    description: "Assists normalized to 60 minutes of ice time.",
    formula: "A/60 = (Assists ÷ TOI) × 60  (TOI in minutes)",
  },
  {
    name: "Points per 60",
    abbreviation: "P/60",
    category: "derived",
    isCalculated: true,
    description: "Points normalized to 60 minutes of ice time.",
    formula: "P/60 = (Points ÷ TOI) × 60  (TOI in minutes)",
    interpretation:
      "A common all-in rate metric for offensive production. Useful for comparing usage tiers (top line vs depth).",
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
    name: "Expected Goals Against",
    abbreviation: "xGA",
    category: "expected",
    description:
      "Expected goals allowed, based on the shot quality faced. For goalies/teams this aggregates the xG values of shots against.",
    interpretation:
      "Lower is better. Comparing xGA to actual goals against helps estimate how much was goaltending vs shot quality.",
  },
  {
    name: "Expected Goals For Percentage",
    abbreviation: "xGF%",
    aliases: ["xG%"],
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
    formula: "(xG / TOI) × 60  (TOI in minutes)",
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
  {
    name: "Goals Below Expected",
    abbreviation: "xG-G",
    aliases: ["G Diff", "Goals Differential"],
    category: "derived",
    isCalculated: true,
    description:
      "The difference between expected goals and actual goals. Positive values indicate the player has scored fewer goals than expected.",
    formula: "xG - G",
    interpretation:
      "A simple “unlucky finishing” indicator. In the breakout model we use this as a core signal, but it can be variance in small samples.",
  },

  // Derived / calculated metrics (Benchwarmer)
  {
    name: "Goal Differential",
    abbreviation: "Diff",
    aliases: ["GD"],
    category: "derived",
    isCalculated: true,
    description: "Net goals scored minus goals allowed.",
    formula: "Goals For (GF) - Goals Against (GA)",
    interpretation:
      "A simple signal of team strength. More predictive when paired with xG-based metrics.",
  },
  {
    name: "Expected Goal Differential",
    abbreviation: "xG±",
    category: "derived",
    isCalculated: true,
    description: "Net expected goals for minus expected goals against.",
    formula: "xGF - xGA",
    interpretation:
      "Less noisy than goal differential because it weights shot quality and reduces finishing/goalie variance.",
  },
  {
    name: "Goals For per Game",
    abbreviation: "GF/GP",
    category: "derived",
    isCalculated: true,
    description: "Average goals scored per game.",
    formula: "GF / GP",
  },
  {
    name: "Goals Against per Game",
    abbreviation: "GA/GP",
    category: "derived",
    isCalculated: true,
    description: "Average goals allowed per game.",
    formula: "GA / GP",
  },
  {
    name: "Expected Goals For per Game",
    abbreviation: "xGF/GP",
    category: "derived",
    isCalculated: true,
    description: "Average expected goals created per game.",
    formula: "xGF / GP",
  },
  {
    name: "Expected Goals Against per Game",
    abbreviation: "xGA/GP",
    category: "derived",
    isCalculated: true,
    description: "Average expected goals allowed per game.",
    formula: "xGA / GP",
  },
  {
    name: "Points Percentage",
    abbreviation: "Pts%",
    category: "derived",
    isCalculated: true,
    description:
      "A team's points as a percentage of the maximum possible points (2 per game).",
    formula: "Points / (GP × 2) × 100",
    interpretation:
      "Normalizes standings across teams with different games played. Useful early in the season.",
  },
  {
    name: "Team Shooting Percentage",
    abbreviation: "Sh%",
    aliases: ["Shooting%"],
    category: "derived",
    isCalculated: true,
    description: "Team shooting percentage based on goals and shots on goal.",
    formula: "GF / SOG For × 100",
    interpretation:
      "Often noisy in small samples. Very high or low values frequently regress toward league average.",
  },
  {
    name: "Team Save Percentage",
    abbreviation: "Sv%",
    aliases: ["Save%"],
    category: "derived",
    isCalculated: true,
    description: "Team save percentage based on shots on goal against.",
    formula: "(SOG Against - GA) / SOG Against × 100",
    interpretation:
      "Strongly influenced by goaltending. Extreme team values tend to regress over time.",
  },
  {
    name: "PDO",
    abbreviation: "PDO",
    category: "derived",
    isCalculated: true,
    description:
      "A common 'luck' proxy: team shooting% plus team save% (both on the 0–100 scale).",
    formula: "PDO = Sh% + Sv%",
    interpretation:
      "Values near 100 are typically sustainable. High PDO (>102) suggests overperformance; low PDO (<98) suggests underperformance.",
  },
  {
    name: "Expected Points",
    abbreviation: "xPts",
    category: "derived",
    isCalculated: true,
    description:
      "Expected points based on expected-goals share using a Pythagorean-style expectation.",
    formula:
      "xWin% = xGF² / (xGF² + xGA²);  xPts = round(xWin% × GP × 2)",
    interpretation:
      "A rough expectation of standings points from shot quality. Useful for identifying teams whose results may not match their process.",
  },
  {
    name: "Points vs Expected",
    abbreviation: "Pts±",
    aliases: ["Pts+/-", "PtsDiff"],
    category: "derived",
    isCalculated: true,
    description: "Difference between actual points and expected points.",
    formula: "Pts± = Points - xPts",
    interpretation:
      "Positive values suggest overperformance vs xG; negative values suggest underperformance. Interpreting this alongside PDO is helpful.",
  },
  {
    name: "Percentiles",
    abbreviation: "pctl",
    aliases: ["percentile", "percentiles"],
    category: "derived",
    isCalculated: true,
    description:
      "League percentile thresholds used for player distributions (e.g., P/GP, G/60).",
    formula:
      "Sort values; for each p=1..99: rank=(p/100)×(n−1); linear interpolate between nearest neighbors",
    interpretation:
      "We compute thresholds (not per-player ranks) so charts can show where a given value sits in the league distribution.",
  },

  // Shooting Quality
  {
    name: "High Danger Chances",
    abbreviation: "HD",
    category: "shooting",
    description:
      "Shots with xG > 0.15 (15%+ chance of scoring). Typically from the slot, crease, or high-percentage areas. Categorized by MoneyPuck based on their xG model.",
    interpretation:
      "Teams that generate more high-danger chances tend to score more goals. This metric filters out low-value shots from the point.",
  },
  {
    name: "Shots per 60",
    abbreviation: "Sh/60",
    aliases: ["S/60"],
    category: "derived",
    isCalculated: true,
    description: "Shots on goal normalized to 60 minutes of ice time.",
    formula: "Sh/60 = (Shots ÷ TOI) × 60  (TOI in minutes)",
    interpretation:
      "A proxy for shot volume/shot generation. Higher rates typically correlate with better goal-scoring chances over time.",
  },

  {
    name: "Breakout Score",
    abbreviation: "Breakout Score",
    aliases: ["Score", "BreakoutScore"],
    category: "derived",
    isCalculated: true,
    description:
      "A combined score used to rank breakout candidates. Higher means stronger underlying process with goals lagging expected.",
    formula:
      "BreakoutScore = round( (xG - G) + ((CF% - 50)/10) + ((Sh/60 - 7)/3), 2 )",
    interpretation:
      "This is a lightweight heuristic (not a predictive model). It rewards players with positive xG-goal gaps, above-average possession, and above-average shot volume.",
  },
  {
    name: "Rookie Score",
    abbreviation: "Rookie Score",
    aliases: ["RookieScore"],
    category: "derived",
    isCalculated: true,
    description:
      "A composite score for evaluating first-year players, combining production, underlying metrics, position, and age adjustments.",
    formula:
      "Production = (Points × 2 × PosMult) + ((G - xG) × 1.5 × PosMult); Underlying = ((CF% - 50) / 5) + (Sh/60 / 3); AgeBonus = (22 - Age) × 2; RookieScore = Production + Underlying + AgeBonus",
    interpretation:
      "Defensemen receive a 1.3× multiplier on production metrics since they naturally score less than forwards. Younger rookies (under 22) receive a bonus while older rookies (over 22) receive a penalty, reflecting development potential. An 18-year-old gets +8 points; a 25-year-old gets -6 points.",
  },
  {
    name: "Medium Danger Chances",
    abbreviation: "MD",
    category: "shooting",
    description:
      "Shots with xG between 0.06–0.15 (6–15% chance of scoring). Typically from the top of the circles or lower slot areas. Categorized by MoneyPuck based on their xG model.",
  },
  {
    name: "Low Danger Chances",
    abbreviation: "LD",
    category: "shooting",
    description:
      "Shots with xG < 0.06 (under 6% chance of scoring). Typically from the point, along the boards, or sharp angles. Categorized by MoneyPuck based on their xG model.",
    interpretation:
      "These rarely result in goals without deflections or screens. High volume with low conversion.",
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
    name: "Save Percentage",
    abbreviation: "SV%",
    aliases: ["Sv%"],
    category: "derived",
    isCalculated: true,
    description:
      "The percentage of shots on goal stopped by a goalie or team.",
    formula: "SV% = (Shots Against - Goals Against) / Shots Against × 100",
    interpretation:
      "A key goalie metric. Small swings can be meaningful, but it’s also sensitive to shot quality faced.",
  },
  {
    name: "Goals Against Average",
    abbreviation: "GAA",
    category: "derived",
    isCalculated: true,
    description: "Goals allowed per 60 minutes of ice time (goalies).",
    formula: "GAA = (Goals Against ÷ TOI) × 60  (TOI in minutes)",
    interpretation:
      "Lower is better. Unlike SV%, GAA is heavily influenced by team defense and shot volume/quality.",
  },
  {
    name: "Goals Saved Above Expected",
    abbreviation: "GSAx",
    aliases: ["GSAE"],
    category: "derived",
    isCalculated: true,
    description:
      "How many goals a goalie prevented compared to an average goalie facing the same shot quality.",
    formula: "GSAx = xGA - GA",
    interpretation:
      "Positive is better (saved more than expected). Over small samples, this can be noisy.",
  },
  {
    name: "On-Ice Shooting Percentage",
    abbreviation: "oiSH%",
    category: "shooting",
    description:
      "The team's shooting percentage while this player is on the ice.",
    formula: "On-Ice Goals For / On-Ice Shots on Goal For × 100",
    interpretation:
      "A measure that includes teammates' shooting. High values may indicate good linemates or positive shooting luck.",
  },
  {
    name: "On-Ice Save Percentage",
    abbreviation: "oiSV%",
    category: "shooting",
    description: "The team's save percentage while this player is on the ice.",
    formula: "(On-Ice Shots on Goal Against - On-Ice Goals Against) / On-Ice Shots on Goal Against × 100",
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
    name: "Power Play Percentage",
    abbreviation: "PP%",
    category: "derived",
    isCalculated: true,
    description:
      "Power play scoring rate: goals scored per power play opportunity.",
    formula: "PP% = PP Goals / PP Opportunities × 100",
    interpretation:
      "In some views we estimate opportunities from special-teams TOI (≈ TOI ÷ 120s). This is an approximation when penalty counts aren’t available.",
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
    name: "Penalty Kill Percentage",
    abbreviation: "PK%",
    category: "derived",
    isCalculated: true,
    description:
      "Penalty kill success rate: how often the team prevents a power-play goal.",
    formula: "PK% = (1 - (PP Goals Against / Times Shorthanded)) × 100",
    interpretation:
      "In some views we estimate times shorthanded from special-teams TOI (≈ TOI ÷ 120s). This is an approximation when penalty counts aren't available.",
  },
  {
    name: "Special Teams Percentage",
    abbreviation: "ST%",
    aliases: ["Special Teams%", "SpecialTeamsPct"],
    category: "derived",
    isCalculated: true,
    description:
      "Combined power play and penalty kill percentage, used to rank overall special teams effectiveness.",
    formula: "ST% = PP% + PK%",
    interpretation:
      "A quick gauge of overall special teams strength. Values around 100 are average (e.g., 20% PP + 80% PK). Higher is better.",
  },
  {
    name: "Penalties Drawn",
    abbreviation: "PD",
    aliases: ["Drawn"],
    category: "basic",
    description:
      "The number of penalties a player has drawn against opponents, creating power play opportunities for their team.",
    interpretation:
      "Players who draw penalties provide value beyond their scoring stats by generating extra offensive chances.",
  },
  {
    name: "Penalties Drawn per 60",
    abbreviation: "PD/60",
    aliases: ["DrawnPer60"],
    category: "derived",
    isCalculated: true,
    description:
      "Penalties drawn normalized to 60 minutes of 5v5 ice time.",
    formula: "PD/60 = (Penalties Drawn ÷ TOI) × 60  (TOI in minutes)",
    interpretation:
      "Rate stat for drawing penalties. Higher values indicate players who consistently force opponents into infractions.",
  },
  {
    name: "Penalties Taken",
    abbreviation: "PT",
    aliases: ["Taken", "PIM"],
    category: "basic",
    description:
      "The number of penalties a player has committed, putting their team shorthanded.",
    interpretation:
      "Lower is better. Frequent penalties can hurt a team's chances, especially in close games.",
  },
  {
    name: "Penalties Taken per 60",
    abbreviation: "PT/60",
    aliases: ["TakenPer60"],
    category: "derived",
    isCalculated: true,
    description:
      "Penalties taken normalized to 60 minutes of 5v5 ice time.",
    formula: "PT/60 = (Penalties Taken ÷ TOI) × 60  (TOI in minutes)",
    interpretation:
      "Rate stat for taking penalties. Lower values are preferable; high rates indicate discipline issues.",
  },
  {
    name: "Net Penalties",
    abbreviation: "Net",
    aliases: ["NetPenalties", "Penalty Differential"],
    category: "derived",
    isCalculated: true,
    description:
      "The difference between penalties drawn and penalties taken.",
    formula: "Net = Penalties Drawn - Penalties Taken",
    interpretation:
      "Positive values mean the player draws more penalties than they take, providing net PP opportunities. Negative means the opposite.",
  },
  {
    name: "Net Penalties per 60",
    abbreviation: "Net/60",
    aliases: ["NetPer60", "NetPenaltiesPer60"],
    category: "derived",
    isCalculated: true,
    description:
      "Net penalty differential normalized to 60 minutes of 5v5 ice time.",
    formula: "Net/60 = ((Penalties Drawn - Penalties Taken) ÷ TOI) × 60",
    interpretation:
      "The best single metric for penalty impact. Positive values indicate net power play contributors; negative values indicate net penalty killers.",
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
  derived: {
    label: "Derived (Calculated)",
    description:
      "Metrics computed by Benchwarmer from other fields. Formulas shown for transparency.",
  },
};

export const categoryOrder: Array<keyof typeof categoryInfo> = [
  "basic",
  "possession",
  "expected",
  "shooting",
  "context",
  "derived",
];
