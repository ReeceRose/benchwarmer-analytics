# Design system: "press box"

The reference for UI work. Benchwarmer is near-monochrome so the numbers do
the talking: neutral surfaces, ink for anything you can press, and colour saved
for data. Tokens live in `app/src/index.css`; shared building blocks live in
`app/src/components/layout/`.

When in doubt, copy the game centre (`components/game-live/`), the standings
page (`routes/standings.tsx`) or the game preview (`components/game-preview/`).
They are the most current examples.

## Principles

1. **Colour is data.** Chrome (headers, cards, buttons, tabs, borders) is
   neutral. Colour shows up only in charts, good/bad signals and team identity.
2. **One loud element per page.** On team, player and game pages that's the
   team-coloured hero. Everything below it uses the neutral theme. Stats pages
   have no loud element.
3. **Numbers first.** Big, tabular, display-font headline numbers. Labels are
   small and muted, in sentence case, never uppercase-tracked.
4. **Say it once.** If the hero shows the series record, the section below
   doesn't repeat it.
5. **Same layout in both themes.** Every colour is a token that changes in dark
   mode. Never hard-code a hex in a component (the exceptions are listed below).

## Colour

### Tokens

| Token | Use |
| --- | --- |
| `background` | Page. `#fafafa` light, `#0a0a0a` dark |
| `card` | Surfaces (`Panel`, `Card`, tables, tiles) |
| `foreground` | Body text and ink |
| `muted-foreground` | Labels, captions, secondary numbers |
| `muted` | Bar tracks, quiet chips, hover fill |
| `accent` | Hover fill for menu and list items |
| `border` | Every border. Use the bare `border` class; the base layer sets the colour |
| `primary` | **Ink**, not a brand colour: `#111` light, `#f5f5f5` dark. Default buttons, active tab underline, focus states |
| `link` | Links and link hover (blue). The only blue in the chrome |
| `ring` | Focus ring |

### Data colours

Every chart colour does one job, and each job has one name. Pick colours
through the roles in `lib/chart-colours.ts`, never a raw slot: the
`colours/chart-colour-roles` lint rule rejects `var(--chart-2…5)`,
`*-chart-2…5` classes and `CHART_COLOURS[n]` for n > 0 outside that file.

| Role | Colour | Use |
| --- | --- | --- |
| `CHART_COLOURS` | `chart-1` … `chart-5`: blue, orange, aqua, yellow, violet | **Identity** (which player, season, series). One series is `chart-1`. Several take slots in order; never cycle past five |
| `STATUS_COLOURS` (`success` / `error` / `warning`) | green / red / amber | **Good / bad / caution only**: above or below average, better or worse side, positive or negative GSAx |
| `ZONE_COLOURS` | O-zone `chart-1`, neutral muted, D-zone `chart-2` | Zone starts, zone time, giveaways by zone |
| `UNIT_COLOURS` | `chart-1` / `chart-2` | PP vs PK, forwards vs defence (first-named first) |
| `REFERENCE_COLOUR` | `muted-foreground` | Expected or baseline series beside an actual one (dashed for lines) |
| `teamColour(side)` | away `chart-2`, home `chart-1` by default; readers can change it | Two-team views |
| `SHOT_DANGER_COLOURS` | `shot-goal/high/medium/low` | Shot maps only (see Charts) |
| `hot` / `cold` | | Form trends (flame / snowflake) |
| `live` | | Live-game dot |
| `highlight` | | Rare emphasis chips (e.g. GWG) |

The series palette was picked with the `dataviz` skill's validator against
our card surfaces in both themes: neighbouring slots stay distinct under
colour-blindness, and the first three stay distinct pairwise, so scatter
charts can use up to three series. Blue/orange is the safest pair, which is
why every two-way split (sides, zones, units) uses slots 1 and 2. Yellow and
aqua are under 3:1 on white, so slots 3–5 need a legend with values or a
table view.

Rules:

- **Green/red means good/bad and nothing else.** That's why the series
  palette has neither. A goal isn't good or bad in a neutral game view, so
  goal labels are bold ink, not green.
- **A colour follows its entity.** On pages where readers pick players
  (Compare, Age curves), `useSeriesColours(ids)` keeps each player's colour
  while they stay selected, so removing one doesn't repaint the rest.
- **Parts of one total share a hue**: the main part `chart-1`, the other
  `color-mix(in oklab, var(--chart-1) 40%, var(--card))`.
- **Blue in the chrome means a link.** Don't colour status pills, icons or
  badges blue.
- **Never use `text-primary` for links or emphasis.** It's ink. Use `text-link`
  for links (`hover:text-link` for names that link, e.g. a player name).
