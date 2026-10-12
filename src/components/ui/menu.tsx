"use client";

import { Check } from "iconoir-react";
import { DropdownMenu as DM, Popover as PO, Tooltip as TT } from "radix-ui";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const menuPanel =
  "z-[60] min-w-[200px] overflow-hidden rounded-lg border border-stroke-soft bg-bg-default p-1.5 shadow-lg animate-pop-in focus:outline-none";

export const Menu = DM.Root;
export const MenuTrigger = DM.Trigger;

export function MenuContent({ children, align = "end", className, sideOffset = 6 }: { children: ReactNode; align?: "start" | "end" | "center"; className?: string; sideOffset?: number }) {
  return (
    <DM.Portal>
      <DM.Content align={align} sideOffset={sideOffset} className={cn(menuPanel, className)} onClick={(e) => e.stopPropagation()}>
        {children}
      </DM.Content>
    </DM.Portal>
  );
}

export function MenuItem({
  children,
  icon,
  onSelect,
  danger,
  disabled,
  shortcut,
}: {
  children: ReactNode;
  icon?: ReactNode;
  onSelect?: () => void;
  danger?: boolean;
  disabled?: boolean;
  shortcut?: string;
}) {
  return (
    <DM.Item
      disabled={disabled}
      onSelect={onSelect}
      className={cn(
        "flex cursor-pointer select-none items-center gap-2.5 rounded-sm px-2.5 py-2 text-sm outline-none data-[disabled]:cursor-not-allowed data-[disabled]:text-text-disabled",
        danger ? "text-error-dark data-[highlighted]:bg-error-mute" : "text-text-strong data-[highlighted]:bg-bg-soft",
      )}
    >
      {icon && <span className={cn("inline-flex [&_svg]:size-[18px]", danger ? "text-error-base" : "text-text-sub")}>{icon}</span>}
      <span className="flex-1">{children}</span>
      {shortcut && <span className="text-xs text-text-soft">{shortcut}</span>}
    </DM.Item>
  );
}

export function MenuCheckboxItem({ children, checked, onCheckedChange }: { children: ReactNode; checked: boolean; onCheckedChange: (v: boolean) => void }) {
  return (
    <DM.CheckboxItem
      checked={checked}
      onCheckedChange={onCheckedChange}
      onSelect={(e) => e.preventDefault()}
      className="flex cursor-pointer select-none items-center gap-2.5 rounded-sm px-2.5 py-2 text-sm text-text-strong outline-none data-[highlighted]:bg-bg-soft"
    >
      <span className={cn("inline-flex size-4 items-center justify-center rounded-[4px] border", checked ? "border-primary-base bg-primary-base text-white" : "border-stroke-strong/70")}>
        <DM.ItemIndicator>
          <Check className="size-3" strokeWidth={2.5} />
        </DM.ItemIndicator>
      </span>
      {children}
    </DM.CheckboxItem>
  );
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return <DM.Label className="px-2.5 pb-1 pt-2 text-2xs font-medium uppercase tracking-[0.06em] text-text-soft">{children}</DM.Label>;
}

export function MenuSeparator() {
  return <DM.Separator className="-mx-1.5 my-1.5 h-px bg-bg-subtle" />;
}

/* ── Popover ─────────────────────────────────────────────── */

export const Popover = PO.Root;
export const PopoverTrigger = PO.Trigger;
export const PopoverClose = PO.Close;
export const PopoverAnchor = PO.Anchor;

export function PopoverContent({ children, align = "start", className, sideOffset = 6 }: { children: ReactNode; align?: "start" | "end" | "center"; className?: string; sideOffset?: number }) {
  return (
    <PO.Portal>
      <PO.Content align={align} sideOffset={sideOffset} collisionPadding={12} className={cn(menuPanel, "p-0", className)}>
        {children}
      </PO.Content>
    </PO.Portal>
  );
}

/* ── Tooltip ─────────────────────────────────────────────── */

export function Tooltip({ content, children, side = "top" }: { content: ReactNode; children: ReactNode; side?: "top" | "bottom" | "left" | "right" }) {
  return (
    <TT.Root delayDuration={250}>
      <TT.Trigger asChild>{children}</TT.Trigger>
      <TT.Portal>
        <TT.Content
          side={side}
          sideOffset={6}
          className="z-[80] max-w-[260px] rounded-sm bg-bg-strong px-2.5 py-1.5 text-xs leading-4 text-white shadow-md animate-fade-in"
        >
          {content}
          <TT.Arrow className="fill-bg-strong" width={10} height={5} />
        </TT.Content>
      </TT.Portal>
    </TT.Root>
  );
}

export const TooltipProvider = TT.Provider;
