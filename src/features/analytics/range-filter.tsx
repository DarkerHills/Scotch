"use client";

import { Calendar } from "iconoir-react";
import { useMemo, useState } from "react";
import type { DateRange } from "@/lib/analytics";
import type { SalesHistory } from "@/lib/data/history";
import { fdate } from "@/lib/format";
import { useQueryState } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/menu";

/** Reads the shared analytics date range from the URL. */
export function useRange(): DateRange {
  const q = useQueryState();
  const r = q.get("range");
  const from = q.get("from");
  const to = q.get("to");
  return useMemo<DateRange>(() => {
    if (r === "custom" && from && to) return { kind: "custom", from, to };
    const days = Number(r);
    return { kind: "preset", days: days === 7 || days === 90 ? days : 30 };
  }, [r, from, to]);
}

/**
 * Date range control: presets first (7 / 30 / 90 days), custom range behind
 * a popover. Scopes every metric and chart below it.
 */
export function RangeFilter({ history }: { history: SalesHistory }) {
  const q = useQueryState();
  const range = useRange();
  const [open, setOpen] = useState(false);
  const min = history.dates[90];
  const max = history.dates[history.dates.length - 1];
  const [from, setFrom] = useState(range.kind === "custom" ? range.from : history.dates[history.dates.length - 14]);
  const [to, setTo] = useState(range.kind === "custom" ? range.to : max);
  const err = !from || !to ? "Choose both dates" : from > to ? "Start must be before end" : from < min ? `Earliest available is ${fdate.medium(`${min}T12:00:00`)}` : to > max ? "End can't be in the future" : null;

  const presets: { v: 7 | 30 | 90; l: string }[] = [
    { v: 7, l: "7 days" },
    { v: 30, l: "30 days" },
    { v: 90, l: "90 days" },
  ];
  const active = range.kind === "preset" ? range.days : "custom";

  return (
    <div className="inline-flex items-center gap-0.5 rounded-10 bg-bg-soft p-0.5 ring-1 ring-inset ring-stroke-soft" role="group" aria-label="Date range">
      {presets.map((p) => (
        <button
          key={p.v}
          type="button"
          aria-pressed={active === p.v}
          onClick={() => q.set({ range: p.v === 30 ? null : p.v, from: null, to: null })}
          className={cn(
            "inline-flex h-8 cursor-pointer items-center rounded-sm px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-base/30",
            active === p.v ? "bg-bg-default text-text-strong shadow-[0_1px_2px_#0000000f,0_1px_3px_#0000000a]" : "text-text-sub hover:text-text-strong",
          )}
        >
          {p.l}
        </button>
      ))}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-pressed={active === "custom"}
            className={cn(
              "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-sm px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-base/30",
              active === "custom" ? "bg-bg-default text-text-strong shadow-[0_1px_2px_#0000000f,0_1px_3px_#0000000a]" : "text-text-sub hover:text-text-strong",
            )}
          >
            <Calendar className="size-4" />
            {range.kind === "custom" ? `${fdate.short(`${range.from}T12:00:00`)} – ${fdate.short(`${range.to}T12:00:00`)}` : "Custom"}
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-[300px] p-4">
          <p className="mb-3 text-sm font-medium text-text-strong">Custom range</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="From">{(f) => <Input id={f.id} type="date" size="sm" min={min} max={max} value={from} onChange={(e) => setFrom(e.target.value)} invalid={!!err} />}</Field>
            <Field label="To">{(f) => <Input id={f.id} type="date" size="sm" min={min} max={max} value={to} onChange={(e) => setTo(e.target.value)} invalid={!!err} />}</Field>
          </div>
          {err && (
            <p role="alert" className="mt-2 text-xs text-error-dark">
              {err}
            </p>
          )}
          <div className="mt-4 flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant="primary"
              disabled={!!err}
              onClick={() => {
                q.set({ range: "custom", from, to });
                setOpen(false);
              }}
            >
              Apply range
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