- No Tailwind palette classes (`text-green-600`, `bg-blue-500`…) and no
  `hsl(var(--…))`. Use the tokens.
- Good/bad thresholds for common stats are in `lib/stat-colours.ts`
  (`getXgPctColour`, `getPdoColour`, …). Use them rather than inventing new
  thresholds.
- Prefer **bold for the better side** over colouring both sides green/red. Two
  coloured columns turn a whole table into a traffic light. Reserve
  `success`/`error` for values that cross a meaningful threshold.

### Team colours

- `getTeamColours(abbrev)` (`lib/team-colours.ts`) returns `{ primary, accent }`.
  `primary` is dark enough for white text. Use it **only** for hero
  backgrounds (`EntityHero`, `GameDetailHeader`) and small marks.
- Where two team colours sit side by side (the `GameDetailHeader` split),
  check `coloursAreSimilar(a, b)` and mark the seam with a thin dark line
  when they'd blur together (OTT/NJD reds, navy vs navy).
- For small marks on the page surface (game card stripes, dots), draw it
  through `teamMarkColour(hex)`, which keeps hue and chroma but clamps OKLCH
  lightness to `--team-l-min`/`--team-l-max` (navy brightens in dark mode,
  white greys in light mode). Don't mix with white: it washes colours out.
- `getBrandPalette(abbrev)` returns the team's official colours unadjusted
  (Bruins gold, not the black header primary), most prominent first. The game
  centre picker offers these as `brand-0`…`brand-2`.
- In two-team comparisons on the neutral surface, don't use team brand colours
  (two red teams would clash). Use the side colours from
  `components/game-live/live-utils.ts`: `teamColour("away")` = `chart-2`
  (orange), `teamColour("home")` = `chart-1` (blue), labelled with `TeamLabel`/`Swatch`.
  Every place a team code names a side (chart axis labels, legends, column
  headers) gets the swatch next to it, so the colour key is never more than a
  glance away. In SVG, draw the swatch as an 8px `rect` with `rx={2}`.
  Readers can change the side colours from the team key under the game centre
  heading (`TeamColourPicker`, saved per side by `useSideColours`): chart
  tokens, the team's brand colours, or a custom colour. It sets
  `--team-away`/`--team-home` on the root, so always go through
  `teamColour()` rather than `var(--chart-1)`/`var(--chart-2)` for sides.
- Logos: `TeamLogo` (`components/team-detail/TeamLogo`). In SSR'd markup (root
  layout, homepage) it swaps variants with the `dark:` class. On a coloured
  hero, pass `variant="dark"`.

### Allowed hard-coded colours

The team colour table, in `lib/`. Rink drawings use tokens (`Rink`,
`HalfRink`).

## Typography

- **Fonts:** Onest (`font-sans`, body) and Funnel Display (`font-display`,
  headings and headline numbers). `h1`–`h3` get the display font automatically.
- **Scale:**
  - Page title (`PageHeader`): `text-3xl md:text-4xl font-bold`
  - Hero title (`EntityHero`): up to `text-[2.75rem]`
  - Section title (`Section`): `text-xl font-semibold`
  - Card title: `text-sm font-semibold` (`Card` in `game-live/parts.tsx`) or
    the shadcn `CardTitle`
  - Body: `text-sm`. Captions and labels: `text-xs text-muted-foreground`.
    Tiny chart or stat labels: `text-[11px]`
- **Headline numbers:** `font-display font-bold tabular-nums`, `text-2xl` to
  `text-3xl` (`StatTile`, `HeroStat`).
- **Numbers always use `tabular-nums`.** Tables get it from the base layer.
- **Sentence case everywhere:** "Team comparison", not "Team Comparison" or
  "TEAM COMPARISON". No `uppercase tracking-wide` labels.
- **Missing values:** `–` (en dash) or `—` in muted text, never `-` or `N/A`.

## Shape and spacing

- **Radius:** `rounded-2xl` for surfaces (panels, cards, tables, tiles, empty
  states), `rounded-xl` for nested surfaces and list-row hovers (tooltips,
  inner tiles), `rounded-full` for buttons, pills, segmented controls, badges,
  inputs and bar tracks. Small marks: legend swatches `rounded-[3px]`, dots
  `rounded-full`. Items inside menus and popovers (dropdown rows, search
  results) and inline `<code>` use `rounded-lg`/`rounded-md`. Avoid bare
  `rounded`, `rounded-md` and `rounded-lg` on surfaces.
- **Borders:** one `border` around a surface. No double borders, no
  `border-2` except dashed drop zones.
- **Shadows:** none on page surfaces. Popovers and tooltips get
  `shadow-lg shadow-black/5`.
