import { WorkoutSet } from "../types/workout";
import { countedSets, ExerciseRecord } from "./stats";

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

// An exercise's sets in a few characters, for the History cards: "65 kg × 10,
// 8, 8" when the weight stayed the same, "55×12 · 60×10 · 60×9" when it
// changed, "BW × 10, 9, 8" for bodyweight exercises. Only the working sets you
// ticked off; "" when there are none.
export function formatSets(sets: WorkoutSet[], unit: string, bodyweight: boolean): string {
  const counted = countedSets(sets);
  if (counted.length === 0) return "";
  const reps = counted.map((s) => s.reps).join(", ");
  if (bodyweight) return `BW × ${reps}`;
  if (counted.every((s) => s.weight === counted[0].weight)) return `${formatNumber(counted[0].weight)} ${unit} × ${reps}`;
  return counted.map((s) => `${formatNumber(s.weight)}×${s.reps}`).join(" · ");
}

// How much a PR beat the best by: "+90 kg", "+3 reps".
export function prGain(pr: NonNullable<ExerciseRecord["pr"]>, unit: string): string {
  const gain = pr.total - pr.previous;
  return pr.inReps ? `+${plural(gain, "rep")}` : `+${formatNumber(gain)} ${unit}`;
}

// A PR's total: "1,260 kg", "27 reps".
export function prTotal(pr: NonNullable<ExerciseRecord["pr"]>, unit: string): string {
  return pr.inReps ? plural(pr.total, "rep") : `${formatNumber(pr.total, 0)} ${unit}`;
}
