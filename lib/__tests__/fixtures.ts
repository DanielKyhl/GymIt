import { Workout, WorkoutSet } from "../../types/workout";

export function set(
  weight: number,
  reps: number,
  extra: Partial<WorkoutSet> = {}
): WorkoutSet {
  return { weight, reps, done: true, ...extra };
}

export function workout(
  name: string,
  date: string,
  exercises: { name: string; sets: WorkoutSet[] }[]
): Workout {
  return {
    id: `${name}-${date}`,
    name,
    date,
    durationSeconds: 3600,
    unit: "kg",
    exercises,
  };
}