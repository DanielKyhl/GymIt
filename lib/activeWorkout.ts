import { SetType, Workout, WorkoutExercise, WorkoutSet } from "../types/workout";
import { estimate1RM, getExerciseSessions } from "./stats";
import { Unit } from "./units";

// The workout in progress. Saved on the device after every change, so closing
// the app mid-session doesn't lose it; cleared when it's ended or discarded.
export type ActiveWorkout = {
  templateId: string | null; // null for an empty workout
  name: string;
  startedAt: number; // ms since epoch
  unit: Unit;
  exercises: WorkoutExercise[];
  rest: RestTimer | null;
};

// Timers store when they started rather than counting ticks, so they stay
// right when the phone locks or the app is in the background (where
// intervals pause).
export type RestTimer = { startedAt: number; target: number };

export function elapsedSeconds(since: number, now: number): number {
  return Math.max(0, Math.floor((now - since) / 1000));
}

export function formatClock(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Set types: tapping the set number cycles normal → warm-up → drop → failure.

const TYPE_CYCLE: SetType[] = ["normal", "warmup", "drop", "failure"];

export function nextSetType(type: SetType | undefined): SetType {
  const i = TYPE_CYCLE.indexOf(type ?? "normal");
  return TYPE_CYCLE[(i + 1) % TYPE_CYCLE.length];
}

// ---------------------------------------------------------------------------
// Live personal records.

// The best estimated 1RM this exercise reached before this workout.
export function historyBest1RM(pastWorkouts: Workout[], name: string): number {
  return getExerciseSessions(pastWorkouts, name).reduce((best, s) => Math.max(best, s.best1RM), 0);
}

// A finished working set is a PR if it beats the exercise's history and every
// earlier set of it in this workout. First-ever sessions only set a baseline,
// matching how PRs are counted for XP.
export function isLivePR(exercise: WorkoutExercise, setIndex: number, historyBest: number): boolean {
  const set = exercise.sets[setIndex];
  if (!set?.done || set.type === "warmup" || historyBest <= 0) return false;
  const e1rm = estimate1RM(set.weight, set.reps);
  if (e1rm <= historyBest) return false;
  return exercise.sets
    .slice(0, setIndex)
    .every((s) => !s.done || s.type === "warmup" || estimate1RM(s.weight, s.reps) < e1rm);
}

// ---------------------------------------------------------------------------
// Supersets.

// Rest to start after finishing a set. Within a superset you go straight to
// the next exercise; the rest comes after the last exercise of the round.
export function restAfterSet(exercises: WorkoutExercise[], exIndex: number, setIndex: number): number {
  const ex = exercises[exIndex];
  const rest = ex?.sets[setIndex]?.restSeconds ?? 0;
  if (!ex?.supersetId) return rest;
  return exercises[exIndex + 1]?.supersetId === ex.supersetId ? 0 : rest;
}

// Join an exercise with the one after it (merging their groups if either is
// already in a superset).
export function linkWithNext(exercises: WorkoutExercise[], exIndex: number, newId: string): WorkoutExercise[] {
  const a = exercises[exIndex];
  const b = exercises[exIndex + 1];
  if (!a || !b) return exercises;
  const id = a.supersetId ?? b.supersetId ?? newId;
  const absorb = [a.supersetId, b.supersetId].filter((g): g is string => Boolean(g));
  return exercises.map((e, i) =>
    i === exIndex || i === exIndex + 1 || (e.supersetId && absorb.includes(e.supersetId))
      ? { ...e, supersetId: id }
      : e
  );
}

// Split a superset between an exercise and the next one. A part left with a
// single exercise stops being a superset.
export function unlinkFromNext(exercises: WorkoutExercise[], exIndex: number, newId: string): WorkoutExercise[] {
  const id = exercises[exIndex]?.supersetId;
  if (!id || exercises[exIndex + 1]?.supersetId !== id) return exercises;
  const members = exercises.flatMap((e, i) => (e.supersetId === id ? [i] : []));
  const before = members.filter((i) => i <= exIndex);
  const after = members.filter((i) => i > exIndex);
  return exercises.map((e, i) => {
    if (before.includes(i)) return before.length > 1 ? e : { ...e, supersetId: undefined };
    if (after.includes(i)) return after.length > 1 ? { ...e, supersetId: newId } : { ...e, supersetId: undefined };
    return e;
  });
}

// ---------------------------------------------------------------------------
// Plate and warm-up calculators.

const PLATES: Record<Unit, number[]> = {
  kg: [25, 20, 15, 10, 5, 2.5, 1.25],
  lb: [45, 35, 25, 10, 5, 2.5],
};

export type PlateLoad = {
  perSide: number[]; // heaviest first
  leftover: number; // total weight the standard plates can't make up
  belowBar: boolean;
};

export function platesPerSide(total: number, unit: Unit, bar: number): PlateLoad {
  if (total < bar) return { perSide: [], leftover: 0, belowBar: true };
  let side = (total - bar) / 2;
  const perSide: number[] = [];
  for (const plate of PLATES[unit]) {
    while (side >= plate - 1e-9) {
      perSide.push(plate);
      side -= plate;
    }
  }
  return { perSide, leftover: Math.round(side * 2 * 100) / 100, belowBar: false };
}

// Warm-up sets leading to a working weight: the empty bar for 10 (for
// barbell lifts), then 40% × 10, 60% × 5, 80% × 3. Weights are rounded to
// jumps you can load; steps that wouldn't be heavier than the last are skipped.
export function warmupSets(working: number, unit: Unit, bar: number, restSeconds = 60): WorkoutSet[] {
  const step = unit === "kg" ? 2.5 : 5;
  const round = (w: number) => Math.round(w / step) * step;
  const plan: [number, number][] = [
    [0, 10],
    [0.4, 10],
    [0.6, 5],
    [0.8, 3],
  ];
  const sets: WorkoutSet[] = [];
  let last = 0;
  for (const [pct, reps] of plan) {
    const weight = pct === 0 ? bar : Math.max(bar, round(working * pct));
    if (weight <= last || weight >= working) continue;
    sets.push({ weight, reps, done: false, type: "warmup", restSeconds });
    last = weight;
  }
  return sets;
}
