import { Slug } from "react-native-body-highlighter";
import { Workout } from "../types/workout";
import { exercises } from "./exercises";

export const COLOR_RECOVERED = "#1d9e75"; // green
export const COLOR_PARTIAL = "#e6b800"; // yellow
export const COLOR_TRAINED = "#e24b4a"; // red

// Approximate hours to fully recover. Small groups 36h (24-48 avg),
// chest/back/legs 60h (48-72 avg). Secondary involvement recovers faster.
const RECOVERY_HOURS: Partial<Record<Slug, number>> = {
  deltoids: 36,
  biceps: 36,
  triceps: 36,
  forearm: 36,
  abs: 36,
  obliques: 36,
  calves: 36,
  adductors: 36,
  neck: 36,
  chest: 60,
  "upper-back": 60,
  "lower-back": 60,
  trapezius: 60,
  quadriceps: 60,
  hamstring: 60,
  gluteal: 60,
};

// free-exercise-db muscle names -> body-highlighter slugs.
const MUSCLE_TO_SLUG: Record<string, Slug> = {
  abdominals: "abs",
  biceps: "biceps",
  triceps: "triceps",
  chest: "chest",
  forearms: "forearm",
  shoulders: "deltoids",
  traps: "trapezius",
  lats: "upper-back",
  "middle back": "upper-back",
  "lower back": "lower-back",
  quadriceps: "quadriceps",
  hamstrings: "hamstring",
  glutes: "gluteal",
  calves: "calves",
  adductors: "adductors",
  abductors: "gluteal", // no abductors slug; approximate to the hip/glute area
  neck: "neck",
};

// Build once: exercise name -> the muscle slugs it trains.
const toSlugs = (names: string[] | undefined): Slug[] =>
  (names ?? [])
    .map((m) => MUSCLE_TO_SLUG[m.toLowerCase()])
    .filter((s): s is Slug => Boolean(s));

const muscleMap: Record<string, { primary: Slug[]; secondary: Slug[] }> = {};
exercises.forEach((e) => {
  muscleMap[e.name] = {
    primary: toSlugs(e.primaryMuscles),
    secondary: toSlugs(e.secondaryMuscles),
  };
});

export type MuscleRecovery = {
  slug: Slug;
  color: string;
  fraction: number; // 0 = just trained, 1 = fully recovered
  hoursLeft: number; // approx hours until recovered (0 if recovered)
};

// Recovery state for every tracked muscle, based on the most recent
// (least-recovered) time it was trained.
export function computeRecovery(workouts: Workout[], now: number = Date.now()): MuscleRecovery[] {
  const best: Record<string, { fraction: number; hoursLeft: number }> = {};

  workouts.forEach((w) => {
    const elapsedH = (now - new Date(w.date).getTime()) / (1000 * 60 * 60);
    w.exercises.forEach((ex) => {
      if (ex.sets.length === 0) return;
      const mm = muscleMap[ex.name];
      if (!mm) return;
      const apply = (slug: Slug, factor: number) => {
        const base = RECOVERY_HOURS[slug];
        if (!base) return;
        const eff = base * factor;
        const fraction = Math.min(1, elapsedH / eff);
        const hoursLeft = Math.max(0, eff - elapsedH);
        const cur = best[slug];
        if (!cur || fraction < cur.fraction) best[slug] = { fraction, hoursLeft };
      };
      mm.primary.forEach((s) => apply(s, 1));
      mm.secondary.forEach((s) => apply(s, 0.5));
    });
  });

  return (Object.keys(RECOVERY_HOURS) as Slug[]).map((slug) => {
    const b = best[slug] ?? { fraction: 1, hoursLeft: 0 };
    const color =
      b.fraction < 0.5 ? COLOR_TRAINED : b.fraction < 1 ? COLOR_PARTIAL : COLOR_RECOVERED;
    return { slug, color, fraction: b.fraction, hoursLeft: Math.round(b.hoursLeft) };
  });
}

// Nicely formatted muscle name for display (from the slug).
export function slugLabel(slug: Slug): string {
  return slug.replace("-", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
