"use client";

import { Table2Columns, StatsUpSquare } from "iconoir-react";
import { useState, type ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fdate, fmt } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Chart primitives following the data-viz method: 2px lines, ~10% area wash,
 * ≤24px bars with 4px rounded data-ends, hairline solid grid, crosshair
 * tooltips with values leading, a legend for ≥2 series, and a table twin.
 * Series colors come from validated --color-series-* tokens.
 */
export const SERIES = {
  1: "var(--color-series-1)",
  2: "var(--color-series-2)",
  3: "var(--color-series-3)",
  4: "var(--color-series-4)",
  muted: "var(--color-series-muted)",
} as const;

const AXIS = { fontSize: 11, fill: "var(--color-chart-axis)" };

export interface SeriesDef {
  key: string;
  label: string;
  color: string;
  kind?: "line" | "area" | "bar";
  dashed?: boolean;
}

export function Legend({ series, className }: { series: SeriesDef[]; className?: string }) {
  return (
    <ul className={cn("flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-sub", className)}>
      {series.map((s) => (
        <li key={s.key} className="flex items-center gap-1.5">
          {s.kind === "line" ? (
            <span aria-hidden className="h-0.5 w-3.5 rounded-full" style={{ background: s.color }} />
          ) : (
            <span aria-hidden className="size-2.5 rounded-[3px]" style={{ background: s.color }} />
          )}
          {s.label}
        </li>
      ))}
    </ul>
  );
}

