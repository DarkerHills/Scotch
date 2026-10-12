import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: ["2xs", "xs", "sm", "base", "lg", "xl", "2xl", "3xl", "4xl"] }],
      shadow: [{ shadow: ["xs", "tag", "sm", "md", "lg", "xl", "button", "button-primary"] }],
      rounded: [{ rounded: ["xs", "sm", "10", "md", "lg", "xl", "xxl"] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Deterministic PRNG (mulberry32) so seeded demo data is identical on every load. */
export function createRng(seed: number) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    range: (min: number, max: number) => min + next() * (max - min),
    int: (min: number, max: number) => Math.floor(min + next() * (max - min + 1)),
    pick: <T,>(arr: readonly T[]) => arr[Math.floor(next() * arr.length)],
    chance: (p: number) => next() < p,
    shuffle: <T,>(arr: T[]) => {
      const out = [...arr];
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    },
  };
}
export type Rng = ReturnType<typeof createRng>;

export function hashString(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export const round2 = (n: number) => Math.round(n * 100) / 100;

export function roundUpTo(n: number, step: number) {
  if (step <= 1) return Math.ceil(n);
  return Math.ceil(n / step) * step;
}

export function sum<T>(arr: readonly T[], fn: (t: T) => number) {
  let s = 0;
  for (const x of arr) s += fn(x);
  return s;
}

export function groupBy<T, K extends string>(arr: readonly T[], fn: (t: T) => K) {
  const out = {} as Record<K, T[]>;
  for (const x of arr) {
    const k = fn(x);
    (out[k] ??= []).push(x);
  }
  return out;
}

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export const DAY_MS = 86_400_000;

export function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function addDays(d: Date | string, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

export function isoDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function daysBetween(a: Date | string, b: Date | string) {
  return Math.round((startOfDay(new Date(b)).getTime() - startOfDay(new Date(a)).getTime()) / DAY_MS);
}

/** UPC-A with a valid check digit. */
export function makeUpc(rng: Rng) {
  const digits = Array.from({ length: 11 }, (_, i) => (i === 0 ? rng.int(0, 8) : rng.int(0, 9)));
  const odd = digits.filter((_, i) => i % 2 === 0).reduce((a, b) => a + b, 0);
  const even = digits.filter((_, i) => i % 2 === 1).reduce((a, b) => a + b, 0);
  const check = (10 - ((odd * 3 + even) % 10)) % 10;
  return [...digits, check].join("");
}

let idCounter = 0;
export function uid(prefix = "id") {
  idCounter = (idCounter + 1) % 1_000_000;
  return `${prefix}_${Date.now().toString(36)}${idCounter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