- **Page rhythm:** `container py-8`; `space-y-6` between page-level blocks on
  stats pages, `space-y-8` between `Section`s on detail pages; `gap-4` between
  cards in a grid (`gap-6` for full-width chart grids, `gap-8` between section
  columns).
- **Panel padding:** `p-4 sm:p-5` (built into `Panel`).

## Layout building blocks (`@/components/layout`)

| Component | Use |
| --- | --- |
| `PageHeader` | Top of every stats or list page: title, one-sentence description, `actions` (filters, links) right-aligned |
| `EntityHero` + `HeroBadge` + `HeroStat` | Team-coloured header for team and player pages. `GameDetailHeader` is the two-team version for games |
| `PageTabs` + `pageTabClass` | Underlined tab row under a hero (team and player sub-pages). Route `<Link>`s mark themselves active |
| `Section` | A titled block: `h2` + optional description + optional `action` (usually a `text-link` "see more"), then content |
| `Panel` | Plain bordered surface (`rounded-2xl border bg-card p-4 sm:p-5`). The default wrapper for section content |
| `StatTile` | A labelled headline number on its own surface |
| `SegmentedControl` | Mutually exclusive filters (situation, grouping, period). Pill-in-pill, ink on the selected option |
| `ViewToggle` | The standard Table / Charts switch |
| `MetricGuide` | Collapsible "How to read these numbers", fed by glossary keys. Use it instead of scattered ⓘ tooltips |
| `EmptyState` | Dashed box with a title and a hint about what to change |

Shadcn `Card` (`components/ui/card`) is already restyled to match `Panel`
(`rounded-2xl border`, `py-5`/`px-5`). Use it for chart cards that need
`CardHeader`/`CardTitle`/`CardDescription`, and `Panel` for everything else.
Don't put icons in card titles.

Small metric cards (one headline number, a bar and a caption, like the
player "Usage and puck play" row) use `UsageCard`, `UsageNumber` and
`UsageCardSkeleton` from `player-detail/UsageCard.tsx`. Put the "how to read
this" text in the card's `caption`, not behind an ⓘ icon.

### Page skeletons

**Stats or list page**

```tsx
<div className="container space-y-6 py-8">
  <PageHeader title="…" description="…" actions={<SeasonSelector … />} />
  <MetricGuide metrics={[…]} />
  <div className="flex flex-wrap items-center justify-between gap-3">
    <SegmentedControl … />
    <ViewToggle … />
  </div>
  {view === "table" ? <Table … /> : <Charts … />}
</div>
```

**Detail page (team, player, game)**

```tsx
<>
  <EntityHero … />
  <PageTabs aria-label="…">…</PageTabs>
  <div className="container space-y-8 py-8">
    <Section title="…" description="…">
      <Panel>…</Panel>
    </Section>
    <div className="grid gap-8 lg:grid-cols-2">
      <Section …>…</Section>
      <Section …>…</Section>
    </div>
  </div>
</>
```

Routes are client-rendered unless they opt into SSR. On SSR'd routes, and in
the root layout, don't read `window`, `localStorage` or theme state during
render (see CLAUDE.md).

## Components and patterns

### Controls

- **Buttons:** `Button` is `rounded-full`. Use `default` (ink) for the one
  primary action and `outline` for secondary actions such as page-header links.
- **Selects:** `SeasonSelector` and shadcn `Select`, `rounded-full`, sitting
  next to `SegmentedControl`s in a `flex flex-wrap items-center gap-2/3` row.
- **Filters go in the URL** (`validateSearch` + `navigate({ search })`), so
  views can be shared.
- **Filter rows** with many filters (team shot map, `shot-explorer/ShotFilters`):
  one wrapping row of label-less selects (an `aria-label` on each trigger, and
  "All periods"-style default values that say what they filter), a
  `SegmentedControl` for a two-way toggle rather than a `Switch`, and a ghost
  "Clear filters" button that only appears when something is filtered.

### Tables

- Wrap in `overflow-hidden rounded-2xl border bg-card`, or put the table in a
  `Panel`/`Card`.
- Headers are quiet: `text-xs font-medium text-muted-foreground`. Raw `<th>`s
  pick this up from the base layer. No grey header band (`bg-muted/50` rows).
- Sticky first columns use `sticky left-0 z-10 bg-card`.
- `Table` draws each row's line on its cells (`border-separate`), so a
  sticky column keeps its row lines. To change a row's border, target the
  cells (`[&>td]:border-b-0`), not the `<tr>`. A `Card` that wraps a
  scrolling table gets `overflow-hidden` so the sticky column can't poke
  past the rounded corner.
- Use `SortableTableHeader` for sortable columns and `HeaderWithTooltip` for
  abbreviations that need a definition.
