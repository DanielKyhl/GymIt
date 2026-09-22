import { addWeighIn, todayKey, weighInsIn } from "../bodyweight";
import { computeRecovery, readinessScore, templateMuscles } from "../recovery";
import { consistencyGrid, newRecords, prHistory, weeklyMuscleSets } from "../stats";
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

describe("prHistory", () => {
  // Newest first, as storage returns them.
  const history = [
    workout("Push", "2026-09-10", [{ name: BENCH, sets: [set(100, 5)] }]), // 117
    workout("Push", "2026-09-07", [{ name: BENCH, sets: [set(90, 5)] }]), // 105, not a record
    workout("Push", "2026-09-04", [{ name: BENCH, sets: [set(95, 6), set(60, 12, { type: "warmup" })] }]), // 114
    workout("Push", "2026-09-01", [{ name: BENCH, sets: [set(90, 5)] }]), // 105, baseline
  ];

  test("lists each time the estimated 1RM went up, newest first", () => {
    expect(prHistory(history, BENCH)).toEqual([
      { date: "2026-09-10", weight: 100, reps: 5, oneRM: 117, previous: 114 },
      { date: "2026-09-04", weight: 95, reps: 6, oneRM: 114, previous: 105 },
    ]);
  });

  test("the first session is only a baseline", () => {
    expect(prHistory(history.slice(-1), BENCH)).toEqual([]);
  });

  test("warm-ups never count", () => {
    const w = [
      workout("Push", "2026-09-02", [{ name: BENCH, sets: [set(200, 5, { type: "warmup" }), set(80, 5)] }]),
      workout("Push", "2026-09-01", [{ name: BENCH, sets: [set(90, 5)] }]),
    ];
    expect(prHistory(w, BENCH)).toEqual([]);
  });
});

describe("newRecords", () => {
  const past = [workout("Push", "2026-09-01", [{ name: BENCH, sets: [set(90, 5)] }])];

  test("names the exercises that beat their best, with the set that did it", () => {
    const today = workout("Push", "2026-09-05", [
      { name: BENCH, sets: [set(92.5, 5), set(80, 8)] },
      { name: SQUAT, sets: [set(100, 5)] }, // first time: no record
    ]);
    expect(newRecords(past, today)).toEqual([
      { name: BENCH, date: "2026-09-05", weight: 92.5, reps: 5, oneRM: 108, previous: 105 },
    ]);
  });

  test("matching your best isn't a record", () => {
    const today = workout("Push", "2026-09-05", [{ name: BENCH, sets: [set(90, 5)] }]);
    expect(newRecords(past, today)).toEqual([]);
  });
});

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
