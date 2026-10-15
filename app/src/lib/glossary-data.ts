export interface MetricDefinition {
  name: string;
  abbreviation?: string;
  category: "basic" | "possession" | "expected" | "shooting" | "context" | "tracking" | "records" | "derived";
  description: string;
  formula?: string;
  interpretation?: string;
  /** Alternate keys used in tables/headers (e.g. "xPts", "Pts±") */
  aliases?: string[];
  /** True when this stat is derived/calculated by this app (not a raw field) */
  isCalculated?: boolean;
}

export const metrics: MetricDefinition[] = [
  // Basic stats
  {
    name: "Goals",
    abbreviation: "G",
    category: "basic",
    description: "The number of goals scored by a player.",
  },
  {
    name: "Primary assists",
    abbreviation: "A1",
    category: "basic",
    description:
      "Assists credited to the player who made the final pass before the goal. Primary assists are more predictive of future scoring than secondary assists.",
  },
  {
    name: "Secondary assists",
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
    name: "Points per game",
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
    name: "Game Score per game",
    abbreviation: "GS/GP",
    aliases: ["GS", "Game Score"],
    category: "derived",
    isCalculated: true,
    description:
      "Dom Luszczyszyn's Game Score, a single number for a skater's overall contribution, averaged per game. It weights goals, primary and secondary assists, shots, blocks, penalties drawn and taken, faceoffs, and the shot attempts and goals for and against while on the ice. Individual stats count in all situations and on-ice stats at 5v5. Season totals come from MoneyPuck; game pages calculate it from the NHL play-by-play the same way.",
    formula: "0.75 G + 0.7 A1 + 0.55 A2 + 0.075 SOG + 0.05 BLK + 0.15 (PD − PT) + 0.01 (FOW − FOL) + 0.05 (CF − CA) + 0.15 (GF − GA); per game = season total / GP",
    interpretation:
      "The median regular is around 0.4 for forwards and 0.3 for defencemen. About 0.9 is top 10% and 1.3 or more is elite. It rewards scoring heavily, so defensive specialists rate lower than their value.",
  },
  {
    name: "Win probability",
    abbreviation: "Win %",
    category: "derived",
    isCalculated: true,
    description:
      "Each team's chance of winning at any moment of a game, from the score, time left, which team has more skaters and whether a goalie is pulled. It's a logistic model fitted on every regular-season shot since 2008-09 and checked on 2025-26.",
    interpretation:
      "Before puck drop the home team is about 55%. A one-goal lead is worth about 74% halfway through and over 90% with three minutes left. Goals late in a close game move it the most.",
  },
  {
    name: "Playoff odds",
    category: "derived",
    isCalculated: true,
    description:
      "Each team's chance of making the playoffs and of reaching each round, from 20,000 simulations of the rest of the season run every morning. Every remaining game is played out from current standings: the winner is drawn from the pregame win probability, 22% of games go to overtime (a point for the loser), and the playoffs are seeded and played as best-of-seven series.",
    formula: "Pregame win % = logistic(home ice + 0.63 × 5v5 xG gap per game + 0.52 × goal gap per game)",
    interpretation:
      "Team strength blends this season's per-game 5v5 expected goal and goal differentials with half of last season's, which counts as 40 games of evidence, and each simulation draws it with some uncertainty that shrinks as games are played. Tested on 2015-2024, each team's middle-80% points range held its final total 80% of the time.",
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
    name: "Shots on goal",
    abbreviation: "SOG",
    category: "basic",
    description:
      "Shots that would have gone in the net if not stopped by the goalie. Does not include missed or blocked shots.",
  },
  {
    name: "Time on ice",
    abbreviation: "TOI",
    category: "basic",
    description:
      "Total time a player spends on the ice during a game or season. Often used to normalize other statistics.",
  },
  {
    name: "Time on ice per game",
    abbreviation: "TOI/GP",
    aliases: ["ATOI", "Avg TOI"],
    category: "derived",
    isCalculated: true,
    description:
      "Average time on ice per game played. Indicates a player's typical usage and importance to their team.",
    formula: "TOI/GP = Total TOI / Games Played",
    interpretation:
      "Top-line forwards typically average 18-22 minutes; top defensemen 22-26 minutes. Fourth-line players may average 8-12 minutes.",
  },
  {
    name: "Faceoffs won",
    abbreviation: "FOW",
    category: "basic",
    description:
      "The number of faceoffs won by a player. Typically only centers take a significant number of faceoffs.",
  },
  {
    name: "Faceoffs lost",
    abbreviation: "FOL",
    category: "basic",
    description:
      "The number of faceoffs lost by a player.",
  },
  {
    name: "Faceoff win percentage",
    abbreviation: "FO%",
    aliases: ["FOW%", "Faceoff%"],
    category: "derived",
    isCalculated: true,
    description:
      "The percentage of faceoffs won by a player.",
    formula: "FO% = Faceoffs Won / (Faceoffs Won + Faceoffs Lost) × 100",
    interpretation:
      "50% is league average. Elite faceoff specialists win 55%+ of their draws. Winning faceoffs is important for possession, especially in the offensive and defensive zones.",
  },
  {
    name: "Takeaways",
    abbreviation: "TA",
    category: "basic",
    description:
      "The number of times a player takes the puck away from an opponent through stick checks, interceptions, or other defensive plays.",
    interpretation:
      "A measure of active defensive contribution. Players with high takeaways tend to be strong forecheckers or defensively responsible.",
  },
  {
    name: "Giveaways",
    abbreviation: "GA",
    aliases: ["Giveaway"],
    category: "basic",
    description:
      "The number of times a player loses possession of the puck to an opponent through turnovers, errant passes, or failed plays.",
    interpretation:
      "Lower is better. However, high-event players who handle the puck frequently may have more giveaways simply due to volume.",
  },
  {
    name: "Defensive-zone giveaways",
    abbreviation: "DZGA",
    aliases: ["DZoneGiveaways"],
    category: "basic",
    description:
      "Giveaways that occur in the player's defensive zone. These are more dangerous than giveaways in the neutral or offensive zones.",
    interpretation:
      "D-zone giveaways are particularly costly as they can lead directly to scoring chances against. A lower percentage of D-zone giveaways indicates better puck management in dangerous areas.",
  },
  {
    name: "Hits",
    abbreviation: "Hits",
    aliases: ["HIT"],
    category: "basic",
    description:
      "The number of legal body checks delivered by a player or team that separate an opponent from the puck.",
    interpretation:
      "A measure of physical play. Teams with high hit totals tend to play a more aggressive, physical style. However, hits can also indicate chasing the play (you can't hit if you have the puck).",
  },
  {
    name: "Hits against",
    abbreviation: "HitA",
    aliases: ["HitsAgainst"],
    category: "basic",
    description:
      "The number of hits received by a player or team from opponents.",
    interpretation:
      "Lower is generally better as it may indicate better puck possession (harder to hit a team that controls the puck). However, context matters - skilled puck carriers may draw more hits.",
  },
  {
    name: "Blocked shots",
    abbreviation: "Blk",
    aliases: ["BLK", "Blocks", "ShotBlocks"],
    category: "basic",
    description:
      "The number of opponent shot attempts blocked by a player or team before reaching the goalie.",
    interpretation:
      "Can indicate defensive commitment, but context matters. Teams that block many shots may also be defending more often (giving up more shot attempts). For defensemen, blocking shots is an important skill.",
  },
  {
    name: "Penalty differential",
    abbreviation: "Pen±",
    aliases: ["PenDiff", "PenaltyDiff"],
    category: "basic",
    isCalculated: true,
    description:
      "The difference between penalties drawn and penalties taken. Positive values mean a team draws more penalties than it takes.",
    formula: "Pen± = Penalties Drawn - Penalties Taken",
    interpretation:
      "Higher is better. A positive differential means more power play opportunities than penalty kills. Disciplined teams that also draw penalties have a significant special teams advantage.",
  },
  {
    name: "Takeaway/giveaway ratio",
    abbreviation: "TA/GA",
    aliases: ["TakeawayRatio", "Puck Management"],
    category: "derived",
    isCalculated: true,
    description:
      "The ratio of takeaways to giveaways, measuring a player's net impact on puck possession.",
    formula: "TA/GA = Takeaways / Giveaways",
    interpretation:
      "Higher is better. A ratio of 1.0+ (more takeaways than giveaways) is exceptional. Elite puck managers are above 0.5, while ratios below 0.25 indicate poor puck security.",
  },
  {
    name: "Overall rank",
    abbreviation: "OVR",
    aliases: ["OverallRank", "Composite"],
    category: "derived",
    isCalculated: true,
    description:
      "A weighted composite ranking (1-32) combining all statistical categories. Lower rank is better.",
    formula: "Weighted average of all category ranks: High weight (3×) for xG% and Goal Differential; Medium weight (2×) for CF%, FF%, PP%, PK%, Sv%, and High Danger chances; Standard weight (1×) for all other categories.",
    interpretation:
      "Provides a single number summarizing team strength across all metrics. The weighting favors process-driven analytics (expected goals, possession) over results that can be noisy (hits, blocked shots). A team ranked #1 overall is elite across the board.",
  },

  // Possession
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
    name: "Corsi for percentage",
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
    name: "Fenwick for percentage",
    abbreviation: "FF%",
    category: "possession",
    description:
      "The percentage of unblocked shot attempts that are for a player's team.",
    formula: "FF / (FF + FA) × 100",
    interpretation:
      "Similar to CF%, but focuses on unblocked attempts. Often used alongside CF% to get a fuller picture of possession.",
  },

  // Expected goals
  {
    name: "Expected goals",
    abbreviation: "xG",
    category: "expected",
    description:
      "A probability model that estimates the likelihood of a shot becoming a goal based on factors like shot location, shot type, whether it was a rebound, rush, or one-timer, and game situation.",
    interpretation:
      "xG values range from 0 to 1 for each shot. A shot from the slot might be worth 0.15 xG (15% chance of scoring), while a shot from the point might only be 0.02 xG.",
  },
  {
    name: "Expected goals against",
    abbreviation: "xGA",
    category: "expected",
    description:
      "Expected goals allowed, based on the shot quality faced. For goalies/teams this aggregates the xG values of shots against.",
    interpretation:
      "Lower is better. Comparing xGA to actual goals against helps estimate how much was goaltending vs shot quality.",
  },
  {
    name: "Expected rebounds",
    abbreviation: "xReb",
    category: "expected",
    description:
      "The number of rebounds a goalie is expected to allow based on the quality and quantity of shots faced. Calculated by MoneyPuck's model using shot location, type, and game context.",
    interpretation:
      "Used as a baseline to evaluate rebound control. Goalies facing more shots or higher-danger shots will have higher expected rebounds.",
  },
  {
    name: "Expected goals for percentage",
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
    name: "Last 10 games expected goals share",
    abbreviation: "L10 xG%",
    category: "expected",
    description:
      "A team's share of 5-on-5 expected goals over its last 10 regular-season games.",
    formula: "xGF / (xGF + xGA) × 100, 5-on-5, last 10 games",
    interpretation:
      "Shows current form rather than the season as a whole. A team well above its season xG% is playing better lately; well below, worse.",
  },
  {
    name: "Strength of schedule",
    abbreviation: "SOS",
    category: "context",
    description:
      "The average 5-on-5 expected goals share of the opponents a team has played this regular season, using each opponent's season to date.",
    interpretation:
      "Above 50% means a tougher schedule than average. A team with a strong record against a hard schedule is better than its record suggests.",
  },
  {
    name: "Remaining strength of schedule",
    abbreviation: "Rem. SOS",
    category: "context",
    description:
      "The average 5-on-5 expected goals share of the opponents left on a team's regular-season schedule.",
    interpretation:
      "Above 50% means a harder run-in than average. Empty once the regular season is over.",
  },
  {
    name: "Expected goals per 60",
    abbreviation: "xG/60",
    category: "expected",
    description:
      "Expected goals normalized to per-60-minutes of ice time, allowing fair comparison between players with different ice time.",
    formula: "(xG / TOI) × 60  (TOI in minutes)",
    interpretation:
      "Useful for comparing players who play different amounts. A first-line forward and fourth-line forward can be compared on equal footing.",
  },
  {
    name: "Goals above expected",
    abbreviation: "G-xG",
    category: "expected",
    description:
      "The difference between actual goals and expected goals. Positive values indicate the player (or their team) is outperforming shot quality.",
    formula: "Goals - Expected Goals",
    interpretation:
      "Can indicate shooting skill, finishing ability, or luck. Over small samples, this is often variance. Over large samples, it may reflect true skill.",
  },
  {
    name: "Goals below expected",
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
    name: "Goal differential",
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
    name: "Expected goal differential",
    abbreviation: "xG±",
    category: "derived",
    isCalculated: true,
    description: "Net expected goals for minus expected goals against.",
    formula: "xGF - xGA",
    interpretation:
      "Less noisy than goal differential because it weights shot quality and reduces finishing/goalie variance.",
  },
  {
    name: "Goals for per game",
    abbreviation: "GF/GP",
    category: "derived",
    isCalculated: true,
    description: "Average goals scored per game.",
    formula: "GF / GP",
  },
  {
    name: "Goals against per game",
    abbreviation: "GA/GP",
    category: "derived",
    isCalculated: true,
    description: "Average goals allowed per game.",
    formula: "GA / GP",
  },
  {
    name: "Expected goals for per game",
    abbreviation: "xGF/GP",
    category: "derived",
    isCalculated: true,
    description: "Average expected goals created per game.",
    formula: "xGF / GP",
  },
  {
    name: "Expected goals against per game",
    abbreviation: "xGA/GP",
    category: "derived",
    isCalculated: true,
    description: "Average expected goals allowed per game.",
    formula: "xGA / GP",
  },
  {
    name: "Points percentage",
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
    name: "Team shooting percentage",
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
    name: "Team save percentage",
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
    name: "Expected points",
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
    name: "Points vs expected",
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

  // Shooting quality
  {
    name: "High danger chances",
    abbreviation: "HD",
    category: "shooting",
    description:
      "Shots with xG ≥ 0.20 (20%+ chance of scoring). Typically from the slot, crease, or high-percentage areas. Categorized by MoneyPuck based on their xG model.",
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
    name: "Breakout score",
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
    name: "Rookie score",
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
    name: "Medium danger chances",
    abbreviation: "MD",
    category: "shooting",
    description:
      "Shots with xG between 0.08–0.20 (8–20% chance of scoring). Typically from the top of the circles or lower slot areas. Categorized by MoneyPuck based on their xG model.",
  },
  {
    name: "Low danger chances",
    abbreviation: "LD",
    category: "shooting",
    description:
      "Shots with xG < 0.08 (under 8% chance of scoring). Typically from the point, along the boards, or sharp angles. Categorized by MoneyPuck based on their xG model.",
    interpretation:
      "These rarely result in goals without deflections or screens. High volume with low conversion.",
  },
  {
    name: "Shooting percentage",
    abbreviation: "SH%",
    category: "shooting",
    description:
      "The percentage of a player's shots on goal that result in goals.",
    formula: "Goals / Shots on Goal × 100",
    interpretation:
      "League average is typically around 9-10%. Very high or low shooting percentages often regress toward the mean over time.",
  },

  {
    name: "Save percentage",
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
    name: "Goals against average",
    abbreviation: "GAA",
    category: "derived",
    isCalculated: true,
    description: "Goals allowed per 60 minutes of ice time (goalies).",
    formula: "GAA = (Goals Against ÷ TOI) × 60  (TOI in minutes)",
    interpretation:
      "Lower is better. Unlike SV%, GAA is heavily influenced by team defense and shot volume/quality.",
  },
  {
    name: "Goals saved above expected",
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
    name: "Rebound control",
    abbreviation: "Reb",
    aliases: ["Rebound Ratio", "ReboundControl"],
    category: "derived",
    isCalculated: true,
    description:
      "A goalie's ratio of actual rebounds allowed vs expected rebounds based on shot quality faced. Lower values indicate better rebound control.",
    formula: "Rebound Ratio = Actual Rebounds / Expected Rebounds",
    interpretation:
      "League average is approximately 1.58x (goalies allow ~60% more rebounds than expected). Values below 1.58x indicate above-average rebound control; values above indicate below-average. Elite goalies typically have ratios below 1.40x.",
  },
  {
    name: "On-ice shooting percentage",
    abbreviation: "oiSH%",
    category: "shooting",
    description:
      "The team's shooting percentage while this player is on the ice.",
    formula: "On-Ice Goals For / On-Ice Shots on Goal For × 100",
    interpretation:
      "A measure that includes teammates' shooting. High values may indicate good linemates or positive shooting luck.",
  },
  {
    name: "On-ice save percentage",
    abbreviation: "oiSV%",
    category: "shooting",
    description: "The team's save percentage while this player is on the ice.",
    formula: "(On-Ice Shots on Goal Against - On-Ice Goals Against) / On-Ice Shots on Goal Against × 100",
    interpretation:
      "Heavily influenced by goaltending quality. Extreme values in either direction are often not sustainable.",
  },

  // Game context
  {
    name: "5v5 / even strength",
    abbreviation: "5v5",
    category: "context",
    description:
      "Statistics collected when both teams have five skaters on the ice. The most common game state and typically the most predictive of team quality.",
    interpretation:
      "5v5 stats remove the noise of special teams and provide the clearest picture of a player's typical impact.",
  },
  {
    name: "Power play",
    abbreviation: "PP / 5v4",
    category: "context",
    description:
      "Statistics collected when a player's team has a one-man advantage due to an opponent penalty.",
    interpretation:
      "PP stats are useful for evaluating offensive skill but should be considered separately from even-strength performance.",
  },
  {
    name: "Power play percentage",
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
    name: "Penalty kill",
    abbreviation: "PK / 4v5",
    category: "context",
    description:
      "Statistics collected when a player's team is shorthanded due to a penalty.",
    interpretation:
      "PK specialists often have poor raw numbers due to playing in disadvantaged situations. Context is critical.",
  },
  {
    name: "Penalty kill percentage",
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
    name: "Special teams percentage",
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
    name: "Penalties drawn",
    abbreviation: "PD",
    aliases: ["Drawn"],
    category: "basic",
    description:
      "The number of penalties a player has drawn against opponents, creating power play opportunities for their team.",
    interpretation:
      "Players who draw penalties provide value beyond their scoring stats by generating extra offensive chances.",
  },
  {
    name: "Penalties drawn per 60",
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
    name: "Penalties taken",
    abbreviation: "PT",
    aliases: ["Taken", "PIM"],
    category: "basic",
    description:
      "The number of penalties a player has committed, putting their team shorthanded.",
    interpretation:
      "Lower is better. Frequent penalties can hurt a team's chances, especially in close games.",
  },
  {
    name: "Penalties taken per 60",
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
    name: "Net penalties",
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
    name: "Net penalties per 60",
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
    name: "Score-adjusted",
    category: "context",
    description:
      "Statistics adjusted for game score. Teams trailing tend to generate more shots (desperation offense), while leading teams generate fewer (protecting leads).",
    interpretation:
      "Removes the bias caused by game state. Especially important for players on teams that are often ahead or behind.",
  },

  // Player tracking (NHL EDGE)
  {
    name: "NHL EDGE",
    aliases: ["EDGE", "Tracking"],
    category: "tracking",
    description:
      "The NHL's player and puck tracking: sensors in the puck and in every player's sweater record where everyone is through the game. The NHL publishes season summaries for each player and team, which we show on the Tracking tabs and the Tracking leaders page.",
  },
  {
    name: "Tracking percentile",
    category: "tracking",
    description:
      "Where a player's tracking number sits in the league, as the NHL works it out. Higher is always better, so a high percentile for goals against means few goals against. Shown from 1st to 99th; teams get a league rank (1st to 32nd) instead.",
  },
  {
    name: "Top speed",
    aliases: ["Max speed"],
    category: "tracking",
    description: "A skater's fastest skating speed in any game this season, in miles per hour.",
  },
  {
    name: "Speed bursts",
    aliases: ["Bursts over 20 mph", "Bursts over 22 mph"],
    category: "tracking",
    description:
      "How many times this season a skater went faster than 20 mph (or 22 mph). Top speed is one moment; bursts show how often a player gets there.",
  },
  {
    name: "Distance skated",
    category: "tracking",
    description:
      "Total distance a skater covered this season, in miles, plus the most in a single game. Per-60 versions adjust for ice time.",
  },
  {
    name: "Hardest shot",
    aliases: ["Shots over 90 mph", "Shot speed"],
    category: "tracking",
    description:
      "A skater's fastest shot this season, in miles per hour, and how many of their shots went over 90 mph.",
  },
  {
    name: "Zone time",
    aliases: ["Offensive zone time"],
    category: "tracking",
    description:
      "The share of a player's or team's ice time spent in the offensive, neutral and defensive zones.",
    interpretation:
      "More offensive-zone time usually means more puck possession, but it also depends on deployment: players who start in the defensive zone spend more time there.",
  },

  // Streaks and records
  {
    name: "Point streak",
    category: "records",
    isCalculated: true,
    description:
      "Regular-season games in a row with at least one point. A streak ends with a pointless game, or once a player hasn't played for a week.",
    interpretation:
      "We follow streaks through the game data we have stored. Where a streak runs back to a game we don't have yet, it's shown with a plus (\"4+\") because it may be longer.",
  },
  {
    name: "Game Score streak",
    category: "records",
    isCalculated: true,
    description:
      "Regular-season games in a row with a Game Score of 1.0 or more, which is about a player's best quarter of games. It catches runs of strong all-round games that a point streak misses.",
  },
  {
    name: "Milestone clubs",
    aliases: ["1,000 points", "500 goals", "100-point season", "50-goal season"],
    category: "records",
    description:
      "Every career that reached 1,000 points or 500 goals and every 100-point or 50-goal season, with the game the milestone came in. From NHL records.",
  },
  {
    name: "Game 7 and overtime record",
    aliases: ["Game 7", "Playoff pressure"],
    category: "records",
    description:
      "A goalie's career playoff record in Game 7s and in overtime games, and their save percentage in playoff overtime. From NHL records.",
  },
  {
    name: "Hockey Hall of Fame",
    abbreviation: "HHOF",
    aliases: ["Hall of Fame"],
    category: "records",
    description:
      "Players inducted into the Hockey Hall of Fame in Toronto. Other halls, such as the US Hockey Hall of Fame and the IIHF's, aren't counted.",
  },

  // Deserve to win and win probability
  {
    name: "Deserve to win",
    abbreviation: "DTW",
    aliases: ["Win Probability", "Deserve to Win Meter"],
    category: "derived",
    isCalculated: true,
    description:
      "A win probability estimate based on shot quality (xG) rather than actual goals. Shows which team 'deserved' to win based on the chances they created.",
    interpretation:
      "Useful for identifying games where the result didn't match the underlying play. A team can lose while deserving to win if they created better chances but got unlucky with finishing or goaltending.",
  },
  {
    name: "Monte Carlo win probability",
    abbreviation: "MC Win%",
    aliases: ["Monte Carlo", "MC"],
    category: "derived",
    isCalculated: true,
    description:
      "Win probability estimated by running 10,000 simulations of the game, where each shot either scores or misses based on its xG probability. Handles shot flurries by skipping rebounds after simulated goals.",
    formula:
      "For each simulation: replay all shots using random draws vs xG; count wins/losses/ties; OT ties split 50/50",
    interpretation:
      "More realistic than Poisson because it respects the actual shot sequence and handles dependent events (rebounds). The gold standard for deserve-to-win analysis.",
  },
  {
    name: "Poisson win probability",
    abbreviation: "Poisson Win%",
    aliases: ["Poisson"],
    category: "derived",
    isCalculated: true,
    description:
      "Win probability calculated analytically by treating goals as Poisson-distributed random variables with λ = total xG for each team.",
    formula:
      "P(home wins) = Σ P(home=h) × P(away=a) for all h>a; P(OT win) = P(tie) × 0.5",
    interpretation:
      "A fast analytical approximation. Assumes goals are independent events, which slightly overestimates variance compared to Monte Carlo. Shown as dashed line for comparison.",
  },
];

export const categoryInfo = {
  basic: {
    label: "Basic stats",
    description: "Traditional counting statistics that form the foundation of hockey analysis.",
  },
  possession: {
    label: "Possession",
    description:
      "Metrics that measure which team controls the puck more, based on shot attempts.",
  },
  expected: {
    label: "Expected goals",
    description:
      "Probability-based metrics that weight shots by their likelihood of becoming goals.",
  },
  shooting: {
    label: "Shooting quality",
    description: "Metrics that evaluate the quality and location of shots.",
  },
  context: {
    label: "Game context",
    description: "Situational modifiers that affect how statistics should be interpreted.",
  },
  tracking: {
    label: "Player tracking",
    description: "Speed, distance, shot speed and zone time from NHL EDGE, the league's player and puck tracking.",
  },
  records: {
    label: "Streaks and records",
    description: "Current streaks, milestones and career records from NHL records and our game data.",
  },
  derived: {
    label: "Calculated by us",
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
  "tracking",
  "records",
  "derived",
];
