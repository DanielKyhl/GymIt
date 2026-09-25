import { addWeighIn, todayKey, weighInsIn } from "../bodyweight";
import { computeRecovery, readinessScore, templateMuscles } from "../recovery";
import { consistencyGrid, monthGrid, weeklyMuscleSets, workoutsByDay } from "../stats";
import { suggestTemplate } from "../suggest";
import { Template } from "../../types/workout";
import { set, workout } from "./fixtures";

const BENCH = "Barbell Bench Press - Medium Grip"; // primary: chest
const SQUAT = "Barbell Squat"; // primary: quadriceps
const PULLUP = "Pullups"; // primary: lats (upper back)

const HOUR = 60 * 60 * 1000;
// A Wednesday, midday local time.
const NOW = new Date(2026, 8, 16, 12, 0, 0).getTime();
const at = (daysAgo: number, hour = 12) => {
  const d = new Date(NOW);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - daysAgo, hour).toISOString();
};

describe("consistencyGrid", () => {
  test("columns are weeks, oldest first, Monday to Sunday", () => {
    const grid = consistencyGrid([], 3, NOW);
    expect(grid).toHaveLength(3);
    expect(grid.every((week) => week.length === 7)).toBe(true);
    expect(grid[2][0].date).toBe("2026-09-14"); // this week's Monday
    expect(grid[0][0].date).toBe("2026-08-31");
  });

  test("counts workouts per local day and marks today and the future", () => {
    const w = [
      workout("A", at(0, 7), []),
      workout("B", at(0, 18), []),
      workout("C", at(2), []), // Monday
      workout("D", at(30), []), // outside the grid
    ];
    const week = consistencyGrid(w, 1, NOW)[0];
    expect(week.map((c) => c.count)).toEqual([1, 0, 2, 0, 0, 0, 0]);
    expect(week.map((c) => c.today)).toEqual([false, false, true, false, false, false, false]);
    expect(week.map((c) => c.future)).toEqual([false, false, false, true, true, true, true]);
  });
});

describe("monthGrid", () => {
  test("weeks run Monday to Sunday, padded with empty days", () => {
    const weeks = monthGrid(2026, 8, NOW); // September 2026 starts on a Tuesday
    expect(weeks).toHaveLength(5);
    expect(weeks.every((w) => w.length === 7)).toBe(true);
    expect(weeks[0][0]).toBeNull();
    expect(weeks[0][1]).toEqual({ date: "2026-09-01", day: 1, today: false, future: false });
    expect(weeks[4].filter(Boolean).map((d) => d!.day)).toEqual([28, 29, 30]);
  });

  test("marks today and the days after it", () => {
    const days = monthGrid(2026, 8, NOW).flat().filter(Boolean);
    expect(days.find((d) => d!.today)?.date).toBe("2026-09-16");
    expect(days.find((d) => d!.day === 15)?.future).toBe(false);
    expect(days.find((d) => d!.day === 17)?.future).toBe(true);
  });

  test("knows month lengths, and a month can start on a Sunday", () => {
    const feb = monthGrid(2026, 1, NOW).flat();
    expect(feb.slice(0, 7).map((d) => d?.day ?? null)).toEqual([null, null, null, null, null, null, 1]);
    expect(feb.filter(Boolean)).toHaveLength(28);
  });

  test("no day goes missing when the clocks change", () => {
    const march = monthGrid(2026, 2, NOW).flat().filter(Boolean).map((d) => d!.date);
    expect(march).toHaveLength(31);
    expect(march.slice(27)).toEqual(["2026-03-28", "2026-03-29", "2026-03-30", "2026-03-31"]);
  });
});

describe("workoutsByDay", () => {
  test("groups by local calendar day", () => {
    const w = [workout("A", at(0, 18), []), workout("B", at(0, 7), []), workout("C", at(1), [])];
    const byDay = workoutsByDay(w);
    expect(byDay.get("2026-09-16")?.map((x) => x.name)).toEqual(["A", "B"]);
    expect(byDay.get("2026-09-15")?.map((x) => x.name)).toEqual(["C"]);
  });
});

describe("weeklyMuscleSets", () => {
  const sets = (w: Parameters<typeof weeklyMuscleSets>[0]) =>
    Object.fromEntries(weeklyMuscleSets(w, NOW).map((m) => [m.slug, m.sets]));

  test("counts finished working sets for primary muscles in the last 7 days", () => {
    const w = [
      workout("Push", at(1), [
        { name: BENCH, sets: [set(60, 10, { type: "warmup" }), set(100, 5), set(100, 5), set(100, 5, { done: false })] },
      ]),
      workout("Push", at(5), [{ name: BENCH, sets: [set(100, 5)] }]),
      workout("Push", at(9), [{ name: BENCH, sets: [set(100, 5)] }]), // too old
      workout("Legs", at(2), [{ name: SQUAT, sets: [set(100, 5), set(100, 5)] }]),
    ];
    const s = sets(w);
    expect(s.chest).toBe(3);
    expect(s.quadriceps).toBe(2);
    expect(s.triceps).toBe(0); // secondary for bench: not counted
  });

  test("always lists the main muscles, most trained first", () => {
    const list = weeklyMuscleSets([workout("Pull", at(1), [{ name: PULLUP, sets: [set(0, 8)] }])], NOW);
    expect(list[0]).toEqual({ slug: "upper-back", sets: 1 });
    expect(list.map((m) => m.slug)).toEqual(expect.arrayContaining(["chest", "quadriceps", "abs"]));
  });
});

