const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const usd0 = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const compactUsd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});
const int = new Intl.NumberFormat("en-US");
const dec1 = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1, minimumFractionDigits: 0 });

export const fmt = {
  money: (n: number) => usd.format(n),
  money0: (n: number) => usd0.format(n),
  moneyCompact: (n: number) => (Math.abs(n) >= 10_000 ? compactUsd.format(n) : usd0.format(n)),
  int: (n: number) => int.format(Math.round(n)),
  dec1: (n: number) => dec1.format(n),
  pct: (n: number, digits = 1) => `${(n * 100).toFixed(digits)}%`,
  signedPct: (n: number, digits = 1) => `${n >= 0 ? "+" : "−"}${Math.abs(n * 100).toFixed(digits)}%`,
  signedInt: (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${int.format(Math.abs(Math.round(n)))}`,
  plural: (n: number, one: string, many = `${one}s`) => `${int.format(n)} ${n === 1 ? one : many}`,
};

const dateShort = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
const dateMed = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });
const weekday = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" });
const time = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });
const dateTime = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});
const longDate = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" });

export const fdate = {
  short: (d: string | Date) => dateShort.format(new Date(d)),
  medium: (d: string | Date) => dateMed.format(new Date(d)),
  weekday: (d: string | Date) => weekday.format(new Date(d)),
  time: (d: string | Date) => time.format(new Date(d)),
  dateTime: (d: string | Date) => dateTime.format(new Date(d)),
  long: (d: string | Date) => longDate.format(new Date(d)),
  /** Human relative time: "just now", "12 min ago", "3 h ago", "Yesterday", "Oct 3". */
  relative: (d: string | Date, now = new Date()) => {
    const t = new Date(d).getTime();
    const diff = now.getTime() - t;
    const future = diff < 0;
    const abs = Math.abs(diff);
    const min = Math.round(abs / 60_000);
    if (min < 1) return "just now";
    if (min < 60) return future ? `in ${min} min` : `${min} min ago`;
    const h = Math.round(min / 60);
    if (h < 24) return future ? `in ${h} h` : `${h} h ago`;
    const days = Math.round(h / 24);
    if (days === 1) return future ? "Tomorrow" : "Yesterday";
    if (days < 7) return future ? `in ${days} days` : `${days} days ago`;
    return dateShort.format(new Date(d));
  },
  /** "in 3 days", "Today", "2 days late". */
  due: (d: string | Date, now = new Date()) => {
    const a = new Date(now);
    a.setHours(0, 0, 0, 0);
    const b = new Date(d);
    b.setHours(0, 0, 0, 0);
    const days = Math.round((b.getTime() - a.getTime()) / 86_400_000);
    if (days === 0) return "Today";
    if (days === 1) return "Tomorrow";
    if (days === -1) return "1 day late";
    if (days < 0) return `${-days} days late`;
    return `in ${days} days`;
  },
};
