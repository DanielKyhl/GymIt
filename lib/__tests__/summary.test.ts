import { summarizeWorkout } from "../summary";
import { set, workout } from "./fixtures";

const MON_10AM = "2026-09-07T08:00:00.000Z";
const WED_6PM = "2026-09-09T16:00:00.000Z";
const GOAL = 3;

describe("summarizeWorkout", () => {
  test("reports XP, volume and the first-workout achievement", () => {
    const first = workout("Push", MON_10AM, [
      { name: "Bench", sets: [set(100, 5), set(80, 5)] },
    ]);

    const s = summarizeWorkout([], first, GOAL);

    expect(s.xpGained).toBe(60); // 50 for the workout + 5 per working set
    expect(s.volume).toBe(900);
    expect(s.levelAfter).toBe(1);
    expect(s.leveledUp).toBe(false);
    expect(s.newAchievements).toContain("First Steps");
  });

  test("only counts achievements that were not already unlocked", () => {
    const first = workout("Push", MON_10AM, [
      { name: "Bench", sets: [set(100, 5)] },
    ]);
    const second = workout("Push", WED_6PM, [
      { name: "Bench", sets: [set(100, 5)] },
    ]);

    expect(summarizeWorkout([first], second, GOAL).newAchievements).not.toContain(
      "First Steps"
    );
  });

  test("credits a personal record against the previous best", () => {
    const past = [workout("Push", MON_10AM, [{ name: "Bench", sets: [set(90, 5)] }])];
    const heavier = workout("Push", WED_6PM, [
      { name: "Bench", sets: [set(100, 5)] },
    ]);

    const s = summarizeWorkout(past, heavier, GOAL);

    expect(s.newPRs).toBe(1);
    expect(s.xpGained).toBe(80); // 50 workout + 5 set + 25 PR
  });

  test("a first-ever session sets a baseline, not a PR", () => {
    const first = workout("Push", MON_10AM, [
      { name: "Bench", sets: [set(100, 5)] },
    ]);
    expect(summarizeWorkout([], first, GOAL).newPRs).toBe(0);
  });

  test("flags crossing a level boundary", () => {
    const tenSets = workout("Push", MON_10AM, [
      { name: "Bench", sets: Array.from({ length: 10 }, () => set(100, 5)) },
    ]);

    const s = summarizeWorkout([], tenSets, GOAL); // 50 + 10*5 = 100 XP

    expect(s.xpGained).toBe(100);
    expect(s.levelAfter).toBe(2);
    expect(s.leveledUp).toBe(true);
  });

  test("warm-ups add no XP and no volume", () => {
    const withWarmup = workout("Push", MON_10AM, [
      {
        name: "Bench",
        sets: [set(40, 10, { type: "warmup" }), set(100, 5)],
      },
    ]);

    const s = summarizeWorkout([], withWarmup, GOAL);

    expect(s.xpGained).toBe(55); // 50 workout + 5 for the one working set
    expect(s.volume).toBe(500);
  });
});
