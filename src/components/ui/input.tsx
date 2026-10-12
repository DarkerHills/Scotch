"use client";

import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";
import { WarningCircle } from "iconoir-react";
import { cn } from "@/lib/utils";

export const fieldBase =
  "w-full rounded-10 border bg-bg-default text-sm text-text-strong shadow-xs outline-none transition-[border-color,box-shadow] placeholder:text-text-soft " +
  "hover:border-stroke-strong/80 focus:border-primary-base focus:ring-[3px] focus:ring-primary-base/12 " +
  "disabled:cursor-not-allowed disabled:bg-bg-surface disabled:text-text-soft";

export const fieldBorder = (invalid?: boolean) =>
  invalid ? "border-error-base hover:border-error-base focus:border-error-base focus:ring-error-base/15" : "border-stroke-mid";

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size" | "prefix"> {
  invalid?: boolean;
  leading?: ReactNode;
  trailing?: ReactNode;
  size?: "sm" | "md";
  containerClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { invalid, leading, trailing, size = "md", className, containerClassName, ...props },
  ref,
) {
  return (
    <div className={cn("relative flex items-center", containerClassName)}>
      {leading && (
        <span className="pointer-events-none absolute left-3 inline-flex items-center text-sm text-text-soft [&_svg]:size-[18px]">{leading}</span>
      )}
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          fieldBase,
          fieldBorder(invalid),
          size === "md" ? "h-10 px-3" : "h-9 px-3",
          leading && "pl-9",
          trailing && "pr-10",
          className,
        )}
        {...props}
      />
      {trailing && <span className="absolute right-2 inline-flex items-center text-sm text-text-soft">{trailing}</span>}
    </div>
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }>(
  function Textarea({ invalid, className, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(fieldBase, fieldBorder(invalid), "min-h-[84px] resize-y px-3 py-2.5 leading-5", className)}
        {...props}
      />
    );
  },
);

export function Label({ htmlFor, children, optional, className }: { htmlFor?: string; children: ReactNode; optional?: boolean; className?: string }) {
  return (
    <label htmlFor={htmlFor} className={cn("mb-1.5 flex items-center gap-1 text-sm font-medium text-text-strong", className)}>
      {children}
      {optional && <span className="font-normal text-text-soft">(optional)</span>}
    </label>
  );
}

/**
 * Form field wrapper: label, control, hint and inline error. The render prop
 * receives ids so the control can wire aria-describedby / aria-invalid.
 */
export function Field({
  label,
  hint,
  error,
  optional,
  className,
  children,
}: {
  label?: ReactNode;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  className?: string;
  children: (ids: { id: string; describedBy?: string; invalid: boolean }) => ReactNode;
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errId = `${id}-err`;
  const describedBy = [error ? errId : null, hint ? hintId : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className={className}>
      {label && (
        <Label htmlFor={id} optional={optional}>
          {label}
        </Label>
      )}
      {children({ id, describedBy, invalid: !!error })}
      {error ? (
        <p id={errId} role="alert" className="mt-1.5 flex items-center gap-1 text-xs text-error-dark">
          <WarningCircle className="size-3.5 shrink-0 text-error-base" />
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="mt-1.5 text-xs text-text-sub">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
