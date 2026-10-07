/** Date-period filter shared by admin lists (?period=…). */
export const PERIOD_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "week", label: "Last 7 days" },
  { value: "month", label: "Last 30 days" },
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "year", label: "This year" },
] as const;

export type Period = (typeof PERIOD_OPTIONS)[number]["value"] | "custom";

/** "YYYY-MM-DD" → local midnight, or null if invalid. */
function parseDay(s: string | undefined): Date | null {
  const m = s?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** [from, to) range for a period, in the server's local time; null = all time. */
export function periodRange(
  period: string | undefined,
  fromStr?: string,
  toStr?: string,
): { period: Period; from: Date | null; to: Date | null; label: string } | null {
  if (period === "custom") {
    const from = parseDay(fromStr);
    const toDay = parseDay(toStr);
    if (!from && !toDay) return null;
    // "To" is inclusive: include the whole of that day.
    const to = toDay ? new Date(toDay.getFullYear(), toDay.getMonth(), toDay.getDate() + 1) : null;
    const label = from && toDay ? `${fromStr} → ${toStr}` : from ? `From ${fromStr}` : `Until ${toStr}`;
    return { period: "custom", from, to, label };
  }
  const r = presetRange(period);
  return r && { ...r, label: PERIOD_OPTIONS.find((o) => o.value === r.period)!.label };
}

function presetRange(period: string | undefined): { period: Period; from: Date; to: Date | null } | null {
  const opt = PERIOD_OPTIONS.find((o) => o.value === period);
  if (!opt) return null;
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const daysAgo = (n: number) => new Date(startOfToday.getFullYear(), startOfToday.getMonth(), startOfToday.getDate() - n);
  switch (opt.value) {
    case "today":
      return { period: opt.value, from: startOfToday, to: null };
    case "yesterday":
      return { period: opt.value, from: daysAgo(1), to: startOfToday };
    case "week":
      return { period: opt.value, from: daysAgo(6), to: null };
    case "month":
      return { period: opt.value, from: daysAgo(29), to: null };
    case "this_month":
      return { period: opt.value, from: new Date(now.getFullYear(), now.getMonth(), 1), to: null };
    case "last_month":
      return {
        period: opt.value,
        from: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        to: new Date(now.getFullYear(), now.getMonth(), 1),
      };
    case "year":
      return { period: opt.value, from: new Date(now.getFullYear(), 0, 1), to: null };
  }
}