function TooltipCard({
  active,
  payload,
  label,
  series,
  format,
  labelFormat,
}: {
  active?: boolean;
  payload?: readonly { dataKey?: unknown; value?: unknown }[];
  label?: unknown;
  series: SeriesDef[];
  format: (n: number) => string;
  labelFormat: (l: string) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="min-w-[168px] rounded-md border border-stroke-soft bg-bg-default px-3 py-2.5 shadow-lg">
      <p className="mb-1.5 text-xs text-text-sub">{labelFormat(String(label))}</p>
      <ul className="space-y-1">
        {series.map((s) => {
          const item = payload.find((p) => p.dataKey === s.key);
          if (!item) return null;
          return (
            <li key={s.key} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-xs text-text-sub">
                <span aria-hidden className="h-0.5 w-3 rounded-full" style={{ background: s.color }} />
                {s.label}
              </span>
              <span className="text-sm font-medium text-text-strong tnum">{format(Number(item.value))}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function tickDate(days: number) {
  return (v: string) => {
    const d = new Date(`${v}T12:00:00`);
    if (days <= 14) return d.toLocaleDateString("en-US", { weekday: "short" });
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };
}

/** Clean axis ticks (0 / 1,000 / 2,000 …) from the data's max. */
export function niceTicks(max: number, count = 4) {
  if (!Number.isFinite(max) || max <= 0) return [0, 1];
  const raw = max / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? 10 * mag;
  const top = Math.ceil(max / step) * step;
  return Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
}

/** Time series: areas/lines on ONE shared $ axis (never dual-axis). */
export function TimeSeriesChart({
  data,
  series,
  height = 260,
  format = fmt.moneyCompact,
  tooltipFormat = fmt.money0,
  stacked,
  dimmed,
}: {
  data: Record<string, number | string>[];
  series: SeriesDef[];
  height?: number;
  format?: (n: number) => string;
  tooltipFormat?: (n: number) => string;
  stacked?: boolean;
  dimmed?: boolean;
}) {
  const interval = data.length > 60 ? Math.ceil(data.length / 8) : data.length > 20 ? Math.ceil(data.length / 7) : 0;
  const anyBar = series.some((s) => s.kind === "bar");
  const max = Math.max(
    0,
    ...data.map((d) => (stacked ? series.reduce((sum, s) => sum + Number(d[s.key] ?? 0), 0) : Math.max(...series.map((s) => Number(d[s.key] ?? 0))))),
  );
  const ticks = niceTicks(max);
  const tooltip = (
    <Tooltip
      cursor={anyBar ? { fill: "var(--color-bg-soft)" } : { stroke: "var(--color-stroke-strong)", strokeWidth: 1 }}
      content={(p) => <TooltipCard {...p} series={series} format={tooltipFormat} labelFormat={(l) => fdate.weekday(`${l}T12:00:00`)} />}
    />
  );
  const axes = (
    <>
      <CartesianGrid vertical={false} stroke="var(--color-chart-grid)" strokeWidth={1} />
      <XAxis dataKey="date" tickLine={false} axisLine={false} tick={AXIS} tickFormatter={tickDate(data.length)} interval={interval} tickMargin={8} minTickGap={12} />
      <YAxis tickLine={false} axisLine={false} tick={AXIS} tickFormatter={(v: number) => format(v)} width={56} ticks={ticks} domain={[0, ticks[ticks.length - 1]]} />
    </>
  );
  return (
    <div className={cn("transition-opacity", dimmed && "opacity-40")} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        {anyBar ? (
          <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }} barCategoryGap="22%">
            {axes}
            {tooltip}
            {series.map((s, i) => (
              <Bar
                key={s.key}
                dataKey={s.key}
                stackId={stacked ? "a" : undefined}
                fill={s.color}
                maxBarSize={24}
                stroke="var(--color-bg-default)"
                strokeWidth={stacked ? 1 : 0}
                radius={stacked ? (i === series.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]) : [4, 4, 0, 0]}
                isAnimationActive={false}
              />
            ))}
          </BarChart>
        ) : (
          <AreaChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
            {axes}
            {tooltip}
            {series.map((s) =>
              s.kind === "line" ? (
                <Line
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  stroke={s.color}
                  strokeWidth={2}
                  strokeDasharray={s.dashed ? "4 4" : undefined}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--color-bg-default)" }}
                  isAnimationActive={false}
                />
              ) : (
                <Area
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  stroke={s.color}
                  strokeWidth={2}
                  fill={s.color}
                  fillOpacity={0.1}
                  stackId={stacked ? "a" : undefined}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--color-bg-default)" }}
                  isAnimationActive={false}
                />
              ),
            )}
          </AreaChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

/** Tiny trend line for stat tiles. */
export function Sparkline({ data, dataKey = "v", color = SERIES[1], height = 36 }: { data: Record<string, number>[]; dataKey?: string; color?: string; height?: number }) {
  return (
    <div style={{ height }} aria-hidden>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
          <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={1.75} fill={color} fillOpacity={0.1} dot={false} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Single-series horizontal bar list (nominal categories → one hue, values at the tip). */
export function BarList({
  items,
  format = fmt.money0,
  color = SERIES[1],
  onSelect,
}: {
  items: { key: string; label: ReactNode; value: number; hint?: string }[];
  format?: (n: number) => string;
  color?: string;
  onSelect?: (key: string) => void;
}) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <ul className="space-y-2.5">
      {items.map((it) => {
        const pct = (it.value / max) * 100;
        const inner = (
          <>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate text-text-strong">{it.label}</span>
              <span className="shrink-0 font-medium text-text-strong tnum">
                {format(it.value)}
                {it.hint && <span className="ml-1.5 text-xs font-normal text-text-sub">{it.hint}</span>}
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-bg-soft">
              <div className="h-2 rounded-full transition-[width] duration-500 ease-out-quint" style={{ width: `${Math.max(pct, 1.5)}%`, background: color }} />
            </div>
          </>
        );
        return (
          <li key={it.key}>
            {onSelect ? (
              <button type="button" onClick={() => onSelect(it.key)} className="block w-full cursor-pointer rounded-sm text-left hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-base/30">
                {inner}
              </button>
            ) : (
              inner
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** Chart/Table toggle so every chart has an accessible table twin. */
export function ChartFrame({
  chart,
  table,
  legend,
  className,
}: {
  chart: ReactNode;
  table: { columns: string[]; rows: (string | number)[][] };
  legend?: ReactNode;
  className?: string;
}) {
  const [view, setView] = useState<"chart" | "table">("chart");
  return (
    <div className={className}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0">{legend}</div>
        <div className="inline-flex shrink-0 rounded-sm bg-bg-soft p-0.5" role="group" aria-label="Display as">
          {(["chart", "table"] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              aria-label={v === "chart" ? "Show chart" : "Show table"}
              onClick={() => setView(v)}
              className={cn(
                "inline-flex size-6 cursor-pointer items-center justify-center rounded-xs text-text-sub",
                view === v && "bg-bg-default text-text-strong shadow-[0_1px_2px_#0000000f]",
              )}
            >
              {v === "chart" ? <StatsUpSquare className="size-3.5" /> : <Table2Columns className="size-3.5" />}
            </button>
          ))}
        </div>
      </div>
      {view === "chart" ? (
        chart
      ) : (
        <div className="max-h-[300px] overflow-auto rounded-md border border-stroke-soft scrollbar-thin">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-bg-surface">
              <tr>
                {table.columns.map((c, i) => (
                  <th key={c} scope="col" className={cn("px-3 py-2 text-left text-xs font-medium text-text-sub", i > 0 && "text-right")}>
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((r, i) => (
                <tr key={i} className="border-t border-stroke-soft">
                  {r.map((cell, j) => (
                    <td key={j} className={cn("px-3 py-1.5 text-text-strong", j > 0 && "text-right tnum")}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
