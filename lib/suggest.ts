import { Template, Workout } from "../types/workout";
import { MuscleRecovery, readinessScore, templateMuscles } from "./recovery";
import { lastUsedDate } from "./stats";

export type Suggestion = {
  template: Template;
  readiness: number; // 0-100, how recovered the template's muscles are
  lastDone: string | null;
};

// Which template to train next: the one whose muscles are most recovered,
// and among equally ready ones, the one you haven't done for the longest.
// Example templates only count once you've used them, or when they're part of
// the plan picked during setup (`planIds`), so someone running their own
// push/pull/legs isn't nudged towards an example they never do.
export function suggestTemplate(
  templates: Template[],
  workouts: Workout[],
  recovery: MuscleRecovery[],
  planIds: string[] = []
): Suggestion | null {
  const withExercises = templates.filter((t) => t.exercises.length > 0);
  const used = new Set(workouts.map((w) => w.name));
  const own = withExercises.filter(
    (t) => !t.id.startsWith("premade-") || used.has(t.name) || planIds.includes(t.id)
  );
  const pool = own.length > 0 ? own : withExercises;
  if (pool.length === 0) return null;

  const scored = pool.map((template, order) => ({
    template,
    readiness: readinessScore(recovery, templateMuscles(template)),
    lastDone: lastUsedDate(workouts, template.name),
    order,
  }));
  scored.sort(
    (a, b) =>
      // Steps of 10, so 96% and 100% count as equally ready.
      Math.round(b.readiness / 10) - Math.round(a.readiness / 10) ||
      // Never done sorts as oldest.
      (a.lastDone ?? "").localeCompare(b.lastDone ?? "") ||
      a.order - b.order
  );
  const { template, readiness, lastDone } = scored[0];
  return { template, readiness, lastDone };
}
