import {
  ActiveWorkout,
  elapsedSeconds,
  formatClock,
  formatRest,
  historyBests,
  isLiveMilestone,
  isLivePR,
  linkWithNext,
  loggedExercises,
  MAX_REST,
  movedIndex,
  moveExercise,
  platesPerSide,
  restAfterSet,
  restFromParts,
  restJustEnded,
  fillBlankTemplate,
  setNumber,
  templateAfterWorkout,
  toggleSet,
  unlinkFromNext,
  warmupSets,
} from "../activeWorkout";
import { WorkoutExercise, WorkoutSet } from "../../types/workout";
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

describe("ringing when a rest is up", () => {
  const rest = { startedAt: 1_000_000, target: 90, exIndex: 0, setIndex: 0 };
  const at = (seconds: number) => rest.startedAt + seconds * 1000;

  test("rings right as it runs out", () => {
    expect(restJustEnded(rest, at(89.9))).toBe(false);
    expect(restJustEnded(rest, at(90))).toBe(true);
    expect(restJustEnded(rest, at(92.5))).toBe(true);
  });

  test("not when you come back to the app after it ran out", () => {
    // The phone was locked, so the app couldn't ring when it ran out.
    expect(restJustEnded(rest, at(93))).toBe(false);
    expect(restJustEnded(rest, at(600))).toBe(false);
  });
});

describe("set numbers and rest labels", () => {
  test("warm-ups aren't numbered, working sets count from 1", () => {
    const sets = [set(20, 10, { type: "warmup" }), set(40, 5, { type: "warmup" }), set(60, 8), set(60, 8, { type: "drop" })];
    expect(sets.map((_, i) => setNumber(sets, i))).toEqual([0, 0, 1, 2]);
  });

  test("rest reads like a clock", () => {
    expect(formatRest(90)).toBe("1:30");
    expect(formatRest(45)).toBe("0:45");
  });
});

describe("typing in a rest", () => {
  test("minutes and seconds make the rest length", () => {
    expect(restFromParts(2, 30)).toBe(150);
    expect(restFromParts(0, 45)).toBe(45);
    expect(restFromParts(3, 0)).toBe(180);
    expect(restFromParts(0, 0)).toBe(0);
  });

  test("seconds past 59 carry into minutes", () => {
    expect(restFromParts(0, 90)).toBe(90);
    expect(formatRest(restFromParts(1, 75))).toBe("2:15");
  });

  test("whole seconds only, and it tops out just under an hour", () => {
    expect(restFromParts(1.5, 5.9)).toBe(65);
    expect(restFromParts(99, 99)).toBe(MAX_REST);
    expect(formatRest(MAX_REST)).toBe("59:59");
  });
});

describe("loggedExercises", () => {
  test("leaves out sets never filled in, and exercises left empty", () => {
    const logged = loggedExercises([
      { name: "Squat", sets: [set(60, 8), set(60, 8, { done: false }), set(0, 0, { done: false })] },
      { name: "Bench", sets: [set(0, 0, { done: false })] },
    ]);
    expect(logged).toEqual([{ name: "Squat", sets: [set(60, 8), set(60, 8, { done: false })] }]);
  });
});

describe("toggleSet and the rest timer", () => {
  const workoutWith = (exercises: WorkoutExercise[]): ActiveWorkout => ({
    templateId: null, name: "W", startedAt: 0, unit: "kg", rest: null, exercises,
  });
  const bench: WorkoutExercise = {
    name: "Bench",
    sets: [set(60, 8, { done: false, restSeconds: 90 }), set(60, 8, { done: false, restSeconds: 90 })],
  };

  test("ticking a set starts its rest, under that set", () => {
    const a = toggleSet(workoutWith([bench]), 0, 0, 5_000);
    expect(a.exercises[0].sets[0].done).toBe(true);
    expect(a.rest).toEqual({ startedAt: 5_000, target: 90, exIndex: 0, setIndex: 0 });
  });

  test("the next set replaces the running rest", () => {
    const a = toggleSet(toggleSet(workoutWith([bench]), 0, 0, 5_000), 0, 1, 80_000);
    expect(a.rest).toEqual({ startedAt: 80_000, target: 90, exIndex: 0, setIndex: 1 });
  });

  test("unticking stops its own rest, but not another set's", () => {
    const one = toggleSet(workoutWith([bench]), 0, 0, 5_000);
    expect(toggleSet(one, 0, 0, 6_000).rest).toBeNull();
    const two = toggleSet(one, 0, 1, 7_000);
    expect(toggleSet(two, 0, 0, 8_000).rest?.setIndex).toBe(1);
  });

  test("no rest inside a superset round", () => {
    const a = { ...bench, supersetId: "s" };
    const b = { ...bench, name: "Row", supersetId: "s" };
    expect(toggleSet(workoutWith([a, b]), 0, 0, 1_000).rest).toBeNull();
    expect(toggleSet(workoutWith([a, b]), 1, 0, 1_000).rest?.target).toBe(90);
  });
});