- Teams in dense tables: `TeamTag` (logo + code, links to the team).
- Right-align numbers. Tabular nums come from the base layer.

### Two-team comparisons

The away team is always on the left and the home team on the right, matching
the hero and scoreboard.

- `MirroredBar` (`game-live/parts.tsx`): two bars growing out from a centre
  label, in the side colours, with the better value bold. Pass `lowerIsBetter`
  for things like xGA or GAA. Finish with a legend row:
  `TeamLabel side="away"` · "Bold = better side" · `TeamLabel side="home"`.
- One team's road vs home games (team "Home and away" tab,
  `team-detail/TeamHomeAway.tsx`) uses the same layout: road on the left in
  the away colour, home on the right. Each `MirroredBar` label carries the
  league's road · home figure as a muted second line, so the reader can tell
  a real home edge from the normal one. Over seasons
  (`team-detail/HomeAwayHistory.tsx`), one stat at a time: away and home
  lines in the side colours, then a "home edge" bar per season (home colour
  above zero, `muted-foreground` below, signed so positive is always better
  at home) with the league's edge as a dashed `REFERENCE_COLOUR` line. A
  season still in progress stays in the table ("so far") but out of the
  charts.
- `StackedBar`: proportional parts with 2px gaps (e.g. shot outcomes). For a
  stacked bar with a counted legend (zone starts, faceoffs won/lost), use
  `SplitBar` from `player-detail/UsageCard.tsx`.
- Comparing more than two players or teams (Compare page): one column each,
  **bold** for the best value per row and muted for the worst. Rows that are
  context, not performance (GP, TOI), get no emphasis.
- `TeamHeading` (`game-preview/TeamHeading.tsx`): logo + code above each
  team's column.
- All-time records (game preview "Head to head",
  `game-preview/HeadToHeadSection.tsx`): one `StackedBar` per record (away
  wins, ties in `muted-foreground`, home wins), games and goals as a muted
  line above, and `TeamLabel`s with win counts below, the side with more
  wins bold.
- `GameScorecard` (`game-live/GameScorecard.tsx`): one game at a glance
  (score, goals and shots by period, five `StackedBar` share rows with the
  better side bold, last goal). It's the share card: the Share button on the
  game hero (`ShareGameButton`) opens it in a dialog that copies, downloads
  or natively shares it as a PNG. Anything drawn into that image must load
  from our origin (logos via `getSameOriginTeamLogoUrl`), or the export fails.

### Ranked values that can be negative

- `DivergingBar` (`game-live/GameScoreSection.tsx`): a bar from a centre
  zero line, right in the side colour for positive values and left in
  `muted-foreground` for negative ones, all scaled to the largest absolute
  value in view so both teams share a scale. Used for Game Score, one card
  per team (away left), best first, with the parts that make up the value
  as muted columns from `sm` up and TOI muted after the name. Long lists
  show the top 6 and bottom 3 with an "N more" row, and one ghost
  "Show all" button below expands both teams together.

### League percentiles and ranks

- Small comparison tables inside a `UsageCard` or `Panel` (shot types,
  goalie rest, team situation records): quiet headers, numbers right-aligned
  with `pl-3` between columns, the subject's value **bold** where it beats
  the league's figure in the next column (muted), rank muted. Rows with no
  games are muted. A share column is a `rounded-full bg-muted` track with a
  `chart-1` bar and the percentage beside it.
- League top 10s (tracking leaders page): a grid of `Panel`s, one per stat,
  each an `ol` of player rows (rank, NHL headshot, name, team · position ·
  date or context, value).

- `TrackingRow` (`components/tracking/`): label and value, the percentile
  (players) or rank (teams) as a display-font ordinal on the right, a
  `rounded-full bg-muted` bar to it with a tick at the league median, and a
  muted line under the bar for context on the left (when a peak happened,
  goals from that area) and "League avg …" on the right. Ranks map onto the
  same 0-100 scale for the bar.
- Colour the ordinal and bar with `getPercentileColour` /
  `getPercentileBarClass` (`lib/stat-colours.ts`, top quarter `success`,
  second quarter `warning`, bottom quarter `error`), the same thresholds as
  the player page's league percentiles. Only use them where the source
  orients the percentile so higher is better (NHL EDGE does). Percentiles
  read 1st to 99th, never 100th.
- Group rows in `UsageCard`s with the source and how to read the bar in the
  caption. Shares of a whole (zone time) are a `StackedBar` with a swatch
  legend of value and league average, in the zone colours the usage cards
  use (`ZONE_COLOURS`).

### Lists of players

- A row is a `Link` with `group -mx-2 rounded-xl px-2 py-1.5
  hover:bg-muted/60`. The name gets `group-hover:text-link`.
