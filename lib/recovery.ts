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
// weight. braced: muscles holding the body, or the weight, still while it
// moves: the core in a bent-over row, the grip on a pull-up, the lower back in
// a squat. Bracing is real work but light, so it counts for less and
// clears sooner (see computeRecovery), and the weekly sets chart leaves it out.
// helpers: the secondary muscles as that chart counts them, each under its
// first slug only: a pulldown's middle back is more Back, not Traps too.
type Trained = { primary: Slug[]; secondary: Slug[]; braced: Slug[]; helpers: Slug[] };

// The helpers that really do help move the weight, by the exercise's main
// muscle. The exercise data lists more than these, and gets some wrong:
// hamstrings on a squat or a leg extension, calves on nearly every leg
// exercise, glutes on a calf raise, the middle back on a shoulder press.
const HELPERS: Record<string, string[]> = {
  chest: ["shoulders", "triceps"],
  shoulders: ["triceps", "traps"], // presses; upright rows and rear-delt work
  triceps: ["chest", "shoulders"], // dips and close-grip presses
  lats: ["biceps", "shoulders", "middle back"], // pull-ups and pulldowns
  "middle back": ["biceps", "shoulders"], // rows
  quadriceps: ["glutes"], // squats, lunges, leg press
  hamstrings: ["glutes", "lower back"], // Romanian deadlifts, good mornings
  glutes: ["hamstrings", "quadriceps", "lower back"], // deadlifts, hip thrusts
  "lower back": ["glutes", "hamstrings"], // back extensions
  abdominals: ["obliques"], // twisting crunches
};

// And some only help in some kinds of exercise. The triceps (and the chest and
// shoulders on a triceps exercise) push in a press, a dip or a push-up, but
// only hold the arm still in a fly, a raise or an extension. The traps lift
// the shoulders in an upright row and pull the shoulder blades back in
// rear-delt work, but hardly work in a lateral raise.
const PRESS = /press|dip|push[-\s]?up/i;
const TRAPS_WORK = /upright|high pull|rear|revers/i; // "revers": one's spelled "Revers Fly"

function helps(main: string, helper: string, name: string): boolean {
  if (!HELPERS[main]?.includes(helper)) return false;
  if (helper === "triceps" || main === "triceps") return PRESS.test(name);
  if (helper === "traps") return TRAPS_WORK.test(name);
  return true;
}

// Listed as helpers anywhere else, these hold rather than move: the grip, the
// lower back keeping the spine straight, and the core.
const HOLDING = ["forearms", "lower back", "abdominals", "obliques"];

function trainedBy(e: MuscleSource): Trained {
  const primary = toSlugs(e.primaryMuscles);
  const main = e.primaryMuscles[0]?.toLowerCase() ?? "";
  const listed = e.secondaryMuscles.map((m) => m.toLowerCase());
  const helping = listed.filter((m) => helps(main, m, e.name));
  const secondary = new Set(toSlugs(helping));
  // Bracing the source data leaves out (core in squats, rows, carries), and
  // the helpers it lists that hold.
  const braced = new Set([...stabiliserMuscles(e), ...toSlugs(listed.filter((m) => HOLDING.includes(m)))]);
  primary.forEach((s) => {
    secondary.delete(s);
    braced.delete(s);
  });
  secondary.forEach((s) => braced.delete(s));
  const helpers = [...new Set(helping.map((m) => MUSCLE_TO_SLUG[m][0]))].filter((s) => !primary.includes(s));
  return { primary, secondary: [...secondary], braced: [...braced], helpers };
}

const muscleMap = new Map<string, Trained>(exercises.map((e) => [e.name, trainedBy(e)]));

// The muscles an exercise trains. Names from the old catalogue still resolve,
// so history logged under them counts; anything else is empty.
export function musclesFor(name: string): Trained {
  let found = muscleMap.get(name);
  if (!found) {
    const legacy = legacyExercise(name);
    if (!legacy) return { primary: [], secondary: [], braced: [], helpers: [] };
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
