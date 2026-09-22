import { getAchievements } from "../achievements";
import { WorkoutSet } from "../../types/workout";
import { set, workout } from "./fixtures";

const unlocked = (ws: Parameters<typeof getAchievements>[0], goal = 3) =>
  new Set(getAchievements(ws, goal).filter((a) => a.unlocked).map((a) => a.id));

// A local date-time, so day-of-week tests don't depend on the time zone.
const at = (y: number, m: number, d: number, h = 18) => new Date(y, m - 1, d, h).toISOString();
const sets = (n: number, weight = 50, reps = 10, extra: Partial<WorkoutSet> = {}) =>
  Array.from({ length: n }, () => set(weight, reps, extra));

describe("achievements", () => {
  test("there are 50, each with its own id", () => {
    const all = getAchievements([], 3);
    expect(all).toHaveLength(50);
    expect(new Set(all.map((a) => a.id)).size).toBe(50);
    expect(all.every((a) => !a.unlocked)).toBe(true);
  });

  test("big sessions: an elephant's weight and 30 sets in one workout", () => {
    const w = workout("Legs", at(2026, 9, 1), [{ name: "Squat", sets: sets(30, 100, 2) }]); // 6,000 kg, 30 sets
    const got = unlocked([w]);
    expect(got.has("session-elephant")).toBe(true);
    expect(got.has("sets-30")).toBe(true);
    expect(got.has("session-whale")).toBe(false);
  });

  test("lifetime landmarks use the total in kg, whatever unit was logged", () => {
    const lb = { ...workout("Legs", at(2026, 9, 1), [{ name: "Squat", sets: sets(1, 27_600, 1) }]), unit: "lb" as const };
    expect(unlocked([lb]).has("landmark-bus")).toBe(true); // 27,600 lb ≈ 12,519 kg
  });

  test("Weekend Warrior needs Saturday and the Sunday right after it", () => {
    const sat = workout("A", at(2026, 9, 19), [{ name: "Squat", sets: sets(1) }]); // a Saturday
    const sun = workout("B", at(2026, 9, 20), [{ name: "Squat", sets: sets(1) }]);
    const nextSun = workout("C", at(2026, 9, 27), [{ name: "Squat", sets: sets(1) }]);
    expect(unlocked([sat, sun]).has("weekend-warrior")).toBe(true);
    expect(unlocked([sat, nextSun]).has("weekend-warrior")).toBe(false);
  });

  test("Double Session is two workouts on the same day", () => {
    const am = workout("A", at(2026, 9, 1, 7), [{ name: "Squat", sets: sets(1) }]);
    const pm = workout("B", at(2026, 9, 1, 19), [{ name: "Bench", sets: sets(1) }]);
    expect(unlocked([am, pm]).has("double-day")).toBe(true);
    expect(unlocked([am]).has("double-day")).toBe(false);
  });

  test("Unbroken counts weeks in a row at the weekly goal", () => {
    // One workout on each of 8 consecutive Mondays, goal 1.
    const eight = Array.from({ length: 8 }, (_, i) => workout(`W${i}`, at(2026, 7, 6 + i * 7), [{ name: "Squat", sets: sets(1) }]));
    expect(unlocked(eight, 1).has("streak-8")).toBe(true);
    // Skip one week in the middle: two runs of 4.
    const gap = eight.filter((_, i) => i !== 4);
    expect(unlocked(gap, 1).has("streak-8")).toBe(false);
  });

  test("effort, supersets and strength", () => {
    const w = workout("Push", at(2026, 9, 1), [
      { name: "Bench", sets: [set(100, 1, { rpe: 10 })] },
    ]);
    const ss = { ...w, exercises: [{ ...w.exercises[0], supersetId: "s" }] };
    expect(unlocked([w]).has("rpe-10")).toBe(true);
    expect(unlocked([w]).has("triple-digits")).toBe(true);
    expect(unlocked([ss]).has("superset")).toBe(true);
    expect(unlocked([w]).has("superset")).toBe(false);
  });
});