- `Avatar` headshot (`getPlayerHeadshotUrl(id, team)`, initials fallback),
  name `text-sm font-medium`, meta `text-xs text-muted-foreground`, value
  right-aligned `tabular-nums font-semibold`.
- Separate stacked rows with spacing (`space-y-1`) rather than boxing each
  one. Avoid `divide-y` on rows that have rounded hover backgrounds, because
  the dividers pick up the curve.

- Ranked single-game performances (homepage "Last night's best and worst games",
  `/single-games`): `GameScoreList` (`components/game-scores/`). Same row
  pattern; the row links to the game, the meta line is team · stat line ·
  TOI (· date for season records), and the right column is the value over a
  muted "vs OTT · W 4–1". `GameScoreListSkeleton` matches it.
- Milestones (homepage "Milestone watch", `home/MilestoneSection.tsx`):
  the same row; meta is team · current total, the right column is "2 to
  700 games" over a muted "About 5 games away". Two columns of `ol`s from
  `lg` up, closest first down each column.
- Draft picks (`components/draft/`): `DraftPickRows` uses the row pattern
  without avatars (old picks have no headshots): pick number (and year) in a
  muted left column, the name links only when we have a player page, and the
  right column is the NHL career ("746 GP, 828 P", muted "No NHL games")
  over its span. `DraftTable` is the full class: sticky player column, the
  team as a `TeamTag` unless the franchise has moved since (then the code at
  the time, muted, with today's team on hover), points or wins bold.
- One player's games (`player-detail/PlayerGameLog.tsx`, the player page's
  "Game log" tab): three `StatTile`s, a per-game strip and a table, newest
  first, with a sticky date column linking to the game. The strip is one bar
  per game from a zero line, ink above and `muted-foreground` below (the
  `DivergingBar` rule), at most `max-w-6` wide, with a dashed line at the
  average and a dot on the zero line for games with no value. Bars link to
  the game and turn `link` blue on hover.

### Teams by season

- Season-by-season heatmap (`special-teams-stats/charts/PenaltySeasonHeatmap.tsx`):
  teams down the side (sticky, logo + code linking to the team), seasons
  across, a value in each cell. Shade one hue, `chart-1` mixed into `card`
  (8–60%), by the team's place *within that season*, not the raw value, so
  league-wide drift across eras doesn't swamp it. Ring each season's leader
  (`ring-2 ring-foreground`) and repeat it as a logo row under the season
  headers. Season headers sort the rows; "Avg rank" sorts by the average
  rank across the range (seasons in progress excluded, drawn at 60%).
  Filters (stat, fewest/most first, season range) go in the URL.
- Its "Team charts" layout is small multiples: one bordered panel per team
  (rank, logo, code, latest value; avg rank under it), a `chart-1` line over
  a dashed `muted-foreground` league average, every panel on one shared y
  scale (stated in the caption) so heights compare. Plain SVG with
  `vector-effect: non-scaling-stroke`, not 30 Recharts instances.
- Its "All teams" layout puts every team on one Recharts line chart: thin
  `muted-foreground` lines at low opacity. Any number of teams can be picked
  (chips under the chart, with All / Clear, kept in the URL): the first five
  take series colours (`useSeriesColours`, which takes string ids too), the
  rest are ink, since the palette never cycles. Picked lines are labelled at
  their last point, and labels that end close together are pushed apart
  (12px minimum), which needs a fixed y domain. Hover traces any line. A Value/Rank switch turns it into a bump chart
  (rank within each season, 1st at the top).

### Probabilities and projections

- Format probabilities with `formatOdds` (`lib/odds.ts`): whole percents,
  "<1%" and ">99%" at the ends rather than 0% or 100%.
- Projection tables (`projections/PlayoffOddsTable.tsx`): no heat colours;
  the headline probability column is bold. A projected range is a muted
  band (middle 80%) on a `bg-muted` track with an ink tick at the average,
  the number beside it. A dashed row border marks a cut line (playoff
  spots). Day-over-day change uses ▲/▼ and is `success`/`error` only past
  `NOTABLE_CHANGE`, stated in the caption.
- Pregame win chance: on a game card, a footer like the xG share (two
  percentages over a split bar in team mark colours, favourite bold); in the
  game preview, a `Section` with `TeamLabel`s, display-font percentages and
  a `StackedBar` in the side colours.

### Trophies

- Trophy photos (`trophies/TrophyImage.tsx`) are the NHL's, shot on black,
  so they sit in a `rounded-xl bg-black` portrait frame (2:3): small on the
  trophies index cards, larger beside the page title on a trophy page.
