"use client";

import { Check, NavArrowDown } from "iconoir-react";
import { Select as RS } from "radix-ui";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { fieldBase, fieldBorder } from "@/components/ui/input";

export interface SelectOption {
  value: string;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
}

/** Accessible select (Radix) styled as a KernUI input. */
export function Select({
  value,
  onValueChange,
  options,
  placeholder = "Select…",
  invalid,
  id,
  size = "md",
  className,
  disabled,
  "aria-label": ariaLabel,
  "aria-describedby": describedBy,
}: {
  value: string | undefined;
  onValueChange: (v: string) => void;
  options: SelectOption[];
  placeholder?: string;
  invalid?: boolean;
  id?: string;
  size?: "sm" | "md";
  className?: string;
  disabled?: boolean;
  "aria-label"?: string;
  "aria-describedby"?: string;
}) {
  return (
    <RS.Root value={value ?? ""} onValueChange={onValueChange} disabled={disabled}>
      <RS.Trigger
        id={id}
        aria-label={ariaLabel}
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
        className={cn(
          fieldBase,
          fieldBorder(invalid),
          "inline-flex cursor-pointer items-center justify-between gap-2 px-3 text-left data-[placeholder]:text-text-soft",
          size === "md" ? "h-10" : "h-9",
          className,
        )}
      >
        <span className="truncate">
          <RS.Value placeholder={placeholder} />
        </span>
        <RS.Icon>
          <NavArrowDown className="size-4 shrink-0 text-text-soft" />
        </RS.Icon>
      </RS.Trigger>
      <RS.Portal>
        <RS.Content
          position="popper"
          sideOffset={6}
          className="z-[70] max-h-[min(360px,var(--radix-select-content-available-height))] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg border border-stroke-soft bg-bg-default p-1.5 shadow-lg animate-pop-in"
        >
          <RS.Viewport className="scrollbar-thin">
            {options.map((o) => (
              <RS.Item
                key={o.value}
                value={o.value}
                disabled={o.disabled}
                className="relative flex cursor-pointer select-none items-center gap-2 rounded-sm py-2 pl-2.5 pr-8 text-sm text-text-strong outline-none data-[disabled]:cursor-not-allowed data-[highlighted]:bg-bg-soft data-[disabled]:text-text-soft"
              >
                <div className="min-w-0">
                  <RS.ItemText>{o.label}</RS.ItemText>
                  {o.description && <div className="mt-0.5 text-xs text-text-sub">{o.description}</div>}
                </div>
                <RS.ItemIndicator className="absolute right-2.5">
                  <Check className="size-4 text-primary-base" strokeWidth={2} />
                </RS.ItemIndicator>
              </RS.Item>
            ))}
          </RS.Viewport>
        </RS.Content>
      </RS.Portal>
    </RS.Root>
  );
}
