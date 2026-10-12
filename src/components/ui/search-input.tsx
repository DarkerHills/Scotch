"use client";

import { Search, Xmark } from "iconoir-react";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { fieldBase, fieldBorder } from "@/components/ui/input";

export const SearchInput = forwardRef<
  HTMLInputElement,
  {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    className?: string;
    size?: "sm" | "md";
    "aria-label"?: string;
    autoFocus?: boolean;
  }
>(function SearchInput({ value, onChange, placeholder = "Search…", className, size = "sm", "aria-label": ariaLabel, autoFocus }, ref) {
  return (
    <div className={cn("relative flex items-center", className)}>
      <Search className="pointer-events-none absolute left-3 size-4 text-text-soft" />
      <input
        ref={ref}
        type="search"
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape" && value) {
            e.stopPropagation();
            onChange("");
          }
        }}
        placeholder={placeholder}
        aria-label={ariaLabel ?? placeholder}
        className={cn(
          fieldBase,
          fieldBorder(false),
          size === "md" ? "h-10" : "h-9",
          "pl-9 pr-8 [&::-webkit-search-cancel-button]:hidden",
        )}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="absolute right-2 inline-flex size-5 cursor-pointer items-center justify-center rounded-full text-text-soft hover:bg-bg-soft hover:text-text-strong"
        >
          <Xmark className="size-3.5" strokeWidth={2} />
        </button>
      )}
    </div>
  );
});
