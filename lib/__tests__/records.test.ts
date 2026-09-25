import { countPRs } from "../gamification";
import { newRecords, prHistory, workoutRecords } from "../stats";
import { Workout, WorkoutSet } from "../../types/workout";
import { set, workout } from "./fixtures";

const BENCH = "Bench";
const PULLUP = "Pullups"; // a bodyweight exercise

// September the nth, mid-morning.
const day = (n: number) => `2026-09-${String(n).padStart(2, "0")}T10:00:00.000Z`;
const bench = (n: number, ...sets: WorkoutSet[]) => workout("Push", day(n), [{ name: BENCH, sets }]);
// History goes newest first, as storage keeps it.
const recordsOf = (history: Workout[], w: Workout) => workoutRecords(history).get(w.id) ?? [];

describe("a PR is beating an exercise's best total", () => {
  const first = bench(1, set(90, 7), set(90, 6)); // 1,170 kg

  test("90×7, 90×6 then 90×7, 90×7 is a PR, +90 kg", () => {
    const next = bench(3, set(90, 7), set(90, 7));
    expect(recordsOf([next, first], next)).toEqual([
      { exercise: BENCH, pr: { total: 1260, previous: 1170, inReps: false } },
    ]);
  });

  test("95×5, 95×5 is less in total: no PR, only a first-time-at-95 milestone", () => {
    const next = bench(3, set(95, 5), set(95, 5));
    expect(recordsOf([next, first], next)).toEqual([{ exercise: BENCH, milestone: { weight: 95, previous: 90 } }]);
  });

  test("an extra set that takes the total past the best is a PR", () => {
    const next = bench(3, set(90, 7), set(90, 6), set(80, 5));
    expect(recordsOf([next, first], next)[0].pr).toEqual({ total: 1570, previous: 1170, inReps: false });
  });

  test("it has to beat the best ever, not just last time", () => {
    const best = bench(3, set(90, 7), set(90, 7)); // 1,260
    const dip = bench(5, set(90, 7), set(90, 6)); // 1,170
    const today = bench(7, set(90, 7), set(90, 6), set(10, 3)); // 1,200
    expect(recordsOf([today, dip, best, first], today)).toEqual([]);
  });

  test("the first time at 100 kg is a milestone even with a lower total", () => {
    const next = bench(3, set(100, 3), set(100, 2));
    expect(recordsOf([next, first], next)).toEqual([{ exercise: BENCH, milestone: { weight: 100, previous: 90 } }]);
  });

  test("a PR and a milestone on one exercise count as one PR", () => {
    const next = bench(3, set(100, 7), set(90, 7)); // 1,330 kg, and heavier than ever
    expect(recordsOf([next, first], next)).toEqual([
      {
        exercise: BENCH,
        pr: { total: 1330, previous: 1170, inReps: false },
        milestone: { weight: 100, previous: 90 },
      },
    ]);
    expect(countPRs([next, first])).toBe(1);
  });

  test("milestones never count as PRs", () => {
    expect(countPRs([bench(3, set(100, 3)), first])).toBe(0);
  });

  test("warm-ups and sets not ticked off count for nothing", () => {
    const next = bench(
      3,
      set(140, 1, { type: "warmup" }),
      set(90, 7),
      set(90, 6),
      set(90, 8, { done: false })
    );
    expect(recordsOf([next, first], next)).toEqual([]);
  });

  test("the first time you do an exercise is only its baseline", () => {
    expect(workoutRecords([first]).size).toBe(0);
  });

  test("an exercise done twice in one workout counts all its sets", () => {
    const next = workout("Push", day(3), [
      { name: BENCH, sets: [set(90, 7)] },
      { name: BENCH, sets: [set(90, 7)] },
    ]);
    expect(recordsOf([next, first], next)[0].pr?.total).toBe(1260);
  });

  test("deleting a workout re-scores the ones after it", () => {
    const a = bench(3, set(90, 7), set(90, 7)); // 1,260
    const b = bench(5, set(90, 7), set(90, 7), set(90, 1)); // 1,350
    expect(countPRs([b, a, first])).toBe(2);
    expect(countPRs([b, first])).toBe(1);
    expect(recordsOf([b, first], b)[0].pr?.previous).toBe(1170);
  });
});

describe("bodyweight exercises count reps", () => {
  const pullups = (n: number, bodyWeight: number, ...reps: number[]) =>
    workout("Pull", day(n), [{ name: PULLUP, sets: reps.map((r) => set(bodyWeight, r)) }]);

  test("10, 9, 8 then 10, 10, 8 is a PR, +1 rep", () => {
    const first = pullups(1, 80, 10, 9, 8);
    const next = pullups(3, 80, 10, 10, 8);
    expect(recordsOf([next, first], next)).toEqual([
      { exercise: PULLUP, pr: { total: 28, previous: 27, inReps: true } },
    ]);
  });

  test("weighing more doesn't turn the same reps into a PR or a milestone", () => {
    const first = pullups(1, 80, 10, 9, 8);
    const next = pullups(3, 83, 10, 9, 8);
    expect(recordsOf([next, first], next)).toEqual([]);
  });
});

describe("newRecords", () => {
  test("a just-finished workout against everything before it", () => {
    const past = [bench(1, set(90, 7), set(90, 6))];
    const today = workout("Push", day(3), [
      { name: BENCH, sets: [set(90, 7), set(90, 7)] },
      { name: "Squat", sets: [set(100, 5)] }, // first time: baseline
    ]);
    expect(newRecords(past, today)).toEqual([
      { exercise: BENCH, pr: { total: 1260, previous: 1170, inReps: false } },
    ]);
  });
});

describe("prHistory", () => {
  test("every PR one exercise set, newest first", () => {
    const history = [
      bench(7, set(100, 7), set(100, 7)), // 1,400: PR
      bench(5, set(80, 5)), // 400
      bench(3, set(90, 7), set(90, 7)), // 1,260: PR
      bench(1, set(90, 7), set(90, 6)), // 1,170: baseline
    ];
    expect(prHistory(history, BENCH)).toEqual([
      { date: day(7), total: 1400, previous: 1260, inReps: false },
      { date: day(3), total: 1260, previous: 1170, inReps: false },
    ]);
  });
});
