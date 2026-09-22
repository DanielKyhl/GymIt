// "1 set", "2 sets" — correct singular/plural.
export function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

// Calendar days, not 24-hour blocks: a workout at 9pm yesterday is
// "Yesterday" even though it was under 24 hours ago.
export function relativeDay(iso: string): string {
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  // Rounding absorbs the 23- and 25-hour days around daylight-saving changes.
  const days = Math.round((startOfDay(new Date()) - startOfDay(new Date(iso))) / (1000 * 60 * 60 * 24));
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

// Numbers in one style app-wide, matching the English text: "2,420", "8.5".
export function formatNumber(n: number, maxDecimals = 1): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: maxDecimals });
}