describe("readiness", () => {
  const recovery = computeRecovery([workout("Legs", new Date(NOW - 2 * HOUR).toISOString(), [
    { name: SQUAT, sets: [set(100, 5)] },
  ])], NOW);

  test("is 100 with nothing trained", () => {
    expect(readinessScore(computeRecovery([], NOW))).toBe(100);
  });

  test("drops for the muscles you just trained", () => {
    expect(readinessScore(recovery, ["quadriceps"])).toBeLessThan(10);
    expect(readinessScore(recovery, ["chest"])).toBe(100);
    const overall = readinessScore(recovery);
    expect(overall).toBeGreaterThan(50);
    expect(overall).toBeLessThan(100);
  });

  test("templateMuscles lists each primary muscle once", () => {
    const t: Template = { id: "t", name: "T", exercises: [{ name: BENCH }, { name: BENCH }, { name: SQUAT }] };
    expect(templateMuscles(t).sort()).toEqual(["chest", "quadriceps"]);
  });
});

describe("suggestTemplate", () => {
  const push: Template = { id: "t1", name: "Push", exercises: [{ name: BENCH }] };
  const legs: Template = { id: "t2", name: "Legs", exercises: [{ name: SQUAT }] };
  const pull: Template = { id: "t3", name: "Pull", exercises: [{ name: PULLUP }] };
  const example: Template = { id: "premade-full", name: "Full Body", exercises: [{ name: SQUAT }] };

  test("picks the most recovered template", () => {
    const w = [workout("Push", new Date(NOW - 3 * HOUR).toISOString(), [{ name: BENCH, sets: [set(100, 5)] }])];
    const s = suggestTemplate([push, legs], w, computeRecovery(w, NOW));
    expect(s?.template.name).toBe("Legs");
    expect(s?.readiness).toBe(100);
  });

  test("when all are recovered, the one done longest ago wins", () => {
    const w = [
      workout("Legs", at(4), [{ name: SQUAT, sets: [set(100, 5)] }]),
      workout("Push", at(6), [{ name: BENCH, sets: [set(100, 5)] }]),
    ];
    const s = suggestTemplate([push, legs], w, computeRecovery(w, NOW));
    expect(s?.template.name).toBe("Push");
    expect(s?.lastDone).toBe(at(6));
  });

  test("skips examples you've never used, unless there's nothing else", () => {
    const w = [workout("Push", at(6), [{ name: BENCH, sets: [set(100, 5)] }])];
    expect(suggestTemplate([example, push, pull], w, computeRecovery(w, NOW))?.template.name).toBe("Pull");
    expect(suggestTemplate([example], [], computeRecovery([], NOW))?.template.name).toBe("Full Body");
    expect(suggestTemplate([], [], [])).toBeNull();
  });

  test("follows the plan picked during setup, then its rotation", () => {
    const upper: Template = { id: "premade-upper", name: "Upper", exercises: [{ name: BENCH }] };
    const lower: Template = { id: "premade-lower", name: "Lower", exercises: [{ name: SQUAT }] };
    const examplePush: Template = { id: "premade-push", name: "Push", exercises: [{ name: BENCH }] };
    const all = [examplePush, upper, lower];
    const plan = ["premade-upper", "premade-lower"];
    expect(suggestTemplate(all, [], computeRecovery([], NOW), plan)?.template.name).toBe("Upper");
    const done = [workout("Upper", new Date(NOW - 20 * HOUR).toISOString(), [{ name: BENCH, sets: [set(60, 8)] }])];
    expect(suggestTemplate(all, done, computeRecovery(done, NOW), plan)?.template.name).toBe("Lower");
  });
});

describe("body-weight log", () => {
  test("one weigh-in per day, the latest wins, oldest first", () => {
    let log = addWeighIn([], { date: "2026-09-02", value: 80, unit: "kg" });
    log = addWeighIn(log, { date: "2026-09-01", value: 81, unit: "kg" });
    log = addWeighIn(log, { date: "2026-09-02", value: 79.5, unit: "kg" });
    expect(log).toEqual([
      { date: "2026-09-01", value: 81, unit: "kg" },
      { date: "2026-09-02", value: 79.5, unit: "kg" },
    ]);
  });

  test("converts to one unit for the chart", () => {
    expect(weighInsIn([{ date: "2026-09-01", value: 180, unit: "lb" }], "kg")).toEqual([
      { date: "2026-09-01", value: 81.6 },
    ]);
  });

  test("todayKey is the local calendar day", () => {
    expect(todayKey(new Date(2026, 0, 5, 23, 30).getTime())).toBe("2026-01-05");
  });
});
