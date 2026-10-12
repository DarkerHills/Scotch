"use client";

import { Minus, Plus } from "iconoir-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Numeric stepper. Keeps a local text buffer so users can clear and retype;
 * commits integers via onChange and reports invalid entries via `invalid`.
 */
export function QuantityInput({
  value,
  onChange,
  min = 0,
  max = 99999,
  step = 1,
  invalid,
  size = "md",
  id,
  className,
  disabled,
  "aria-label": ariaLabel,
  "aria-describedby": describedBy,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  invalid?: boolean;
  size?: "sm" | "md";
  id?: string;
  className?: string;
  disabled?: boolean;
  "aria-label"?: string;
  "aria-describedby"?: string;
}) {
  const [text, setText] = useState(Number.isNaN(value) ? "" : String(value));
  const [synced, setSynced] = useState(value);
  // Keep the text buffer in step with external value changes (derived state, no effect).
  if (!Object.is(value, synced)) {
    setSynced(value);
    const next = Number.isNaN(value) ? "" : String(value);
    if (Number(text) !== value || next === "") setText(next);
  }

  const commit = (raw: string) => {
    setText(raw);
    if (raw.trim() === "") {
      onChange(Number.NaN);
      return;
    }
    const n = Number(raw);
    onChange(Number.isFinite(n) ? n : Number.NaN);
  };
  const bump = (dir: 1 | -1) => {
    const base = Number.isFinite(value) ? value : 0;
    const next = Math.min(max, Math.max(min, base + dir * step));
    onChange(next);
  };
  const h = size === "md" ? "h-9" : "h-8";
  const bad = invalid || (Number.isFinite(value) ? value < min || value > max || !Number.isInteger(value) : true);

  return (
    <div
      className={cn(
        "inline-flex items-stretch overflow-hidden rounded-10 border bg-bg-default shadow-xs transition-[border-color,box-shadow] focus-within:ring-[3px]",
        bad ? "border-error-base focus-within:ring-error-base/15" : "border-stroke-mid focus-within:border-primary-base focus-within:ring-primary-base/12",
        disabled && "opacity-50",
        h,
        className,
      )}
    >
      <button
        type="button"
        tabIndex={-1}
        aria-label="Decrease"
        disabled={disabled || (Number.isFinite(value) && value <= min)}
        onClick={() => bump(-1)}
        className="inline-flex w-8 shrink-0 cursor-pointer items-center justify-center text-text-sub hover:bg-bg-soft disabled:cursor-not-allowed disabled:text-text-disabled"
      >
        <Minus className="size-3.5" strokeWidth={2} />
      </button>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        value={text}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-describedby={describedBy}
        aria-invalid={bad || undefined}
        onChange={(e) => commit(e.target.value)}
        onBlur={() => {
          if (text.trim() === "" || !Number.isFinite(Number(text))) return;
          setText(String(Number(text)));
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowUp") {
            e.preventDefault();
            bump(1);
          } else if (e.key === "ArrowDown") {
            e.preventDefault();
            bump(-1);
          }
        }}
        className="w-14 min-w-0 flex-1 border-x border-stroke-soft bg-transparent text-center text-sm font-medium text-text-strong outline-none tnum"
      />
      <button
        type="button"
        tabIndex={-1}
        aria-label="Increase"
        disabled={disabled || (Number.isFinite(value) && value >= max)}
        onClick={() => bump(1)}
        className="inline-flex w-8 shrink-0 cursor-pointer items-center justify-center text-text-sub hover:bg-bg-soft disabled:cursor-not-allowed disabled:text-text-disabled"
      >
        <Plus className="size-3.5" strokeWidth={2} />
      </button>
    </div>
  );
}