describe("live PRs", () => {
  const past = [workout("Push", "2026-09-07T08:00:00.000Z", [{ name: "Bench", sets: [set(90, 7), set(90, 6)] }])];
  const bests = historyBests(past, "Bench");

  const bench = (...sets: ReturnType<typeof set>[]): WorkoutExercise => ({ name: "Bench", sets });

  test("history bests are the best total and heaviest weight so far", () => {
    expect(bests).toEqual({ total: 1170, heaviest: 90 });
  });

  test("the badge goes on the set that takes today's total past the best", () => {
    const today = bench(set(90, 7), set(90, 7), set(90, 5)); // 630, 1,260, 1,710
    expect([0, 1, 2].map((i) => isLivePR(today, i, bests.total))).toEqual([false, true, false]);
  });

  test("unfinished sets and warm-ups add nothing", () => {
    const today = bench(set(90, 7), set(90, 7, { done: false }), set(90, 7, { type: "warmup" }));
    expect([0, 1, 2].map((i) => isLivePR(today, i, bests.total))).toEqual([false, false, false]);
  });

  test("a first-ever session is a baseline, not a PR", () => {
    expect(isLivePR(bench(set(90, 7), set(90, 7)), 1, 0)).toBe(false);
  });

  test("a dumbbell exercise counts both dumbbells, in today's total and the best alike", () => {
    const curls = (...sets: ReturnType<typeof set>[]): WorkoutExercise => ({ name: "Dumbbell Hammer Curl", sets });
    const past = [workout("Pull", "2026-09-29T08:00:00.000Z", [curls(set(16, 22), set(16, 22), set(16, 20))])];
    const best = historyBests(past, "Dumbbell Hammer Curl");
    expect(best).toEqual({ total: 2048, heaviest: 16 }); // 16 kg × 64 reps, twice
    const today = curls(set(16, 22), set(16, 22), set(16, 21)); // 704, 1,408, 2,080
    expect([0, 1, 2].map((i) => isLivePR(today, i, best.total))).toEqual([false, false, true]);
  });

  test("the first set at a weight never lifted before gets the milestone note", () => {
    const today = bench(set(95, 5), set(95, 5), set(100, 2));
    expect([0, 1, 2].map((i) => isLiveMilestone(today, i, bests.heaviest))).toEqual([true, false, true]);
  });

  test("bodyweight exercises never do: the weight is your own", () => {
    expect(isLiveMilestone({ name: "Pullups", sets: [set(85, 5)] }, 0, 80)).toBe(false);
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

describe("moving an exercise", () => {
  const ex = (name: string, supersetId?: string): WorkoutExercise => ({
    name,
    supersetId,
    sets: [set(20, 10, { restSeconds: 90 })],
  });
  const workoutOf = (exercises: WorkoutExercise[], rest: ActiveWorkout["rest"] = null): ActiveWorkout => ({
    templateId: null, name: "W", startedAt: 0, unit: "kg", rest, exercises,
  });
  const names = (a: ActiveWorkout) => a.exercises.map((e) => e.name);
  const ids = (a: ActiveWorkout) => a.exercises.map((e) => e.supersetId);

  test("moves it down or up, keeping the others in order", () => {
    const a = workoutOf([ex("A"), ex("B"), ex("C"), ex("D")]);
    expect(names(moveExercise(a, 0, 2))).toEqual(["B", "C", "A", "D"]);
    expect(names(moveExercise(a, 3, 1))).toEqual(["A", "D", "B", "C"]);
    expect(moveExercise(a, 1, 1)).toBe(a);
    expect(moveExercise(a, 1, 9)).toBe(a);
  });

  test("tells where every other exercise ends up", () => {
    // A B C D with A moved to 2: B C A D
    expect([0, 1, 2, 3].map((i) => movedIndex(i, 0, 2))).toEqual([2, 0, 1, 3]);
    // A B C D with D moved to 1: A D B C
    expect([0, 1, 2, 3].map((i) => movedIndex(i, 3, 1))).toEqual([0, 2, 3, 1]);
  });

  test("a running rest stays under the set it follows", () => {
    const rest = { startedAt: 1, target: 90, exIndex: 1, setIndex: 0 };
    const a = moveExercise(workoutOf([ex("A"), ex("B"), ex("C")], rest), 1, 2);
    expect(a.rest).toEqual({ ...rest, exIndex: 2 });
    expect(a.exercises[a.rest!.exIndex].name).toBe("B");
    expect(moveExercise(workoutOf([ex("A"), ex("B")]), 0, 1).rest).toBeNull();
  });

  test("moving one away from its superset partner ends the superset", () => {
    const a = moveExercise(workoutOf([ex("A", "s"), ex("B", "s"), ex("C")]), 0, 2);
    expect(names(a)).toEqual(["B", "C", "A"]);
    expect(ids(a)).toEqual([undefined, undefined, undefined]);
  });

  test("a superset stays one when its partners stay together", () => {
    // Swapped within the superset.
    expect(ids(moveExercise(workoutOf([ex("A", "s"), ex("B", "s"), ex("C")]), 1, 0))).toEqual(["s", "s", undefined]);
    // Something else moved past it.
    expect(ids(moveExercise(workoutOf([ex("A", "s"), ex("B", "s"), ex("C")]), 2, 0))).toEqual([undefined, "s", "s"]);
    // One of three taken out: the other two are still back to back.
    expect(ids(moveExercise(workoutOf([ex("A", "s"), ex("B", "s"), ex("C", "s"), ex("D")]), 1, 3))).toEqual([
      "s", "s", undefined, undefined,
    ]);
  });

  test("dropping one between two partners splits them", () => {
    const a = moveExercise(workoutOf([ex("A", "s"), ex("B", "s"), ex("C")]), 2, 1);
    expect(names(a)).toEqual(["A", "C", "B"]);
    expect(ids(a)).toEqual([undefined, undefined, undefined]);
  });

  test("a superset split into two runs becomes two supersets", () => {
    const a = moveExercise(workoutOf([ex("A", "s"), ex("B", "s"), ex("C", "s"), ex("D", "s"), ex("E")]), 4, 2);
    expect(names(a)).toEqual(["A", "B", "E", "C", "D"]);
    const [first, second] = [ids(a)[0], ids(a)[3]];
    expect(ids(a)).toEqual([first, first, undefined, second, second]);
    expect(first).not.toBe(second);
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

describe("templateAfterWorkout", () => {
  const template = {
    id: "t1",
    name: "Pull",
    exercises: [
      { name: "Barbell Bent Over Row", sets: [{ weight: 0, reps: 0 }, { weight: 0, reps: 0 }] },
      { name: "Pull-Up" },
      { name: "Barbell Curl", sets: [{ weight: 30, reps: 10 }] },
    ],
  };
  const done = (weight: number, reps: number, extra: Partial<WorkoutSet> = {}): WorkoutSet => ({ weight, reps, done: true, ...extra });

  test("the template takes on the sets you ticked off", () => {
    const updated = templateAfterWorkout(template, [
      { name: "Barbell Bent Over Row", sets: [done(20, 10, { type: "warmup" }), done(60, 8, { restSeconds: 120 }), done(60, 7)] },
      { name: "Pull-Up", sets: [done(82, 8), done(82, 6)] },
    ])!;
    expect(updated.exercises[0].sets).toEqual([
      { weight: 20, reps: 10, type: "warmup" },
      { weight: 60, reps: 8, restSeconds: 120 },
      { weight: 60, reps: 7 },
    ]);
    // Bodyweight stays "BW", so next time starts at your body weight that day.
    expect(updated.exercises[1].sets).toEqual([{ weight: 0, reps: 8 }, { weight: 0, reps: 6 }]);
  });

  test("skipped exercises keep their plan; unticked sets don't count", () => {
    const updated = templateAfterWorkout(template, [
      { name: "Barbell Bent Over Row", sets: [done(60, 8), { weight: 60, reps: 8, done: false }] },
    ])!;
    expect(updated.exercises[0].sets).toEqual([{ weight: 60, reps: 8 }]);
    expect(updated.exercises[2].sets).toEqual([{ weight: 30, reps: 10 }]);
  });

  test("exercises added mid-workout don't join the template", () => {
    const updated = templateAfterWorkout(template, [
      { name: "Barbell Curl", sets: [done(32.5, 10)] },
      { name: "Face Pull", sets: [done(20, 15)] },
    ])!;
    expect(updated.exercises.map((e) => e.name)).toEqual(["Barbell Bent Over Row", "Pull-Up", "Barbell Curl"]);
    expect(updated.exercises[2].sets).toEqual([{ weight: 32.5, reps: 10 }]);
  });

  test("an exercise listed twice pairs up in order", () => {
    const twice = { id: "t2", name: "Arms", exercises: [{ name: "Barbell Curl" }, { name: "Barbell Curl" }] };
    const updated = templateAfterWorkout(twice, [
      { name: "Barbell Curl", sets: [done(30, 10)] },
      { name: "Barbell Curl", sets: [done(20, 15)] },
    ])!;
    expect(updated.exercises.map((e) => e.sets)).toEqual([[{ weight: 30, reps: 10 }], [{ weight: 20, reps: 15 }]]);
  });

  test("nothing to write when nothing changed", () => {
    expect(templateAfterWorkout(template, [{ name: "Barbell Curl", sets: [done(30, 10)] }])).toBeNull();
    expect(templateAfterWorkout(template, [])).toBeNull();
  });
});

describe("fillBlankTemplate", () => {
  const set = (weight: number, reps: number, extra: Partial<WorkoutSet> = {}): WorkoutSet => ({ weight, reps, done: true, ...extra });
  // Workouts from the "Pull-" template, saved before workouts kept their template's id.
  const session = (date: string, exercises: WorkoutExercise[]) => ({ id: date, name: "Pull-", date, durationSeconds: 3600, unit: "kg" as const, exercises });
  // Newest first, like the app keeps them.
  const history = [
    session("2026-09-20T18:00:00.000Z", [
      { name: "Cable Seated Row", sets: [set(55, 10), set(55, 9)] },
      { name: "Pull-Up", sets: [set(80, 8)] },
    ]),
    session("2026-09-13T18:00:00.000Z", [
      { name: "Cable Seated Row", sets: [set(50, 10)] },
      { name: "Face Pull", sets: [set(20, 15), set(20, 15)] },
    ]),
  ];
  const blank = (name: string, n = 2) => ({ name, sets: Array.from({ length: n }, () => ({ weight: 0, reps: 0 })) });

  test("blank exercises take the sets from the last time they were done", () => {
    const t = { id: "t", name: "Pull-", exercises: [blank("Cable Seated Row"), blank("Face Pull"), blank("Pull-Up")] };
    const filled = fillBlankTemplate(t, history)!;
    expect(filled.exercises[0].sets).toEqual([{ weight: 55, reps: 10 }, { weight: 55, reps: 9 }]); // the latest, not the older 50x10
    expect(filled.exercises[1].sets).toEqual([{ weight: 20, reps: 15 }, { weight: 20, reps: 15 }]); // only in the older workout
    expect(filled.exercises[2].sets).toEqual([{ weight: 0, reps: 8 }]); // bodyweight stays BW
  });

  test("exercises that have a plan are left alone", () => {
    const t = { id: "t", name: "Pull-", exercises: [{ name: "Cable Seated Row", sets: [{ weight: 60, reps: 8 }] }, blank("Face Pull")] };
    const filled = fillBlankTemplate(t, history)!;
    expect(filled.exercises[0].sets).toEqual([{ weight: 60, reps: 8 }]);
    expect(filled.exercises[1].sets).toHaveLength(2);
  });

  test("no sets at all counts as blank too", () => {
    const t = { id: "t", name: "Pull-", exercises: [{ name: "Face Pull" }] };
    expect(fillBlankTemplate(t, history)!.exercises[0].sets).toHaveLength(2);
  });

  test("nothing to do without history, or once filled", () => {
    const t = { id: "t", name: "Pull-", exercises: [blank("Barbell Curl")] };
    expect(fillBlankTemplate(t, history)).toBeNull();
    const once = fillBlankTemplate({ id: "t", name: "Pull-", exercises: [blank("Face Pull")] }, history)!;
    expect(fillBlankTemplate(once, history)).toBeNull();
  });

  test("only from this template's own workouts, never another template's", () => {
    const otherTemplate = {
      ...session("2026-09-25T18:00:00.000Z", [{ name: "Face Pull", sets: [set(30, 12)] }]),
      name: "Shoulders",
      templateId: "s",
    };
    const emptyWorkout = { ...session("2026-09-24T18:00:00.000Z", [{ name: "Barbell Curl", sets: [set(30, 10)] }]), name: "Workout" };
    const t = { id: "t", name: "Pull-", exercises: [blank("Face Pull"), blank("Barbell Curl")] };
    const filled = fillBlankTemplate(t, [otherTemplate, emptyWorkout, ...history])!;
    expect(filled.exercises[0].sets).toEqual([{ weight: 20, reps: 15 }, { weight: 20, reps: 15 }]); // Pull-'s own, not the 30x12
    expect(filled.exercises[1].sets).toHaveLength(2); // never done in Pull-: still blank
    expect(filled.exercises[1].sets?.every((x) => x.reps === 0)).toBe(true);
  });

  test("a workout that kept its template's id counts under any name", () => {
    const renamed = { ...session("2026-09-26T18:00:00.000Z", [{ name: "Face Pull", sets: [set(25, 12)] }]), name: "Old name", templateId: "t" };
    const t = { id: "t", name: "Pull-", exercises: [blank("Face Pull")] };
    expect(fillBlankTemplate(t, [renamed, ...history])!.exercises[0].sets).toEqual([{ weight: 25, reps: 12 }]);
  });
});
