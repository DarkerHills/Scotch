import { cn } from "@/lib/utils";

/** Scotch logomark: a tumbler in a rounded tile, plus the lowercase wordmark. */
export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <svg viewBox="0 0 32 32" className="size-8 shrink-0" aria-hidden>
        <defs>
          <linearGradient id="scotch-tile" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#3ee089" />
            <stop offset="1" stopColor="#1daf61" />
          </linearGradient>
        </defs>
        <rect width="32" height="32" rx="9" fill="url(#scotch-tile)" />
        <path d="M9.5 9.5h13l-1.6 12.2a2.4 2.4 0 0 1-2.4 2.1h-5a2.4 2.4 0 0 1-2.4-2.1L9.5 9.5Z" fill="#fff" fillOpacity="0.95" />
        <path d="M10.5 15h11l-.9 6.6a1.6 1.6 0 0 1-1.6 1.4h-6a1.6 1.6 0 0 1-1.6-1.4L10.5 15Z" fill="#0b4627" fillOpacity="0.9" />
        <rect x="13.2" y="16.6" width="4" height="4" rx="1" fill="#fff" fillOpacity="0.55" transform="rotate(12 15.2 18.6)" />
      </svg>
      {!compact && (
        <span className="leading-none">
          <span className="block text-[19px] font-semibold tracking-[-0.03em] text-white">scotch</span>
          <span className="mt-1 block text-2xs tracking-[0.02em] text-white/55">Retail operations</span>
        </span>
      )}
    </span>
  );
}
