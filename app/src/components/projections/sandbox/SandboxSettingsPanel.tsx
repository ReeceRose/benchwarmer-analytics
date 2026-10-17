import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Panel } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { modelSettings, type SandboxSettings } from "@/lib/projections/sandbox";
import { cn } from "@/lib/utils";
import type { SandboxInputs } from "@/types";

interface Preset {
  label: string;
  description: string;
  settings: (model: SandboxSettings) => SandboxSettings;
}

const PRESETS: Preset[] = [
  { label: "Our model", description: "The weights that tested best on past seasons", settings: (m) => m },
  {
    label: "This season only",
    description: "Forget last season and the offseason roster",
    settings: (m) => ({ ...m, carryOver: 0, roster: 0, priorGames: 10 }),
  },
  {
    label: "Last season counts more",
    description: "Trust last year's team until well into the season",
    settings: (m) => ({ ...m, carryOver: 0.7, priorGames: 82 }),
  },
  {
    label: "Goalies win games",
    description: "Triple goaltending's weight and sit injured goalies",
    settings: (m) => ({ ...m, goalie: 3, injuries: true }),
  },
  {
    label: "Pure luck",
    description: "Every team equal from here: only the standings and schedule",
    settings: (m) => ({ ...m, xg: 0, goals: 0, roster: 0, goalie: 0, uncertainty: 0 }),
  },
];

const sameSettings = (a: SandboxSettings, b: SandboxSettings) => JSON.stringify({ ...a, nudges: {} }) === JSON.stringify({ ...b, nudges: {} });

/** A labelled range input; the value is bold once it differs from our model's. */
function SettingSlider({
  label,
  hint,
  value,
  model,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  hint: ReactNode;
  value: number;
  model: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  const changed = Math.abs(value - model) > step / 2;
  return (
    <label className="block">
      <span className="flex items-baseline justify-between gap-2 text-sm">
        <span>{label}</span>
        <span className={cn("tabular-nums", changed ? "font-semibold" : "text-muted-foreground")}>{format(value)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full accent-foreground"
      />
      <span className="block text-xs text-muted-foreground">
        {hint}
        {changed && ` Our model: ${format(model)}.`}
      </span>
    </label>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      {children}
    </div>
  );
}

const times = (v: number) => `×${v.toFixed(1)}`;

/** Presets and every setting the sandbox exposes. */
export function SandboxSettingsPanel({
  inputs,
  settings,
  onChange,
}: {
  inputs: SandboxInputs;
  settings: SandboxSettings;
  onChange: (settings: SandboxSettings) => void;
}) {
  const model = modelSettings(inputs);
  const set = (patch: Partial<SandboxSettings>) => onChange({ ...settings, ...patch });
  const goaliesOut = inputs.teams.filter((t) => t.goalieOutlook).map((t) => t.team);
  return (
    <Panel className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Start from</h3>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => {
            const next = { ...p.settings(model), nudges: settings.nudges };
            const active = sameSettings(next, settings);
            return (
              <Button key={p.label} size="sm" variant={active ? "default" : "outline"} title={p.description} onClick={() => onChange(next)}>
                {p.label}
              </Button>
            );
          })}
        </div>
      </div>

      <Group title="What makes a team good">
        <SettingSlider label="Shot quality" hint="5v5 expected goal differential." value={settings.xg} model={1} min={0} max={3} step={0.1} format={times} onChange={(xg) => set({ xg })} />
        <SettingSlider label="Goal differential" hint="All goals, so finishing, goaltending and special teams." value={settings.goals} model={1} min={0} max={3} step={0.1} format={times} onChange={(goals) => set({ goals })} />
        <SettingSlider label="Roster" hint="Skaters' play over the last two seasons; matters most early on." value={settings.roster} model={1} min={0} max={3} step={0.1} format={times} onChange={(roster) => set({ roster })} />
        <SettingSlider label="Goaltending" hint="Goalies' career saves above expected, by starts." value={settings.goalie} model={1} min={0} max={5} step={0.1} format={times} onChange={(goalie) => set({ goalie })} />
      </Group>

      <Group title="Schedule">
        <SettingSlider label="Home ice" hint="Worth about 54% for evenly matched teams." value={settings.homeIce} model={1} min={0} max={3} step={0.1} format={times} onChange={(homeIce) => set({ homeIce })} />
        <SettingSlider label="Back-to-backs" hint="The edge for the rested team when only one played yesterday." value={settings.rest} model={1} min={0} max={3} step={0.1} format={times} onChange={(rest) => set({ rest })} />
      </Group>

      <Group title="Last season">
        <SettingSlider
          label="Carries over"
          hint="How much of last season's form a team starts with."
          value={settings.carryOver}
          model={model.carryOver}
          min={0}
          max={1}
          step={0.05}
          format={(v) => `${Math.round(v * 100)}%`}
          onChange={(carryOver) => set({ carryOver })}
        />
        <SettingSlider
          label="Counts as"
          hint="Games of this season it takes to outweigh last season."
          value={settings.priorGames}
          model={model.priorGames}
          min={1}
          max={100}
          step={1}
          format={(v) => `${v} games`}
          onChange={(priorGames) => set({ priorGames })}
        />
      </Group>

      <Group title="Uncertainty">
        <SettingSlider
          label="Surprises"
          hint="How far a team's true strength can be from its rating. More flattens the odds."
          value={settings.uncertainty}
          model={model.uncertainty}
          min={0}
          max={0.6}
          step={0.01}
          format={(v) => v.toFixed(2)}
          onChange={(uncertainty) => set({ uncertainty })}
        />
      </Group>

      <label className="flex items-start justify-between gap-4">
        <span>
          <span className="block text-sm font-semibold">Goalie injuries</span>
          <span className="block text-xs text-muted-foreground">
            Sit injured goalies until the earliest return ESPN gives and start their backups.
            {goaliesOut.length > 0 ? ` Changes ${goaliesOut.join(", ")}.` : " No goalies are out right now."}{" "}
            <Link to="/glossary" hash="Goalie injuries (sandbox)" className="text-link">How it works</Link>
          </span>
        </span>
        <Switch checked={settings.injuries} onCheckedChange={(injuries) => set({ injuries })} aria-label="Goalie injuries" />
      </label>
    </Panel>
  );
}
