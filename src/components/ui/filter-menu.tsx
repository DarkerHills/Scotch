"use client";

import { Check, NavArrowDown } from "iconoir-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/menu";

export interface FilterOption {
  value: string;
  label: string;
  count?: number;
  hint?: string;
}

/**
 * Multi-select filter button with an inline search for long lists.
 * Shows the active selection in the trigger so users always see what's applied.
 */
export function FilterMenu({
  label,
  options,
  selected,
  onChange,
  searchable,
  single,
}: {
  label: string;
  options: FilterOption[];
  selected: string[];
  onChange: (v: string[]) => void;
  searchable?: boolean;
  single?: boolean;
}) {
  const [q, setQ] = useState("");
  const shown = useMemo(() => options.filter((o) => o.label.toLowerCase().includes(q.toLowerCase())), [options, q]);
  const active = selected.length > 0;
  const summary = !active
    ? null
    : selected.length === 1
      ? (options.find((o) => o.value === selected[0])?.label ?? selected[0])
      : `${selected.length} selected`;

  return (
    <Popover onOpenChange={(o) => !o && setQ("")}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex h-9 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-10 border px-3 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary-base/25",
            active ? "border-primary-base/30 bg-primary-mute/60 text-primary-base" : "border-stroke-mid bg-bg-default text-text-sub hover:text-text-strong hover:border-stroke-strong/70",
          )}
        >
          <span className={cn(active && "text-primary-base/80")}>{label}</span>
          {summary && <span className="max-w-[140px] truncate font-medium text-primary-base">· {summary}</span>}
          <NavArrowDown className="size-4 opacity-70" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[260px]">
        {searchable && (
          <div className="border-b border-stroke-soft p-2">
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={`Search ${label.toLowerCase()}…`}
              aria-label={`Search ${label}`}
              className="h-8 w-full rounded-sm bg-bg-soft px-2.5 text-sm outline-none placeholder:text-text-soft focus:ring-2 focus:ring-primary-base/20"
            />
          </div>
        )}
        <div role="listbox" aria-multiselectable={!single} aria-label={label} className="max-h-[280px] overflow-y-auto p-1.5 scrollbar-thin">
          {shown.length === 0 && <p className="px-2.5 py-3 text-sm text-text-soft">No matches</p>}
          {shown.map((o) => {
            const on = selected.includes(o.value);
            return (
              <button
                key={o.value}
                type="button"
                role="option"
                aria-selected={on}
                onClick={() => onChange(single ? (on ? [] : [o.value]) : on ? selected.filter((s) => s !== o.value) : [...selected, o.value])}
                className="flex w-full cursor-pointer items-center gap-2.5 rounded-sm px-2.5 py-2 text-left text-sm text-text-strong hover:bg-bg-soft focus-visible:bg-bg-soft focus-visible:outline-none"
              >
                <span
                  className={cn(
                    "inline-flex size-4 shrink-0 items-center justify-center border",
                    single ? "rounded-full" : "rounded-[4px]",
                    on ? "border-primary-base bg-primary-base text-white" : "border-stroke-strong/70",
                  )}
                >
                  {on && <Check className="size-3" strokeWidth={2.5} />}
                </span>
                <span className="min-w-0 flex-1 truncate">{o.label}</span>
                {o.count !== undefined && <span className="text-xs text-text-soft tnum">{o.count}</span>}
              </button>
            );
          })}
        </div>
        {active && (
          <div className="border-t border-stroke-soft p-1.5">
            <button
              type="button"
              onClick={() => onChange([])}
              className="w-full cursor-pointer rounded-sm px-2.5 py-1.5 text-left text-sm text-text-sub hover:bg-bg-soft hover:text-text-strong"
            >
              Clear {label.toLowerCase()}
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