- A player's trophies show as up to three `HeroBadge`s on the hero ("6× Art
  Ross"), using `shortTrophyName` (`lib/trophies.ts`); the career tab lists
  them all. Franchise trophy counts are outline pills that link to the
  trophy.
- A trophy's "race" names the stat it's ranked by and says in the
  description when the award is voted on, so it never reads as a forecast.

### Records

- Franchise people (team History): retired numbers as a display-font
  number column beside the name; captains, coaches and GMs as stacked rows
  (name, then the tenure in muted `text-xs`), newest first, eight shown with
  a ghost "Show all". Coach Cups and HHOF are quiet chips.
- Milestone moments read as a sentence: what, then the date (linked to the
  game from 2008-09 on) and score, then muted context (age, games, goalie).
- A goalie's Game 7 and overtime record are three `StatTile`s.
- Streaks that run back to a game we have no data for show "4+ games", and
  the caption says why.

### Chips and badges

- Quiet chip: `rounded-full bg-muted px-1.5 py-0.5 text-[11px] font-semibold
  uppercase` for short codes (PP, OT, SO). This is the one place uppercase is
  fine, because the content is an abbreviation.
- On a hero: `HeroBadge` (`bg-white/15`).
- `Badge variant="outline"` for neutral tags such as positions. Avoid
  `variant="default"` (a solid ink blob) for data. To show a winner, use bold
  text and a logo.

### Charts (Recharts)

- Read the `dataviz` skill before building a new chart.
- Colours: by role (see Data colours). Axes and
  grid: `CHART_AXIS_COLOURS` (border-coloured lines, muted ticks). The base
  stylesheet already sets chart fonts and quiet axis lines.
- Tooltips: `rounded-xl border bg-popover text-popover-foreground p-3 text-sm
  shadow-lg shadow-black/5`, with `TooltipTitle` (swatch + name) from
  `game-live/ChartTooltip.tsx`. Skip hover tooltips on coarse pointers.
- Legends: `ChartLegend` (`components/charts`), a row of swatches and muted
  labels (dashed lines for expected or reference series), not Recharts'
  default legend boxes.
- **Bars start at zero.** If a stat can't sensibly start at zero (save %,
  CF%), draw a dot on a fitted range instead (`fitDomain` in
  `charts/comparison-utils.ts`), or bars growing out from a meaningful
  middle (50% xG share, 0 GSAx).
- **One y-axis.** Two measures on different scales get two charts stacked on
  the same x-axis (see the age curves' sample-size bars), never a second axis.
- **Colour by series, never by rank or position.** A single-measure bar chart
  is one colour (`chart-1`); fade bars below a reference instead of
  colouring rank buckets. No pies: a ranked list with share bars reads better.
- **Don't chart a total next to its parts.** Points = goals + assists, so
  stack goals and assists and let the stack's height be points (career
  stats, `player-detail/CareerTotalsChart.tsx`), in one hue (see Data
  colours).
- A few numbers per category (scoring rates by situation) are a small table,
  not a grouped bar chart: see "League percentiles and ranks" and
  `player-detail/SituationBreakdownChart.tsx` (all situations on top as the
  total, ice time beside each rate, rates from small samples muted, a share
  bar column from `sm` up).
- Comparing a few players or seasons on several stats: `ComparisonBars`
  (`components/charts`), a row per stat and a bar or dot per series, best in
  bold. Not radar charts.
- Rolling form over a season (team "Games" tab): one hue for the team, a
  solid line for the actual share and a dashed one for the expected share,
  a dashed 50% reference, game number on the x-axis with ticks at 1 and every
  10th game, and y-ticks in steps of 10. Hide the first few games, where a
  window of one or two games is noise, and say so in the caption.
- Rolling form for a player (player "Games" tab, `player-detail/PlayerForm`):
  one `chart-1` line for the rolling average against a dashed season
  average, a metric toggle on the legend row inside the panel (not in the
  section header, where it overflows on phones), and `niceAxis` ticks.
  Skaters use a 10-game window; goalies use 5 because they play fewer games.
  Ratios (Sv%, GAA) are pooled over the window, not averaged per game. The
  "Stretches" table under it (last 5/10/20 vs the season) bolds values that
  beat the season and never bolds context columns (TOI, +/-, shots against).
- Before/after for every team (power rankings form chart): a ranked list
  of rows, not a Recharts chart. Each row has the team, a track with a muted
  dot for the baseline and a `chart-1` dot for the new value joined by a
  `bg-border` line, a dashed 50% mark, then the value and the change as
  text. Sort by the change. Colour the change `success`/`error` only past a
  stated threshold, and say in the caption why smaller moves are noise.
  Points against expected points uses the same rows (muted dot = expected,
  `chart-1` dot = actual, sorted by the gap, notable gaps bold, not coloured).
