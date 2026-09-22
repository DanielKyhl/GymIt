import { Workout, WorkoutSet } from "../types/workout";

// RPE (rate of perceived exertion): how hard a set felt, 1-10. 10 means no
// more reps were possible; each step down is roughly one more rep left.

export const RPE_OPTIONS: { value: number; detail: string }[] = [
  { value: 10, detail: "Max effort, no reps left" },
  { value: 9.5, detail: "No reps left, but could add a little weight" },
  { value: 9, detail: "1 rep left" },
  { value: 8.5, detail: "1–2 reps left" },
  { value: 8, detail: "2 reps left" },
  { value: 7.5, detail: "2–3 reps left" },
  { value: 7, detail: "3 reps left" },
  { value: 6, detail: "4 reps left" },
  { value: 5, detail: "Easy, 5 or more reps left" },
];

// "8", "8.5", or an average like "8.3", with the device's decimal separator.
export function formatRPE(value: number): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

// Finished working sets that were given an RPE. Warm-ups don't count.
function ratedSets(workout: Workout): WorkoutSet[] {
  return workout.exercises.flatMap((ex) => ex.sets.filter((s) => s.done && s.type !== "warmup" && (s.rpe ?? 0) > 0));
}

const average = (sets: WorkoutSet[]): number | null =>
  sets.length === 0 ? null : Math.round((sets.reduce((sum, s) => sum + (s.rpe ?? 0), 0) / sets.length) * 10) / 10;

// A workout's average RPE, or null if no set was rated.
export function workoutRPE(workout: Workout): number | null {
  return average(ratedSets(workout));
}

// The average over every rated set in every workout.
export function averageRPE(workouts: Workout[]): number | null {
  return average(workouts.flatMap(ratedSets));
}

// Each rated workout's average, oldest first, for a chart.
export function rpeHistory(workouts: Workout[]): { date: string; value: number }[] {
  return [...workouts]
    .sort((a, b) => a.date.localeCompare(b.date))
    .flatMap((w) => {
      const value = workoutRPE(w);
      return value === null ? [] : [{ date: w.date, value }];
    });
}

// Average RPE per workout name (template), most-done first.
export function rpeByWorkout(workouts: Workout[]): { name: string; average: number; sessions: number }[] {
  const groups = new Map<string, Workout[]>();
  workouts.forEach((w) => {
    if (workoutRPE(w) === null) return;
    groups.set(w.name, [...(groups.get(w.name) ?? []), w]);
  });
  return [...groups.entries()]
    .map(([name, list]) => ({ name, average: averageRPE(list) ?? 0, sessions: list.length }))
    .sort((a, b) => b.sessions - a.sessions || a.name.localeCompare(b.name));
}
