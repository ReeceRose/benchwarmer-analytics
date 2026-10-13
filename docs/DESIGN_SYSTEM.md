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

| Token | Meaning |
| --- | --- |
| `chart-1` … `chart-5` | Categorical series: blue, red, green, amber, violet. Use in that order |
| `success` / `error` | **Good / bad only**: above or below average, better or worse side, positive or negative GSAx |
| `warning` | Caution: "below average", "moderate" |
| `hot` / `cold` | Form trends (flame / snowflake) |
| `live` | Live-game dot |
| `highlight` | Rare emphasis chips (e.g. GWG) |

Rules:

- **Green/red means good/bad and nothing else.** Categories (PP vs PK, O-zone
  vs D-zone, actual vs expected, leading vs trailing) use `chart-*` colours or
  neutrals. "Offensive deployment" isn't good, so it isn't green.
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
- For small marks on the page surface (game card stripes, dots), mix it with
  `--team-mix` so it softens in dark mode:
  `color-mix(in oklab, ${primary} var(--team-mix), white)`.
- In two-team comparisons on the neutral surface, don't use team brand colours
  (two red teams would clash). Use the side colours from
  `components/game-live/live-utils.ts`: `teamColour("away")` = `chart-2`,
  `teamColour("home")` = `chart-1`, labelled with `TeamLabel`/`Swatch`.
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
- `StackedBar`: proportional parts with 2px gaps (e.g. shot outcomes). For a
  stacked bar with a counted legend (zone starts, faceoffs won/lost), use
  `SplitBar` from `player-detail/UsageCard.tsx`.
- Comparing more than two players or teams (Compare page): one column each,
  **bold** for the best value per row and muted for the worst. Rows that are
  context, not performance (GP, TOI), get no emphasis.
- `TeamHeading` (`game-preview/TeamHeading.tsx`): logo + code above each
  team's column.

### Lists of players

- A row is a `Link` with `group -mx-2 rounded-xl px-2 py-1.5
  hover:bg-muted/60`. The name gets `group-hover:text-link`.
- `Avatar` headshot (`getPlayerHeadshotUrl(id, team)`, initials fallback),
  name `text-sm font-medium`, meta `text-xs text-muted-foreground`, value
  right-aligned `tabular-nums font-semibold`.
- Separate stacked rows with spacing (`space-y-1`) rather than boxing each
  one. Avoid `divide-y` on rows that have rounded hover backgrounds, because
  the dividers pick up the curve.

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
- Series colours: `CHART_COLOURS` (`lib/chart-colours.ts`), in order. Axes and
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
- Comparing a few players or seasons on several stats: `ComparisonBars`
  (`components/charts`), a row per stat and a bar or dot per series, best in
  bold. Not radar charts.
- Put a one-line caption under a chart when the scale needs explaining
  ("Values normalised per metric (0–100)").
- Shot maps: `SHOT_DANGER_COLOURS` (goal green, high red, medium amber, low
  blue) on the `Rink` component (full rink, game centre) or `HalfRink`
  (`shot-explorer/`, one offensive zone; place shots with `toHalfRink`, which
  works out which net a shot was aimed at). Size is xG with an
  area-proportional radius; shape is the result (filled = on goal, ring =
  missed). Use `useChartTooltip` for hover, not a Radix tooltip per mark, and
  pin a clicked mark in a detail panel so touch works.
- Heat maps: one hue (`chart-1`) from clear to full strength, drawn under
  the rink markings (`HalfRink underlay`). Leave out cells too small to mean
  anything and say so in the caption.
- Pair matrices (chemistry): one triangle only, a diverging red–grey–green
  scale around 50%, small samples faded, hover for numbers, click to pin.
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
