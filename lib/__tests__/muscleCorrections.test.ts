import { exercises } from "../exercises";
import { stabiliserMuscles } from "../muscleCorrections";
import { COLOR_PARTIAL, COLOR_RECOVERED, COLOR_TRAINED, computeRecovery } from "../recovery";
import { set, workout } from "./fixtures";

const HOUR = 60 * 60 * 1000;
const NOW = new Date("2026-09-09T12:00:00.000Z").getTime();
const hoursAgo = (h: number) => new Date(NOW - h * HOUR).toISOString();

const byName = (name: string) => {
  const found = exercises.find((e) => e.name === name);
  if (!found) throw new Error(`missing fixture exercise: ${name}`);
  return found;
};

const lift = (name: string, date: string) =>
  workout("Session", date, [{ name, sets: [set(100, 5)] }]);

const muscle = (name: string, hours: number, slug: string) =>
  computeRecovery([lift(name, hoursAgo(hours))], NOW).find((m) => m.slug === slug)!;

describe("stabiliserMuscles", () => {
  test("braced compounds train the core", () => {
    expect(stabiliserMuscles(byName("Barbell Deadlift"))).toContain("abs");
    expect(stabiliserMuscles(byName("Barbell Full Squat"))).toContain("abs");
    expect(stabiliserMuscles(byName("Barbell Front Squat"))).toContain("abs");
    expect(stabiliserMuscles(byName("Standing Military Press"))).toContain("abs");
    expect(stabiliserMuscles(byName("Barbell Bent Over Row"))).toContain("abs");
  });

  test("supported and isolation work does not", () => {
    for (const name of [
      "Barbell Bench Press",
      "Barbell Curl",
      "Sled 45° Leg Press",
      "Lever Lying Leg Curl",
      "Cable Pushdown",
      "Cable Seated Row",
      "Lever Leg Extension",
    ]) {
      expect(stabiliserMuscles(byName(name))).toEqual([]);
    }
  });

  test("unilateral and rotational work hits the obliques", () => {
    expect(stabiliserMuscles(byName("Barbell Lunge"))).toContain("obliques");
    expect(stabiliserMuscles(byName("Dumbbell Side Bend"))).toContain("obliques");
  });

  test("obliques are reachable at all", () => {
    // Nothing in the source data maps to this slug, so before the corrections
    // it could never light up on the body model.
    const withObliques = exercises.filter((e) =>
      stabiliserMuscles(e).includes("obliques")
    );
    expect(withObliques.length).toBeGreaterThan(50);
  });
});

describe("recovery after braced lifts", () => {
  test("bracing shows the core as worked, never as just trained", () => {
    expect(muscle("Barbell Deadlift", 1, "abs").color).toBe(COLOR_PARTIAL);
    expect(muscle("Barbell Deadlift", 0, "abs").color).toBe(COLOR_PARTIAL);
  });

  test("bracing clears in a quarter of the time of direct ab work", () => {
    // abs base is 36h; bracing counts at a quarter, so 9h.
    expect(muscle("Barbell Deadlift", 1, "abs").hoursLeft).toBe(8);
    expect(muscle("Barbell Deadlift", 9, "abs").color).toBe(COLOR_RECOVERED);
  });

  test("core listed as a helper on a non-ab exercise counts as bracing too", () => {
    // ExerciseDB lists core as a secondary muscle of the back squat.
    expect(muscle("Barbell Full Squat", 1, "abs").color).toBe(COLOR_PARTIAL);
  });

  test("direct ab work still makes the core red", () => {
    expect(muscle("Crunch Floor", 1, "abs").color).toBe(COLOR_TRAINED);
    expect(muscle("Hanging Leg Raise", 1, "abs").color).toBe(COLOR_TRAINED);
  });

  test("a pull day with a standing row: core lightly worked, not red", () => {
    const pullDay = workout("Pull", hoursAgo(1), [
      { name: "Cable Bar Lateral Pulldown", sets: [set(60, 10)] },
      { name: "Cable Seated Row", sets: [set(55, 10)] },
      { name: "Lever Bent Over Row", sets: [set(40, 10)] }, // standing landmine row
      { name: "Face Pull", sets: [set(20, 15)] },
      { name: "Dumbbell Incline Biceps Curl", sets: [set(12, 10)] },
      { name: "Dumbbell Cross Body Hammer Curl", sets: [set(14, 10)] },
    ]);
    const colour = (slug: string) => computeRecovery([pullDay], NOW).find((m) => m.slug === slug)!.color;
    expect(colour("abs")).toBe(COLOR_PARTIAL);
    expect(colour("upper-back")).toBe(COLOR_TRAINED);
    expect(colour("biceps")).toBe(COLOR_TRAINED);
    // and none of the other five touch the core at all
    const withoutRow = workout("Pull", hoursAgo(1), pullDay.exercises.filter((e) => e.name !== "Lever Bent Over Row"));
    expect(computeRecovery([withoutRow], NOW).find((m) => m.slug === "abs")!.color).toBe(COLOR_RECOVERED);
  });

  test("a bench press leaves the core alone", () => {
    expect(muscle("Barbell Bench Press", 1, "abs").color).toBe(
      COLOR_RECOVERED
    );
  });

  test("deadlifts still train what they always did", () => {
    expect(muscle("Barbell Deadlift", 1, "lower-back").color).toBe(COLOR_TRAINED);
    expect(muscle("Barbell Deadlift", 1, "hamstring").color).toBe(COLOR_TRAINED);
  });
});
