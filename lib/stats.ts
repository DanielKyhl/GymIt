import { Slug } from "react-native-body-highlighter";
import { Workout, WorkoutSet } from "../types/workout";
import { isBodyweight } from "./exercises";
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
//
// A PR belongs to an exercise in a workout: its total (weight × reps added up
// over its sets) beat the best total it ever had. Bodyweight exercises count
// total reps instead, since their "weight" is only what you weighed that day.
// A milestone is quieter: the first time you lift a weight heavier than ever
// on that exercise. It isn't counted and gives no XP. The first time you do
// an exercise only sets its baseline.

// Working sets you ticked off: the sets records and History count.
export function countedSets(sets: WorkoutSet[]): WorkoutSet[] {
  return sets.filter((s) => s.done && s.type !== "warmup" && s.reps > 0);
}

// What a PR compares: total weight moved, or total reps for bodyweight exercises.
export function exerciseTotal(name: string, sets: WorkoutSet[]): number {
  const counted = countedSets(sets);
  const total = isBodyweight(name)
    ? counted.reduce((n, s) => n + s.reps, 0)
    : counted.reduce((n, s) => n + s.weight * s.reps, 0);
  // Weights converted from lb carry decimals; keep float noise out of comparisons.
  return Math.round(total * 100) / 100;
}

export type ExerciseRecord = {
  exercise: string;
  // Beat its best total. inReps: a bodyweight exercise, so the totals are reps.
  pr?: { total: number; previous: number; inReps: boolean };
  // Heavier than it had ever been lifted.
  milestone?: { weight: number; previous: number };
};

function oldestFirst(workouts: Workout[]): Workout[] {
  // Storage keeps newest first; reversing first keeps same-time workouts in order.
  return [...workouts].reverse().sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

// An exercise done twice in one workout counts as one, with all its sets.
function setsByExercise(workout: Workout): Map<string, WorkoutSet[]> {
  const byName = new Map<string, WorkoutSet[]>();
  workout.exercises.forEach((ex) => byName.set(ex.name, [...(byName.get(ex.name) ?? []), ...ex.sets]));
  return byName;
}

// Every workout's PRs and milestones by workout id, worked out from the whole
// history oldest first, so editing or deleting a workout changes what comes
// after it. Pass the workouts in one unit (getWorkoutsForStats).
export function workoutRecords(workouts: Workout[]): Map<string, ExerciseRecord[]> {
  const bests = new Map<string, { total: number; heaviest: number }>();
  const result = new Map<string, ExerciseRecord[]>();
  oldestFirst(workouts).forEach((w) => {
    const records: ExerciseRecord[] = [];
    setsByExercise(w).forEach((sets, name) => {
      const total = exerciseTotal(name, sets);
      if (total <= 0) return;
      const bodyweight = isBodyweight(name);
      const heaviest = bodyweight ? 0 : Math.max(...countedSets(sets).map((s) => s.weight));
      const best = bests.get(name);
      if (!best) {
        bests.set(name, { total, heaviest });
        return;
      }
      const record: ExerciseRecord = { exercise: name };
      if (total > best.total) {
        record.pr = { total, previous: best.total, inReps: bodyweight };
        best.total = total;
      }
      if (heaviest > best.heaviest) {
        record.milestone = { weight: heaviest, previous: best.heaviest };
        best.heaviest = heaviest;
      }
      if (record.pr || record.milestone) records.push(record);
    });
    if (records.length > 0) result.set(w.id, records);
  });
  return result;
}

// How many PRs in a list of records; milestones don't count.
export function prCount(records: ExerciseRecord[] | undefined): number {
  return records?.filter((r) => r.pr).length ?? 0;
}

// The PRs and milestones of a just-finished workout.
export function newRecords(past: Workout[], workout: Workout): ExerciseRecord[] {
  return workoutRecords([workout, ...past.filter((w) => w.id !== workout.id)]).get(workout.id) ?? [];
}

export type PersonalRecord = { date: string; total: number; previous: number; inReps: boolean };

// Every PR this exercise set, newest first.
export function prHistory(workouts: Workout[], name: string): PersonalRecord[] {
  const records = workoutRecords(workouts);
  return oldestFirst(workouts)
    .flatMap((w) => {
      const pr = records.get(w.id)?.find((r) => r.exercise === name)?.pr;
      return pr ? [{ date: w.date, ...pr }] : [];
    })
    .reverse();
}

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

// ---------------------------------------------------------------------------
// Calendar views. All in local time, weeks starting on Monday.

const DAY_MS = 24 * 60 * 60 * 1000;

export function dayKey(d: Date): string {
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

export type MonthDay = { date: string; day: number; today: boolean; future: boolean };

// One month for the calendar, as weeks of seven from Monday to Sunday. Days
// outside the month are null. month is 0-11, as in Date.
export function monthGrid(year: number, month: number, now: number = Date.now()): (MonthDay | null)[][] {
  const todayKey = dayKey(new Date(now));
  const lead = (new Date(year, month, 1).getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (MonthDay | null)[] = Array(lead).fill(null);
  for (let d = 1; d <= days; d++) {
    const date = dayKey(new Date(year, month, d));
    cells.push({ date, day: d, today: date === todayKey, future: date > todayKey });
  }
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (MonthDay | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

// Workouts by local calendar day ("2026-09-23"), in the order given.
export function workoutsByDay<W extends { date: string }>(workouts: W[]): Map<string, W[]> {
  const byDay = new Map<string, W[]>();
  workouts.forEach((w) => {
    const k = dayKey(new Date(w.date));
    byDay.set(k, [...(byDay.get(k) ?? []), w]);
  });
  return byDay;
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
