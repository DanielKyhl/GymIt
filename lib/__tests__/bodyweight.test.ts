import { startingWeight } from "../bodyweight";
import { countPRs } from "../gamification";
import { estimate1RM, workoutVolume } from "../stats";
import { set, workout } from "./fixtures";

const me = { value: 80, unit: "kg" as const };

describe("startingWeight", () => {
  test("bodyweight exercises start at your body weight", () => {
    expect(startingWeight("Pullups", me, "kg")).toBe(80);
    expect(startingWeight("Pushups", me, "kg")).toBe(80);
  });

  test("converted when the workout uses the other unit", () => {
    expect(startingWeight("Pullups", me, "lb")).toBe(176.4);
  });

  test("weighted exercises start empty", () => {
    expect(startingWeight("Barbell Bench Press - Medium Grip", me, "kg")).toBe(0);
    // A weighted variant is not a bodyweight exercise.
    expect(startingWeight("Weighted Pull Ups", me, "kg")).toBe(0);
  });

  test("stretches don't count as lifting your body weight", () => {
    expect(startingWeight("90/90 Hamstring", me, "kg")).toBe(0);
    expect(startingWeight("All Fours Quad Stretch", me, "kg")).toBe(0);
  });

  test("without a saved body weight everything starts empty", () => {
    expect(startingWeight("Pullups", null, "kg")).toBe(0);
  });
});

describe("bodyweight sets count like any other lift", () => {
  const pullups = (reps: number, date: string) =>
    workout("Pull", date, [{ name: "Pullups", sets: [set(80, reps)] }]);

  test("they add volume and an estimated 1RM", () => {
    expect(workoutVolume(pullups(10, "2026-09-07T08:00:00.000Z"))).toBe(800);
    expect(estimate1RM(80, 10)).toBe(107);
  });

  test("more reps at the same body weight is a PR", () => {
    const history = [
      pullups(12, "2026-09-09T16:00:00.000Z"),
      pullups(10, "2026-09-07T08:00:00.000Z"),
    ];
    expect(countPRs(history)).toBe(1);
  });
});
