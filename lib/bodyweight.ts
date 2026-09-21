import { isBodyweight } from "./exercises";
import { convertWeight, Unit } from "./units";

export type BodyWeight = { value: number; unit: Unit };

// The weight a new set starts with. For bodyweight exercises (pull-ups,
// push-ups, dips...) that's your body weight, so those sets count toward
// volume, estimated 1RM and PRs like any other lift. Everything else starts
// empty. The value is stored on the set, so history keeps the weight you were
// at the time even after you update it.
export function startingWeight(exercise: string, bodyWeight: BodyWeight | null, unit: Unit): number {
  if (!bodyWeight || !isBodyweight(exercise)) return 0;
  return convertWeight(bodyWeight.value, bodyWeight.unit, unit);
}

// One weigh-in per day. The date is a local calendar day, "2026-09-21".
export type BodyWeightEntry = { date: string; value: number; unit: Unit };

// Keep at most about three years of daily weigh-ins in the settings record.
const MAX_ENTRIES = 1000;

// Adds a weigh-in, replacing any earlier one from the same day (Settings saves
// as you type, so only the last value of the day should stick). Oldest first.
export function addWeighIn(log: BodyWeightEntry[], entry: BodyWeightEntry): BodyWeightEntry[] {
  return [...log.filter((e) => e.date !== entry.date), entry]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-MAX_ENTRIES);
}

// The log in one unit, rounded to 0.1, for charts and comparisons.
export function weighInsIn(log: BodyWeightEntry[], unit: Unit): { date: string; value: number }[] {
  return log.map((e) => ({ date: e.date, value: Math.round(convertWeight(e.value, e.unit, unit) * 10) / 10 }));
}

// Today's date as a local calendar day.
export function todayKey(now: number = Date.now()): string {
  const d = new Date(now);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
