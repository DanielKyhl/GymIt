import { Slug } from "react-native-body-highlighter";
import { Workout, WorkoutSet } from "../types/workout";
import { musclesFor } from "./recovery";

// Epley formula: estimate a one-rep max from a weight lifted for some reps.
// 1RM = weight * (1 + reps / 30). One rep just returns the weight.
export function estimate1RM(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30));
}

export type ExerciseSession = {
  date: string;
  topWeight: number;
  best1RM: number;
};

// Every past session that included this exercise, oldest first, with the
// heaviest weight and best estimated 1RM logged that day.
export function getExerciseSessions(workouts: Workout[], name: string): ExerciseSession[] {
  const sessions: ExerciseSession[] = [];
  // Stored newest-first, so reverse for a left-to-right timeline.
  [...workouts].reverse().forEach((w) => {
    const ex = w.exercises.find((e) => e.name === name);
    if (!ex) return;
    const working = ex.sets.filter((s) => s.type !== "warmup");
    if (working.length === 0) return;
    let topWeight = 0;
    let best1RM = 0;
    working.forEach((s) => {
      if (s.weight > topWeight) topWeight = s.weight;
      const oneRM = estimate1RM(s.weight, s.reps);
      if (oneRM > best1RM) best1RM = oneRM;
    });
    sessions.push({ date: w.date, topWeight, best1RM });
  });
  return sessions;
}

export type ExerciseSummary = {
  name: string;
  bestWeight: number;
  best1RM: number;
  sessionCount: number;
};

// One summary row per exercise you've ever logged sets for, most-trained first.
export function getTrainedExercises(workouts: Workout[]): ExerciseSummary[] {
  const map = new Map<string, ExerciseSummary>();
  workouts.forEach((w) => {
    w.exercises.forEach((ex) => {
      const working = ex.sets.filter((s) => s.type !== "warmup");
      if (working.length === 0) return;
      const summary =
        map.get(ex.name) ?? { name: ex.name, bestWeight: 0, best1RM: 0, sessionCount: 0 };
      summary.sessionCount += 1;
      working.forEach((s) => {
        if (s.weight > summary.bestWeight) summary.bestWeight = s.weight;
        const oneRM = estimate1RM(s.weight, s.reps);
        if (oneRM > summary.best1RM) summary.best1RM = oneRM;
      });
      map.set(ex.name, summary);
    });
  });
  return [...map.values()].sort((a, b) => b.sessionCount - a.sessionCount);
}

// The working sets from the most recent past workout that included this
// exercise — used to show "previous" hints while logging.
export function getLastPerformance(workouts: Workout[], name: string): WorkoutSet[] {
  for (const w of workouts) {
    const ex = w.exercises.find((e) => e.name === name);
    if (ex) {
      const working = ex.sets.filter((s) => s.type !== "warmup");
      if (working.length > 0) return working;
    }
  }
  return [];
}
export function lastUsedDate(workouts: Workout[], name: string): string | null {
  const match = workouts.find((w) => w.name === name);
  return match ? match.date : null;
}
export function workoutVolume(workout: Workout): number {
  let volume = 0;
  workout.exercises.forEach((ex) => {
    ex.sets
      .filter((s) => s.type !== "warmup")
      .forEach((s) => {
        volume += s.weight * s.reps;
      });
  });
  return volume;
}

export function getVolumeHistory(workouts: Workout[]): { date: string; volume: number }[] {
  return [...workouts].reverse().map((w) => ({ date: w.date, volume: workoutVolume(w) }));
}
export function getVolumeByTemplate(
  workouts: Workout[]
): { name: string; points: { date: string; volume: number }[] }[] {
  const groups: Record<string, { date: string; volume: number }[]> = {};
  [...workouts].reverse().forEach((w) => {
    if (!groups[w.name]) groups[w.name] = [];
    groups[w.name].push({ date: w.date, volume: workoutVolume(w) });
  });
  return Object.entries(groups).map(([name, points]) => ({ name, points }));
}

// ---------------------------------------------------------------------------
// Personal records

export type BestSet = { weight: number; reps: number; oneRM: number };