- One measure ranked across teams or players (points %, PP%, PK%, top 10
  leaders): `RankedBars` (`components/charts`), with `RankedTeamLabel` or
  `RankedPlayerLabel` and `niceAxis` for round ticks. Each row is a link:
  rank, label, a `rounded-full bg-muted` track with a `chart-1` bar, the
  value, and an optional muted meta column (record, team) from `sm` up.
  Bars start at zero; mark a reference with `reference` (dashed, e.g. .500)
  and `fadeBelowReference`. Stats that can't start at zero either grow from
  a meaningful middle (`baseline` = league average; below it grows left in
  muted ink) or use `marker="dot"` on a fitted range (save %, CF%). Never a
  tall Recharts bar chart whose axis is only logos or headshots.
  Rows with no page to link to (line combinations) pass `linked={false}`;
  bars that split by category (forwards vs defence) set a `colour` per row
  and get a `ChartLegend`.
- Goals against expected goals for a set of skaters: `GoalsVsXgScatter`
  (`components/charts`), headshot dots, a dashed goals = xG line, axes from
  zero. `highlight` picks which side of the line is the story (`chart-1`);
  the other side is muted. Above or below xG is never green or red.
- Rank tables (category rankings): one-hue heat map. `chart-1` tint
  strongest at 1st and gone by 11th, bottom 10 in muted text, never a
  green/red split.
- Line charts over games or seasons use `type="linear"`, not
  `"monotone"`: smoothing invents values between points. Leave part
  seasons (under 20 GP) out of season-by-season totals, and say so in the
  caption.
