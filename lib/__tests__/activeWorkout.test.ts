import {
  elapsedSeconds,
  formatClock,
  historyBest1RM,
  isLivePR,
  linkWithNext,
  nextSetType,
  platesPerSide,
  restAfterSet,
  unlinkFromNext,
  warmupSets,
} from "../activeWorkout";
import { WorkoutExercise } from "../../types/workout";
import { set, workout } from "./fixtures";

describe("timer", () => {
  test("counts from a start time, so it survives the app being backgrounded", () => {
    const start = 1_000_000;
    expect(elapsedSeconds(start, start + 125_900)).toBe(125);
    expect(formatClock(125)).toBe("02:05");
  });

  test("never goes negative if the clock moves backwards", () => {
    expect(elapsedSeconds(2_000, 1_000)).toBe(0);
  });
});

describe("nextSetType", () => {
  test("cycles normal, warm-up, drop, failure and back", () => {
    expect(nextSetType(undefined)).toBe("warmup");
    expect(nextSetType("warmup")).toBe("drop");
    expect(nextSetType("drop")).toBe("failure");
    expect(nextSetType("failure")).toBe("normal");
  });
});

describe("live PRs", () => {
  const past = [workout("Push", "2026-09-07T08:00:00.000Z", [{ name: "Bench", sets: [set(80, 8)] }])];
  const best = historyBest1RM(past, "Bench"); // 80 × 8 → 101

  const bench = (...sets: ReturnType<typeof set>[]): WorkoutExercise => ({ name: "Bench", sets });

  test("history best comes from past sessions", () => {
    expect(best).toBe(101);
  });

  test("a finished set beating history is a PR", () => {
    expect(isLivePR(bench(set(85, 7)), 0, best)).toBe(true);
  });

  test("unfinished sets, warm-ups and weaker sets are not", () => {
    expect(isLivePR(bench(set(85, 7, { done: false })), 0, best)).toBe(false);
    expect(isLivePR(bench(set(85, 7, { type: "warmup" })), 0, best)).toBe(false);
    expect(isLivePR(bench(set(80, 8)), 0, best)).toBe(false);
  });

  test("a set only counts if it also beats earlier sets today", () => {
    const today = bench(set(90, 6), set(85, 7));
    expect(isLivePR(today, 0, best)).toBe(true);
    expect(isLivePR(today, 1, best)).toBe(false);
  });

  test("a first-ever session is a baseline, not a PR", () => {
    expect(isLivePR(bench(set(85, 7)), 0, 0)).toBe(false);
  });
});

describe("supersets", () => {
  const ex = (name: string, supersetId?: string): WorkoutExercise => ({
    name,
    supersetId,
    sets: [set(20, 10, { restSeconds: 90 })],
  });

  test("rest waits until the last exercise of the round", () => {
    const list = [ex("Curl", "a"), ex("Pushdown", "a"), ex("Raise")];
    expect(restAfterSet(list, 0, 0)).toBe(0);
    expect(restAfterSet(list, 1, 0)).toBe(90);
    expect(restAfterSet(list, 2, 0)).toBe(90);
  });

  test("linking two loose exercises starts a new superset", () => {
    const linked = linkWithNext([ex("A"), ex("B"), ex("C")], 0, "new");
    expect(linked.map((e) => e.supersetId)).toEqual(["new", "new", undefined]);
  });

  test("linking into an existing superset joins that group", () => {
    const ids = linkWithNext([ex("A"), ex("B"), ex("C", "g"), ex("D", "g")], 1, "new").map(
      (e) => e.supersetId
    );
    expect(ids[0]).toBeUndefined();
    expect(new Set(ids.slice(1)).size).toBe(1);
    expect(ids[1]).toBeDefined();
  });

  test("unlinking splits a group; a lone leftover is no longer a superset", () => {
    const group = [ex("A", "g"), ex("B", "g"), ex("C", "g")];
    expect(unlinkFromNext(group, 0, "h").map((e) => e.supersetId)).toEqual([undefined, "h", "h"]);
    expect(unlinkFromNext(group, 1, "h").map((e) => e.supersetId)).toEqual(["g", "g", undefined]);
  });
});

describe("platesPerSide", () => {
  test("loads the heaviest plates first", () => {
    expect(platesPerSide(100, "kg", 20)).toEqual({ perSide: [25, 15], leftover: 0, belowBar: false });
    expect(platesPerSide(225, "lb", 45)).toEqual({ perSide: [45, 45], leftover: 0, belowBar: false });
  });

  test("reports weight that standard plates can't make", () => {
    expect(platesPerSide(61, "kg", 20).leftover).toBe(1);
  });

  test("the empty bar and less", () => {
    expect(platesPerSide(20, "kg", 20).perSide).toEqual([]);
    expect(platesPerSide(15, "kg", 20).belowBar).toBe(true);
  });
});

describe("warmupSets", () => {
  test("barbell: empty bar, then 40/60/80%", () => {
    expect(warmupSets(100, "kg", 20).map((s) => `${s.weight}×${s.reps}`)).toEqual([
      "20×10",
      "40×10",
      "60×5",
      "80×3",
    ]);
  });

  test("light weights skip steps that wouldn't be heavier", () => {
    expect(warmupSets(30, "kg", 20).map((s) => s.weight)).toEqual([20, 25]);
  });

  test("dumbbells have no bar step", () => {
    expect(warmupSets(30, "kg", 0).map((s) => s.weight)).toEqual([12.5, 17.5, 25]);
  });

  test("warm-ups are marked as warm-ups and not done", () => {
    expect(warmupSets(100, "kg", 20).every((s) => s.type === "warmup" && !s.done)).toBe(true);
  });
});
