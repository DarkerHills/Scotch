"use client";

import { Check, Minus } from "iconoir-react";
import { Checkbox as RC, Switch as RSw } from "radix-ui";
import { cn } from "@/lib/utils";

export function Checkbox({
  checked,
  onCheckedChange,
  disabled,
  className,
  id,
  "aria-label": ariaLabel,
}: {
  checked: boolean | "indeterminate";
  onCheckedChange: (v: boolean) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
  "aria-label"?: string;
}) {
  return (
    <RC.Root
      id={id}
      checked={checked}
      onCheckedChange={(v) => onCheckedChange(v === true)}
      disabled={disabled}
      aria-label={ariaLabel}
      onClick={(e) => e.stopPropagation()}
      className={cn(
        "peer inline-flex size-[18px] shrink-0 cursor-pointer items-center justify-center rounded-[5px] border border-stroke-strong/70 bg-bg-default shadow-xs transition-colors",
        "hover:border-primary-base/60 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary-base/25",
        "data-[state=checked]:border-primary-base data-[state=checked]:bg-primary-base data-[state=indeterminate]:border-primary-base data-[state=indeterminate]:bg-primary-base",
        "disabled:cursor-not-allowed disabled:opacity-40",
        className,
      )}
    >
      <RC.Indicator className="text-white">
        {checked === "indeterminate" ? <Minus className="size-3.5" strokeWidth={2.5} /> : <Check className="size-3.5" strokeWidth={2.5} />}
      </RC.Indicator>
    </RC.Root>
  );
}

export function Switch({
  checked,
  onCheckedChange,
  disabled,
  id,
  size = "md",
  "aria-label": ariaLabel,
  "aria-describedby": describedBy,
}: {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  disabled?: boolean;
  id?: string;
  size?: "sm" | "md";
  "aria-label"?: string;
  "aria-describedby"?: string;
}) {
  return (
    <RSw.Root
      id={id}
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-describedby={describedBy}
      onClick={(e) => e.stopPropagation()}
      className={cn(
        "relative inline-flex shrink-0 cursor-pointer items-center rounded-full bg-bg-muted p-0.5 transition-colors",
        "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary-base/25",
        "data-[state=checked]:bg-primary-base disabled:cursor-not-allowed disabled:opacity-40",
        size === "md" ? "h-5 w-9" : "h-4 w-7",
      )}
    >
      <RSw.Thumb
        className={cn(
          "block rounded-full bg-white shadow-[0_1px_2px_#0000002e,0_2px_4px_#0000000f] transition-transform duration-200 ease-out-quint",
          size === "md" ? "size-4 data-[state=checked]:translate-x-4" : "size-3 data-[state=checked]:translate-x-3",
        )}
      />
    </RSw.Root>
  );
}
