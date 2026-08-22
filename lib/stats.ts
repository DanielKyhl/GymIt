import { Workout, WorkoutSet } from "../types/workout";

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
