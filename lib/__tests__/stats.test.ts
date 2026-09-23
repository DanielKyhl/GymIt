import {
    estimate1RM,
    getLastPerformance,
    getTrainedExercises,
    getVolumeByTemplate,
    lastUsedDate,
    weeklyMuscleSets,
    workoutVolume,
} from "../stats";
import { set, workout } from "./fixtures";

// Newest first — the order storage returns them in.
const history = [
  workout("Push", "2026-09-05", [{ name: "Bench", sets: [set(100, 5)] }]),
  workout("Legs", "2026-09-03", [{ name: "Squat", sets: [set(100, 5)] }]),
  workout("Push", "2026-09-01", [{ name: "Bench", sets: [set(90, 5)] }]),
];

describe("estimate1RM", () => {
  test("a single rep is just the weight", () => {
    expect(estimate1RM(100, 1)).toBe(100);
  });

  test("more reps estimate a higher max", () => {
    expect(estimate1RM(100, 10)).toBe(133); // 100 * (1 + 10/30)
  });

  test("returns 0 for empty sets", () => {
    expect(estimate1RM(0, 5)).toBe(0);
    expect(estimate1RM(100, 0)).toBe(0);
  });
});

describe("workoutVolume", () => {
  test("sums weight x reps", () => {
    const w = workout("Push", "2026-09-05", [
      { name: "Bench", sets: [set(100, 5), set(80, 10)] },
    ]);
    expect(workoutVolume(w)).toBe(1300);
  });

  test("ignores warm-up sets", () => {
    const w = workout("Push", "2026-09-05", [
      { name: "Bench", sets: [set(100, 5), set(40, 10, { type: "warmup" })] },
    ]);
    expect(workoutVolume(w)).toBe(500);
  });
});

describe("getVolumeByTemplate", () => {
  test("groups by template and orders points oldest first", () => {
    const groups = getVolumeByTemplate(history);
    const push = groups.find((g) => g.name === "Push")!;

    expect(groups.map((g) => g.name)).toEqual(["Push", "Legs"]);
    expect(push.points).toEqual([
      { date: "2026-09-01", volume: 450 },
      { date: "2026-09-05", volume: 500 },
    ]);
  });

  test("never mixes two templates into one series", () => {
    const groups = getVolumeByTemplate(history);
    expect(groups.find((g) => g.name === "Legs")!.points).toHaveLength(1);
  });
});

describe("getTrainedExercises", () => {
  test("keeps the best lift across every session", () => {
    const bench = getTrainedExercises(history).find((e) => e.name === "Bench")!;
    expect(bench.sessionCount).toBe(2);
    expect(bench.bestWeight).toBe(100);
    expect(bench.best1RM).toBe(117);
  });

  test("skips exercises that were only warmed up", () => {
    const w = workout("Push", "2026-09-05", [
      { name: "Flyes", sets: [set(10, 12, { type: "warmup" })] },
    ]);
    expect(getTrainedExercises([w])).toEqual([]);
  });
});

describe("lookups", () => {
  test("getLastPerformance returns the most recent working sets", () => {
    expect(getLastPerformance(history, "Bench")).toEqual([set(100, 5)]);
  });

  test("lastUsedDate finds the newest use of a template", () => {
    expect(lastUsedDate(history, "Push")).toBe("2026-09-05");
    expect(lastUsedDate(history, "Never Done")).toBeNull();
  });
});
describe("weekly sets count each exercise once", () => {
  const NOW = new Date("2026-09-20T12:00:00.000Z").getTime();
  const sets = (name: string, n: number) => ({ name, sets: Array.from({ length: n }, () => set(50, 10)) });
  const week = (...exercises: { name: string; sets: ReturnType<typeof set>[] }[]) =>
    weeklyMuscleSets([workout("W", "2026-09-19T18:00:00.000Z", exercises)], NOW);
  const count = (rows: ReturnType<typeof weeklyMuscleSets>, slug: string) => rows.find((r) => r.slug === slug)?.sets ?? 0;

  test("a row counts as Back, not Back and Traps", () => {
    const rows = week(sets("Cable Seated Row", 3));
    expect(count(rows, "upper-back")).toBe(3);
    expect(count(rows, "trapezius")).toBe(0);
  });

  test("shrugs count as Traps", () => {
    expect(count(week(sets("Barbell Shrug", 4)), "trapezius")).toBe(4);
  });
});