// The working set with the highest estimated 1RM, or null if there isn't one.
export function bestSet(sets: WorkoutSet[]): BestSet | null {
  let best: BestSet | null = null;
  sets
    .filter((s) => s.type !== "warmup")
    .forEach((s) => {
      const oneRM = estimate1RM(s.weight, s.reps);
      if (oneRM > 0 && (!best || oneRM > best.oneRM)) best = { weight: s.weight, reps: s.reps, oneRM };
    });
  return best;
}

export type PersonalRecord = BestSet & { date: string; previous: number };

// Every time this exercise beat its best estimated 1RM, newest first. The
// first session only sets the baseline, the same rule the XP count uses.
export function prHistory(workouts: Workout[], name: string): PersonalRecord[] {
  const records: PersonalRecord[] = [];
  let best = 0;
  [...workouts].reverse().forEach((w) => {
    const ex = w.exercises.find((e) => e.name === name);
    const top = ex ? bestSet(ex.sets) : null;
    if (!top || top.oneRM <= best) return;
    if (best > 0) records.push({ ...top, date: w.date, previous: best });
    best = top.oneRM;
  });
  return records.reverse();
}

// The records set in a just-finished workout, compared with everything before it.
export function newRecords(past: Workout[], workout: Workout): (PersonalRecord & { name: string })[] {
  const records: (PersonalRecord & { name: string })[] = [];
  workout.exercises.forEach((ex) => {
    const top = bestSet(ex.sets);
    if (!top) return;
    const previous = getExerciseSessions(past, ex.name).reduce((m, s) => Math.max(m, s.best1RM), 0);
    if (previous > 0 && top.oneRM > previous) {
      records.push({ ...top, name: ex.name, date: workout.date, previous });
    }
  });
  return records;
}

// ---------------------------------------------------------------------------
// Calendar views. All in local time, weeks starting on Monday.

const DAY_MS = 24 * 60 * 60 * 1000;

function dayKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export type HeatCell = { date: string; count: number; today: boolean; future: boolean };

// A grid of the last `weeks` weeks for the consistency heatmap: one column per
// week (oldest first), each with seven days from Monday to Sunday.
export function consistencyGrid(workouts: Workout[], weeks: number, now: number = Date.now()): HeatCell[][] {
  const counts: Record<string, number> = {};
  workouts.forEach((w) => {
    const k = dayKey(new Date(w.date));
    counts[k] = (counts[k] ?? 0) + 1;
  });

  const today = new Date(now);
  const todayKey = dayKey(today);
  const dayFromMonday = (today.getDay() + 6) % 7;
  const grid: HeatCell[][] = [];
  for (let wk = weeks - 1; wk >= 0; wk--) {
    const column: HeatCell[] = [];
    for (let d = 0; d < 7; d++) {
      // Built from calendar parts, not by adding 24h, so daylight saving can't skip a day.
      const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - dayFromMonday - wk * 7 + d);
      const k = dayKey(date);
      column.push({ date: k, count: counts[k] ?? 0, today: k === todayKey, future: k > todayKey });
    }
    grid.push(column);
  }
  return grid;
}

// The big muscle groups always shown in "sets per muscle", even at zero.
const MAIN_MUSCLES: Slug[] = [
  "chest", "upper-back", "deltoids", "biceps", "triceps",
  "quadriceps", "hamstring", "gluteal", "calves", "abs",
];

export type MuscleSets = { slug: Slug; sets: number };

// Finished working sets per muscle over the last 7 days, most trained first.
// A set counts once, under the exercise's main muscle: a row is Back, even
// though it lights up the middle of the back too on the recovery map.
export function weeklyMuscleSets(workouts: Workout[], now: number = Date.now()): MuscleSets[] {
  const counts: Partial<Record<Slug, number>> = {};
  workouts.forEach((w) => {
    const t = new Date(w.date).getTime();
    if (t > now || now - t > 7 * DAY_MS) return;
    w.exercises.forEach((ex) => {
      const sets = ex.sets.filter((s) => s.done && s.type !== "warmup").length;
      if (sets === 0) return;
      const main = musclesFor(ex.name).primary[0];
      if (main) counts[main] = (counts[main] ?? 0) + sets;
    });
  });
  const extra = (Object.keys(counts) as Slug[]).filter((s) => !MAIN_MUSCLES.includes(s));
  return [...MAIN_MUSCLES, ...extra]
    .map((slug) => ({ slug, sets: counts[slug] ?? 0 }))
    .sort((a, b) => b.sets - a.sets);
}
