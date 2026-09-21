export type Unit = "kg" | "lb";

const LB_PER_KG = 2.20462;

// Convert a weight between units, rounded to one decimal.
export function convertWeight(value: number, from: Unit, to: Unit): number {
  if (from === to) return value;
  const converted = from === "kg" ? value * LB_PER_KG : value / LB_PER_KG;
  return Math.round(converted * 10) / 10;
}

// Read a typed number. Accepts "80.5" and "80,5" (a Danish keypad types a
// comma) and half-typed input like "32," while someone is mid-entry. Returns
// null for anything that isn't a positive number.
export function parseNumber(text: string): number | null {
  const value = Number(text.trim().replace(",", "."));
  return text.trim() !== "" && Number.isFinite(value) && value > 0 ? value : null;
}

// Same rules, named for where it's used most.
export const parseWeight = parseNumber;

// Workouts store weights in whatever unit was active when they were logged.
// Anything that compares or adds weights across workouts (progress, PRs,
// volume) must see them in one unit, or switching kg/lb mixes the numbers.
export function normalizeUnits<W extends WorkoutLike>(workouts: W[], unit: Unit): W[] {
  return workouts.map((w) =>
    w.unit === unit
      ? w
      : {
          ...w,
          unit,
          exercises: w.exercises.map((ex) => ({
            ...ex,
            sets: ex.sets.map((s) => ({ ...s, weight: convertWeight(s.weight, w.unit, unit) })),
          })),
        }
  );
}

type WorkoutLike = {
  unit: Unit;
  exercises: { sets: { weight: number }[] }[];
};