- Scatter charts with quadrants: dashed reference lines only, no tinted
  quadrant fills (that's colour by position). The domain always includes
  the reference lines and never goes below zero for counts. Quadrant
  labels are neutral unless the quadrant is plainly good or bad (elite,
  struggling); "lucky" and "unlucky" are neither. The detail panel's button
  is an `outline` "Team page"/"Player page", not a solid ink button.
- Time series with a season in progress (league trends): solid line for
  full seasons, a dashed segment to a hollow dot for the partial season,
  "so far" in the legend, tooltip, tiles and table.
- Win probability (`game-live/WinProbabilitySection.tsx`): one line with
  the midline at 50%, coloured and tinted in the home side colour above it
  and the away side colour below (clip paths, not two series), y ticks
  reading 100-50-100, a swatch + code at each end of the axis, goals as
  hollow rings in the scorer's side colour, and power plays shaded as in
  Game flow. `StatTile`s underneath for pregame, biggest swing and the
  trailing team's best chance.
- Franchise history (`team-history/FranchiseHistory.tsx`): points % by
  season as one `chart-1` line on a fitted range in steps of .100 with a
  dashed .500, ticks every 30 seasons, and Stanley Cup seasons as
  `foreground` dots ringed in `card` (said in the caption, no legend). The
  season table underneath is its table view.
- Goal replays (`game-live/GoalReplaySection.tsx`): the full `Rink` with
  players as side-colour circles carrying white sweater numbers, the scorer
  ringed in `foreground`, and the puck as a small `foreground` dot with a
  faint two-second trail. Positions are interpolated between the 10 fps
  frames. Controls under the rink: an `outline` Play/Pause/Replay button, a
  range scrubber and a `SegmentedControl` for speed. It plays on its own
  unless the reader prefers reduced motion. The goals sit beside it (below
  `xl`) as buttons in the list-row style, the selected one `bg-muted`.
- Rink areas (`tracking/RinkAreaMap.tsx`): the NHL's 17 EDGE areas as
  rectangles on `HalfRink` (underlay), one `chart-1` hue, the value printed
  in each, hover text with the percentile or rank. Shade counts by share
  (`shade="share"`: where shots come from) and rates by league standing
  (`shade="standing"`: save %), never counts by percentile (most players
  never shoot from far areas, so 0 ranks high). Areas off the drawing are a
  line underneath. Captions say "bluer", not "darker", because the hue gets
  brighter in dark mode. At most `max-w-md`.
- Standings race (`standings/charts/PointsRaceChart.tsx`): more lines than
  the palette has colours, so one team is `chart-1` and the rest
  `muted-foreground` at low opacity, a division at a time. Pick the
  highlighted team from a row of pill buttons under the chart (logo, code,
  points, ordered by points) or by hovering its line; the tooltip lists
  every team on that date.
- Playoff bracket (`routes/playoffs.tsx`): seven columns (first round to
  final and back out), series as two-row `rounded-xl border` cards with logo,
  code, muted seed and wins, the winner bold and the loser muted. The grid
  keeps a minimum width and scrolls sideways on phones.
- Hand-drawn SVG charts that must stay legible on phones measure their box
  with `useElementWidth` and draw in real pixels (text keeps its size, the
  height steps down below 640px) rather than scaling a fixed viewBox.
- Put a one-line caption under a chart when the scale needs explaining
  ("Values normalised per metric (0–100)").
- Shot maps: `SHOT_DANGER_COLOURS` (goal green, high red, medium amber, low
  blue). This is the one place red and green aren't good/bad: it's the
  convention readers know from other shot maps, so it has its own tokens
  (`--shot-*`) and never borrows chart slots. Rink markings use `--rink-red`
  and `--rink-blue` for the same reason. Draw them on the `Rink` component
  (full rink, game centre) or `HalfRink`
  (`shot-explorer/`, one offensive zone; place shots with `toHalfRink`, which
  works out which net a shot was aimed at). Size is xG with an
  area-proportional radius; shape is the result (filled = on goal, ring =
  missed). Use `useChartTooltip` for hover, not a Radix tooltip per mark, and
  pin a clicked mark in a detail panel so touch works.
- Heat maps: one hue (`chart-1`) from clear to full strength, drawn under
  the rink markings (`HalfRink underlay`). Leave out cells too small to mean
  anything and say so in the caption.
- Pair matrices (chemistry): one triangle only, a diverging `error`–grey–`success`
  scale around 50% (above 50% xG is good), small samples faded, hover for numbers, click to pin.
- Quadrant legends under scatter charts: neutral `rounded-xl bg-muted/60 p-2`
  tiles, with the label coloured only when it means good or bad.
- Chart selection detail panels (click a dot): `rounded-xl border bg-card p-3`
  under the chart.

### Loading, empty and error states

- `Skeleton` blocks with the **same footprint** as the loaded content: the same
  grid, heights and radius (`rounded-2xl` for panels). Section skeletons also
  include a title bar (`h-7 w-48`).
- `TableSkeleton`, `LoadingState` and `EntityHeroSkeleton` for the common
  shapes; `RoutePending` and `RouteError` at route level.
- `EmptyState` for "nothing here", with a hint about what to change. Inline
  one-liners inside a panel (`text-sm text-muted-foreground`) are fine for
  small sections. Write a sentence ("First meeting of the season"), not "No
  data".
- `ErrorState` with a retry.

## Copy

- Sentence case, plain English, and no exclamation marks.
- A description is one sentence saying what the page or section shows.
- Use hockey abbreviations people know (xG, CF%, PP, GSAx) and define them in
  `MetricGuide` or the glossary rather than inline.
- Dates: `formatGameDate` / `formatGameDateLong` (`lib/game-formatters.ts`),
  which parse `YYYY-MM-DD` at noon to avoid off-by-one-day bugs. Don't call
  `new Date("2026-10-12")` directly.
- Numbers: `lib/formatters.ts`. `formatPercent(v)` expects a fraction (0.521);
  `formatPercent(v, false)` expects a percentage (52.1). Check which one the
  API returns (xG% and CF% are fractions; PP% and PK% are percentages).
  `formatSavePct` gives `.915`.

## Responsive

- Design for 390px first, then check at 1440px.
- Grids collapse to one column below `lg` (`grid gap-8 lg:grid-cols-2`).
- Balance card grids by height, not by count: measure the columns at 1440px
  and move cards (or give a wide card its own row) until no column ends far
  above its neighbour. Short cards can sit three across at `xl` and share a row
  at `lg` (see `TeamStatsSection`, `ShotProfile`).
- Heroes shorten team names to codes below `sm`.
- Wide tables scroll horizontally inside their surface. Pin the first column.
- Fixed-width centre columns (e.g. `MirroredBar`'s label column) squeeze bars
  on phones, so keep them as narrow as the labels allow.

## Code conventions for UI

- `@/` imports only (enforced by ESLint).
- No JSX comments (`{/* … */}`).
- `cn()` from `@/lib/utils` to merge classes. No template-string class soup.
- Match the surrounding comment density: a short doc comment on exported
  components is enough.

## Checklist for a UI change

- [ ] Uses `PageHeader` / `EntityHero`, `Section`, `Panel` rather than bespoke
      wrappers
- [ ] Colour only on data; green/red only for good/bad; blue only for links
- [ ] Sentence-case labels, no uppercase-tracked text, no icons in titles
- [ ] `rounded-2xl` surfaces, `rounded-full` controls, single borders
- [ ] Away on the left, home on the right
- [ ] `tabular-nums` on numbers; correct `formatPercent` mode
- [ ] Skeleton matches the loaded layout
- [ ] Checked at 390px and 1440px, in light and dark
