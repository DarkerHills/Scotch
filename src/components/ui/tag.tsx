import { Xmark } from "iconoir-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** KernUI Tag — white chip, 5% stroke, radius-sm, soft drop shadow, text-sub 12/16. */
export function Tag({
  children,
  icon,
  dotColor,
  onRemove,
  removeLabel,
  className,
}: {
  children: ReactNode;
  icon?: ReactNode;
  dotColor?: string;
  onRemove?: () => void;
  removeLabel?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 max-w-full items-center gap-1 rounded-sm border border-stroke-soft bg-bg-default px-2 text-xs text-text-sub shadow-tag",
        onRemove && "pr-1",
        className,
      )}
    >
      {dotColor && <span aria-hidden className="mr-1 size-1.5 shrink-0 rounded-full" style={{ background: dotColor }} />}
      {icon && <span className="inline-flex shrink-0 [&_svg]:size-3.5">{icon}</span>}
      <span className="truncate">{children}</span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={removeLabel ?? "Remove"}
          className="ml-0.5 inline-flex size-4 cursor-pointer items-center justify-center rounded-xs text-text-soft hover:bg-bg-soft hover:text-text-strong focus-visible:outline-2"
        >
          <Xmark className="size-3.5" strokeWidth={2} />
        </button>
      )}
    </span>
  );
}
