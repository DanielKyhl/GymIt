import { Slug } from "react-native-body-highlighter";
import { Template, Workout } from "../types/workout";
import { exercises, legacyExercise } from "./exercises";
import { MuscleSource, stabiliserMuscles } from "./muscleCorrections";

export const COLOR_RECOVERED = "#1d9e75"; // green
export const COLOR_PARTIAL = "#e6b800"; // yellow
export const COLOR_TRAINED = "#E5544B"; // red

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

// The catalogue's muscle names -> body-highlighter slugs. On the diagram's
// back, "upper-back" is the two sides (lats) and "trapezius" is the strip down
// the middle, from the neck to between the shoulder blades.
const MUSCLE_TO_SLUG: Record<string, Slug[]> = {
  abdominals: ["abs"],
  biceps: ["biceps"],
  triceps: ["triceps"],
  chest: ["chest"],
  forearms: ["forearm"],
  shoulders: ["deltoids"],
  traps: ["trapezius"],
  lats: ["upper-back"],
  // Rows, face pulls and the like: the mid-traps and rhomboids squeezing the
  // shoulder blades together, which sit in the middle strip, with the lats
  // working either side of them. The first slug is the one the weekly sets
  // chart counts it under (Back).
  "middle back": ["upper-back", "trapezius"],
  "lower back": ["lower-back"],
  quadriceps: ["quadriceps"],
  hamstrings: ["hamstring"],
  glutes: ["gluteal"],
  calves: ["calves"],
  adductors: ["adductors"],
  abductors: ["gluteal"], // no abductors slug; approximate to the hip/glute area
  neck: ["neck"],
  obliques: ["obliques"],
};

// Build once: exercise name -> the muscle slugs it trains, main muscle first.
const toSlugs = (names: string[] | undefined): Slug[] => [
  ...new Set((names ?? []).flatMap((m) => MUSCLE_TO_SLUG[m.toLowerCase()] ?? [])),
];

// primary: what the exercise is for. secondary: muscles that help move the
// weight. braced: muscles holding the body still while it moves, like the core
// in a bent-over row. Bracing is real work but light, so it counts for less
// and clears sooner (see computeRecovery).
type Trained = { primary: Slug[]; secondary: Slug[]; braced: Slug[] };

const CORE: Slug[] = ["abs", "obliques"];

function trainedBy(e: MuscleSource): Trained {
  const primary = toSlugs(e.primaryMuscles);
  const secondary = new Set(toSlugs(e.secondaryMuscles));
  // Bracing the source data leaves out (core in squats, rows, carries).
  const braced = new Set(stabiliserMuscles(e));
  // Core listed as a helper on something that isn't an ab exercise is the
  // same thing: holding the trunk still, not moving it.
  if (!primary.some((s) => CORE.includes(s))) {
    CORE.forEach((s) => {
      if (secondary.delete(s)) braced.add(s);
    });
  }
  primary.forEach((s) => {
    secondary.delete(s);
    braced.delete(s);
  });
  secondary.forEach((s) => braced.delete(s));
  return { primary, secondary: [...secondary], braced: [...braced] };
}

const muscleMap = new Map<string, Trained>(exercises.map((e) => [e.name, trainedBy(e)]));

// The muscles an exercise trains. Names from the old catalogue still resolve,
// so history logged under them counts; anything else is empty.
export function musclesFor(name: string): Trained {
  let found = muscleMap.get(name);
  if (!found) {
    const legacy = legacyExercise(name);
    if (!legacy) return { primary: [], secondary: [], braced: [] };
    found = trainedBy(legacy);
    muscleMap.set(name, found);
  }
  return found;
}

// Every muscle a template works as a primary mover, each listed once.
export function templateMuscles(template: Template): Slug[] {
  return [...new Set(template.exercises.flatMap((e) => musclesFor(e.name).primary))];
}

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
      const mm = musclesFor(ex.name);
      // floor: the least recovered this can make a muscle look.
      const apply = (slug: Slug, factor: number, floor = 0) => {
        const base = RECOVERY_HOURS[slug];
        if (!base) return;
        const eff = base * factor;
        const fraction = elapsedH >= eff ? 1 : Math.max(floor, elapsedH / eff);
        const hoursLeft = Math.max(0, eff - elapsedH);
        const cur = best[slug];
        if (!cur || fraction < cur.fraction) best[slug] = { fraction, hoursLeft };
      };
      mm.primary.forEach((s) => apply(s, 1));
      mm.secondary.forEach((s) => apply(s, 0.5));
      // Bracing alone never reads as "just trained" (red): a few sets of rows
      // or squats don't tire the core like direct ab work. It shows as partly
      // worked, and clears in a quarter of the usual time.
      mm.braced.forEach((s) => apply(s, 0.25, 0.5));
    });
  });

  return (Object.keys(RECOVERY_HOURS) as Slug[]).map((slug) => {
    const b = best[slug] ?? { fraction: 1, hoursLeft: 0 };
    const color =
      b.fraction < 0.5 ? COLOR_TRAINED : b.fraction < 1 ? COLOR_PARTIAL : COLOR_RECOVERED;
    return { slug, color, fraction: b.fraction, hoursLeft: Math.round(b.hoursLeft) };
  });
}

// How recovered you are, 0-100: the average recovery of the given muscles, or
// of every tracked muscle when none are given.
export function readinessScore(recovery: MuscleRecovery[], slugs?: Slug[]): number {
  const pool = slugs ? recovery.filter((m) => slugs.includes(m.slug)) : recovery;
  if (pool.length === 0) return 100;
  return Math.round((pool.reduce((sum, m) => sum + m.fraction, 0) / pool.length) * 100);
}

// Nicely formatted muscle name for display (from the slug).
export function slugLabel(slug: Slug): string {
  return slug.replace("-", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
