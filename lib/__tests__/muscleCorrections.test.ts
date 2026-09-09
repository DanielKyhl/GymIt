import { exercises } from "../exercises";
import { stabiliserMuscles } from "../muscleCorrections";
import { COLOR_RECOVERED, COLOR_TRAINED, computeRecovery } from "../recovery";
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
    expect(stabiliserMuscles(byName("Barbell Squat"))).toContain("abs");
    expect(stabiliserMuscles(byName("Front Barbell Squat"))).toContain("abs");
    expect(stabiliserMuscles(byName("Standing Military Press"))).toContain("abs");
    expect(stabiliserMuscles(byName("Bent Over Barbell Row"))).toContain("abs");
  });

  test("supported and isolation work does not", () => {
    for (const name of [
      "Barbell Bench Press - Medium Grip",
      "Barbell Curl",
      "Leg Press",
      "Lying Leg Curls",
      "Triceps Pushdown",
      "Seated Cable Rows",
      "Leg Extensions",
    ]) {
      expect(stabiliserMuscles(byName(name))).toEqual([]);
    }
  });

  test("unilateral and rotational work hits the obliques", () => {
    expect(stabiliserMuscles(byName("Barbell Lunge"))).toContain("obliques");
    expect(stabiliserMuscles(byName("Barbell Side Bend"))).toContain("obliques");
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
  test("the core is red right after deadlifts", () => {
    expect(muscle("Barbell Deadlift", 1, "abs").color).toBe(COLOR_TRAINED);
  });

  test("bracing recovers in half the time of direct ab work", () => {
    // abs base is 36h; as a stabiliser it counts at half, so 18h.
    expect(muscle("Barbell Deadlift", 1, "abs").hoursLeft).toBe(17);
    expect(muscle("Barbell Deadlift", 19, "abs").color).toBe(COLOR_RECOVERED);
  });

  test("a bench press leaves the core alone", () => {
    expect(muscle("Barbell Bench Press - Medium Grip", 1, "abs").color).toBe(
      COLOR_RECOVERED
    );
  });

  test("deadlifts still train what they always did", () => {
    expect(muscle("Barbell Deadlift", 1, "lower-back").color).toBe(COLOR_TRAINED);
    expect(muscle("Barbell Deadlift", 1, "hamstring").color).toBe(COLOR_TRAINED);
  });
});
