"use client";

import { useId } from "react";
import { tileFor } from "@/lib/data/thumbs";
import type { Category, Thumb } from "@/lib/types";
import { cn } from "@/lib/utils";

type Shape = { body: string; neck: [number, number, number, number]; cap: [number, number, number, number]; label: [number, number, number, number]; liquidTop: number; can?: boolean };

const SHAPES: Record<Thumb["shape"], Shape> = {
  whiskey: { body: "M12 17Q12 12.5 17 12L23 12Q28 12.5 28 17L28 35.5Q28 37.5 26 37.5L14 37.5Q12 37.5 12 35.5Z", neck: [17.2, 5.5, 5.6, 7], cap: [16.4, 2.5, 7.2, 4], label: [13.4, 21.5, 13.2, 10], liquidTop: 18 },
  square: { body: "M11.5 15.5Q11.5 13.5 13.5 13.5L26.5 13.5Q28.5 13.5 28.5 15.5L28.5 36Q28.5 37.5 27 37.5L13 37.5Q11.5 37.5 11.5 36Z", neck: [17.4, 7, 5.2, 7], cap: [16.8, 3.5, 6.4, 4.2], label: [13, 19.5, 14, 11], liquidTop: 16 },
  slim: { body: "M14 16Q14 11.5 18 10.5L22 10.5Q26 11.5 26 16L26 36Q26 37.5 24.5 37.5L15.5 37.5Q14 37.5 14 36Z", neck: [18.2, 3.5, 3.6, 7.5], cap: [17.8, 1.5, 4.4, 3.2], label: [15, 20, 10, 11], liquidTop: 16 },
  gin: { body: "M12 16Q12 13 15 13L25 13Q28 13 28 16L28 35Q28 37.5 25.5 37.5L14.5 37.5Q12 37.5 12 35Z", neck: [17.5, 6.5, 5, 6.8], cap: [16.6, 3.5, 6.8, 3.8], label: [13.6, 20, 12.8, 10.5], liquidTop: 16 },
  squat: { body: "M10 21Q10 17 14 17L26 17Q30 17 30 21L30 34.5Q30 37.5 27 37.5L13 37.5Q10 37.5 10 34.5Z", neck: [17, 10.5, 6, 6.8], cap: [15.4, 6.5, 9.2, 4.5], label: [12, 23, 16, 9.5], liquidTop: 20 },
  round: { body: "M20 15.5C26 15.5 29.5 20 29.5 26.5C29.5 33 26 37.5 20 37.5C14 37.5 10.5 33 10.5 26.5C10.5 20 14 15.5 20 15.5Z", neck: [17.6, 8, 4.8, 8.5], cap: [17, 4.6, 6, 4], label: [12.6, 23.5, 14.8, 7.5], liquidTop: 19 },
  wine: { body: "M13.2 21Q13.2 15.5 18.2 14.3L21.8 14.3Q26.8 15.5 26.8 21L26.8 36.2Q26.8 37.6 25.4 37.6L14.6 37.6Q13.2 37.6 13.2 36.2Z", neck: [18.2, 3, 3.6, 11.8], cap: [17.9, 2, 4.2, 5.8], label: [14.4, 25, 11.2, 8.5], liquidTop: 17 },
  sparkling: { body: "M12.8 21.5Q12.8 15.8 18 14.4L22 14.4Q27.2 15.8 27.2 21.5L27.2 36.2Q27.2 37.6 25.8 37.6L14.2 37.6Q12.8 37.6 12.8 36.2Z", neck: [18, 3, 4, 11.8], cap: [17.4, 1.6, 5.2, 9.2], label: [14, 24.5, 12, 8.5], liquidTop: 17 },
  can: { body: "M12 8.5Q12 6.5 14 6.5L26 6.5Q28 6.5 28 8.5L28 35.5Q28 37.5 26 37.5L14 37.5Q12 37.5 12 35.5Z", neck: [13, 5, 14, 2], cap: [15, 4.2, 10, 1.4], label: [12, 15, 16, 13], liquidTop: 6.5, can: true },
};

const SIZE = { xs: "size-7 rounded-sm", sm: "size-9 rounded-10", md: "size-10 rounded-10", lg: "size-16 rounded-md", xl: "size-28 rounded-lg" } as const;

/** Illustrated bottle thumbnail — consistent silhouettes per category. */
export function ProductThumb({
  thumb,
  category,
  size = "md",
  className,
  alt,
  dimmed,
}: {
  thumb: Thumb;
  category: Category;
  size?: keyof typeof SIZE;
  className?: string;
  alt?: string;
  dimmed?: boolean;
}) {
  const uid = useId().replace(/:/g, "");
  const s = SHAPES[thumb.shape];
  const [nx, ny, nw, nh] = s.neck;
  const [cx, cy, cw, ch] = s.cap;
  const [lx, ly, lw, lh] = s.label;
  return (
    <span
      className={cn("relative inline-flex shrink-0 items-center justify-center overflow-hidden border border-stroke-soft", SIZE[size], dimmed && "opacity-50 grayscale", className)}
      style={{ background: tileFor(category) }}
    >
      <svg viewBox="0 0 40 40" className="size-full" role={alt ? "img" : undefined} aria-label={alt} aria-hidden={alt ? undefined : true}>
        <defs>
          <clipPath id={`b${uid}`}>
            <path d={s.body} />
          </clipPath>
          <linearGradient id={`g${uid}`} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#000" stopOpacity="0.18" />
            <stop offset="0.35" stopColor="#fff" stopOpacity="0.18" />
            <stop offset="0.55" stopColor="#fff" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity="0.22" />
          </linearGradient>
        </defs>
        <ellipse cx="20" cy="38.2" rx="9.5" ry="1.2" fill="#000" opacity="0.08" />
        {!s.can && <rect x={nx} y={ny} width={nw} height={nh + 1.5} rx="1" fill={thumb.glass} />}
        <path d={s.body} fill={thumb.glass} />
        {!s.can && (
          <g clipPath={`url(#b${uid})`}>
            <rect x="0" y={s.liquidTop} width="40" height="40" fill={thumb.liquid} opacity="0.88" />
          </g>
        )}
        <g clipPath={`url(#b${uid})`}>
          <rect x={lx} y={ly} width={lw} height={lh} rx={s.can ? 0 : 0.8} fill={thumb.label} />
          <rect x={lx} y={ly + lh * 0.62} width={lw} height={Math.max(1.2, lh * 0.14)} fill={thumb.accent} opacity="0.9" />
          <rect x={lx + lw * 0.22} y={ly + lh * 0.2} width={lw * 0.56} height={Math.max(1, lh * 0.16)} rx="0.5" fill={thumb.accent} opacity="0.75" />
          <rect x="0" y="0" width="40" height="40" fill={`url(#g${uid})`} />
        </g>
        {s.can ? (
          <>
            <rect x={nx} y={ny} width={nw} height={nh} rx="1" fill="#bdbdbd" />
            <rect x={cx} y={cy} width={cw} height={ch} rx="0.7" fill="#a3a3a3" />
          </>
        ) : (
          <rect x={cx} y={cy} width={cw} height={ch} rx="1" fill={thumb.accent} />
        )}
      </svg>
    </span>
  );
}
