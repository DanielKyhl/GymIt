import { SetType, Template, TemplateSet, Workout, WorkoutExercise, WorkoutSet } from "../types/workout";
import { isBodyweight } from "./exercises";
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
// intervals pause). exIndex/setIndex: the finished set the rest follows; the
// running timer is shown right under it.
export type RestTimer = { startedAt: number; target: number; exIndex: number; setIndex: number };

export function elapsedSeconds(since: number, now: number): number {
  return Math.max(0, Math.floor((now - since) / 1000));
}

export function formatClock(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

// A rest length the way people say it: "1:30", "0:45".
export function formatRest(totalSeconds: number): string {
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, "0")}`;
}

// The rest lengths offered in the rest menu (0 = no rest timer).
export const REST_OPTIONS = [0, 30, 60, 90, 120, 150, 180, 240, 300];

// ---------------------------------------------------------------------------
// Set types, in the order the set menu lists them. The letter replaces the
// set number for anything that isn't a normal set.

export const SET_TYPES: { type: SetType; letter: string; name: string; detail: string }[] = [
  { type: "normal", letter: "", name: "Normal set", detail: "A regular working set." },
  { type: "warmup", letter: "W", name: "Warm-up set", detail: "Lighter, to get ready. Left out of your stats." },
  { type: "drop", letter: "D", name: "Drop set", detail: "Straight after a set, with less weight." },
  { type: "failure", letter: "F", name: "Failure set", detail: "Until you can't do another rep." },
];

// Working sets are numbered 1, 2, 3… with warm-ups not counted, so the
// numbers match what you'd call them: W, W, 1, 2, 3.
export function setNumber(sets: WorkoutSet[], index: number): number {
  return sets.slice(0, index + 1).filter((s) => s.type !== "warmup").length;
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

// Ticking a set starts the rest that follows it (replacing any rest already
// running); unticking it stops that rest. Within a superset round there's
// no rest, so ticking just ends the previous one.
export function toggleSet(a: ActiveWorkout, exIndex: number, setIndex: number, now: number): ActiveWorkout {
  const set = a.exercises[exIndex]?.sets[setIndex];
  if (!set) return a;
  const done = !set.done;
  const exercises = a.exercises.map((ex, i) =>
    i === exIndex ? { ...ex, sets: ex.sets.map((s, j) => (j === setIndex ? { ...s, done } : s)) } : ex
  );
  if (!done) {
    const ownRest = a.rest?.exIndex === exIndex && a.rest?.setIndex === setIndex;
    return { ...a, exercises, rest: ownRest ? null : a.rest };
  }
  const seconds = restAfterSet(exercises, exIndex, setIndex);
  return { ...a, exercises, rest: seconds > 0 ? { startedAt: now, target: seconds, exIndex, setIndex } : null };
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

// ---------------------------------------------------------------------------
// Finishing.

// What gets saved: sets never filled in (not ticked, no reps) are left out,
// and so are exercises with nothing left, so history only shows real work.
export function loggedExercises(exercises: WorkoutExercise[]): WorkoutExercise[] {
  return exercises
    .map((ex) => ({ ...ex, sets: ex.sets.filter((s) => s.done || s.reps > 0) }))
    .filter((ex) => ex.sets.length > 0);
}

// After a workout started from a template: the template with each exercise's
// sets replaced by the ones ticked off this time, so the template screen, its
// editor and the next workout from it all start from last time's numbers.
// Exercises skipped this time keep what they had; exercises added mid-workout
// aren't added to the template. Null when nothing changed.
export function templateAfterWorkout(template: Template, done: WorkoutExercise[]): Template | null {
  const used = new Set<number>();
  let changed = false;
  const exercises = template.exercises.map((planned) => {
    // Paired by name, in order, so an exercise that appears twice matches up.
    const i = done.findIndex((ex, k) => !used.has(k) && ex.name === planned.name);
    if (i === -1) return planned;
    used.add(i);
    const sets: TemplateSet[] = done[i].sets
      .filter((s) => s.done)
      .map((s) => ({
        // Bodyweight exercises are kept as "BW" (0), so they start at your
        // body weight on the day.
        weight: isBodyweight(planned.name) ? 0 : s.weight,
        reps: s.reps,
        ...(s.restSeconds !== undefined ? { restSeconds: s.restSeconds } : {}),
        ...(s.type && s.type !== "normal" ? { type: s.type } : {}),
      }));
    if (sets.length === 0 || JSON.stringify(sets) === JSON.stringify(planned.sets ?? [])) return planned;
    changed = true;
    return { ...planned, sets };
  });
  return changed ? { ...template, exercises } : null;
}

// A plan with nothing in it: no sets, or sets with no reps (added in the
// editor and never filled in).
const isBlankPlan = (sets?: TemplateSet[]) => !sets?.length || sets.every((s) => !s.reps);

// For templates that were never given numbers, including ones used before
// workouts wrote theirs back: each blank exercise takes the sets from the
// last time you did it, in any workout. Exercises that have a plan are left
// alone. `workouts` newest first, in the template's unit. Null if there's
// nothing to fill.
export function fillBlankTemplate(template: Template, workouts: Workout[]): Template | null {
  const lastTimes: WorkoutExercise[] = [];
  template.exercises
    .filter((e) => isBlankPlan(e.sets))
    .forEach((e) => {
      for (const w of workouts) {
        const sets = w.exercises.find((x) => x.name === e.name)?.sets.filter((s) => s.done || s.reps > 0);
        if (sets?.length) {
          lastTimes.push({ name: e.name, sets: sets.map((s) => ({ ...s, done: true })) });
          return;
        }
      }
    });
  return lastTimes.length > 0 ? templateAfterWorkout(template, lastTimes) : null;
}
