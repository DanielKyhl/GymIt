import {
    computeXP,
    countPRs,
    levelInfo,
    MAX_LEVEL,
    thisWeekCount,
    weeklyGoalBonusXP,
} from "../gamification";
import { set, workout } from "./fixtures";

// Local Copenhagen times, stored the way the app stores them (UTC ISO).
const MON_7AM = "2026-09-07T05:00:00.000Z";
const MON_10AM = "2026-09-07T08:00:00.000Z";
const MON_6PM = "2026-09-07T16:00:00.000Z";
const TUE_HALF_PAST_MIDNIGHT = "2026-09-07T22:30:00.000Z";
const WED_6PM = "2026-09-09T16:00:00.000Z";
const FRI_NOON = "2026-09-11T10:00:00.000Z";

const bench = (weight: number) => ({ name: "Bench", sets: [set(weight, 5)] });

describe("levelInfo", () => {
  test("starts at level 1 needing 100 XP", () => {
    expect(levelInfo(0)).toEqual({
      level: 1,
      xpIntoLevel: 0,
      xpForNext: 100,
      isMax: false,
    });
  });

  test("each level costs more than the last", () => {
    expect(levelInfo(100).level).toBe(2);
    expect(levelInfo(100).xpForNext).toBe(200);
    expect(levelInfo(300).level).toBe(3);
    expect(levelInfo(300).xpForNext).toBe(300);
  });

  test("keeps the leftover XP as progress into the current level", () => {
    expect(levelInfo(99)).toMatchObject({ level: 1, xpIntoLevel: 99 });
    expect(levelInfo(299)).toMatchObject({ level: 2, xpIntoLevel: 199 });
  });

  test("caps out at MAX_LEVEL", () => {
    expect(levelInfo(495000)).toEqual({
      level: MAX_LEVEL,
      xpIntoLevel: 0,
      xpForNext: 0,
      isMax: true,
    });
    expect(levelInfo(99_999_999).isMax).toBe(true);
  });

  test("one XP short of max is still level 99", () => {
    expect(levelInfo(494999).level).toBe(99);
  });
});

describe("countPRs", () => {
  test("the first time an exercise appears is a baseline, not a PR", () => {
    expect(countPRs([workout("Push", MON_10AM, [bench(90)])])).toBe(0);
  });

  test("beating your previous best counts once", () => {
    const history = [
      workout("Push", WED_6PM, [bench(100)]),
      workout("Push", MON_10AM, [bench(90)]),
    ];
    expect(countPRs(history)).toBe(1);
  });

  test("a lighter session afterwards is not a PR", () => {
    const history = [
      workout("Push", FRI_NOON, [bench(80)]),
      workout("Push", WED_6PM, [bench(100)]),
      workout("Push", MON_10AM, [bench(90)]),
    ];
    expect(countPRs(history)).toBe(1);
  });

  test("a heavy warm-up cannot set a PR", () => {
    const history = [
      workout("Push", WED_6PM, [
        { name: "Bench", sets: [set(200, 5, { type: "warmup" })] },
      ]),
      workout("Push", MON_10AM, [bench(90)]),
    ];
    expect(countPRs(history)).toBe(0);
  });
});

describe("computeXP", () => {
  test("counts the workout and its completed working sets only", () => {
    const w = workout("Push", MON_10AM, [
      {
        name: "Bench",
        sets: [
          set(100, 5),                        // counts
          set(100, 5, { done: false }),       // not finished
          set(40, 10, { type: "warmup" }),    // warm-up
        ],
      },
    ]);
    expect(computeXP([w], 3)).toBe(55); // 50 workout + 5 set
  });
});

describe("weeklyGoalBonusXP", () => {
  test("awards the bonus when the week's goal is met", () => {
    const week = [
      workout("Push", FRI_NOON, [bench(100)]),
      workout("Push", WED_6PM, [bench(100)]),
      workout("Push", MON_10AM, [bench(100)]),
    ];
    expect(weeklyGoalBonusXP(week, 3)).toBe(100);
  });

  test("no bonus when the goal is missed", () => {
    const week = [
      workout("Push", WED_6PM, [bench(100)]),
      workout("Push", MON_10AM, [bench(100)]),
    ];
    expect(weeklyGoalBonusXP(week, 3)).toBe(0);
  });

  test("a workout just after midnight still belongs to that week", () => {
    const week = [
      workout("Push", WED_6PM, [bench(100)]),
      workout("Push", TUE_HALF_PAST_MIDNIGHT, [bench(100)]),
      workout("Push", MON_10AM, [bench(100)]),
    ];
    expect(weeklyGoalBonusXP(week, 3)).toBe(100);
  });

  test("two sessions in one day count as two workouts", () => {
    const week = [
      workout("Evening", MON_6PM, [bench(100)]),
      workout("Morning", MON_7AM, [bench(100)]),
      workout("Push", WED_6PM, [bench(100)]),
    ];
    expect(weeklyGoalBonusXP(week, 3)).toBe(100);
  });

  test("the goal is workouts per week, not days trained", () => {
    const twiceDaily = [
      workout("Evening", MON_6PM, [bench(100)]),
      workout("Morning", MON_7AM, [bench(100)]),
    ];
    // Two workouts on a single day: enough for a goal of 2, not for 3.
    expect(weeklyGoalBonusXP(twiceDaily, 2)).toBe(100);
    expect(weeklyGoalBonusXP(twiceDaily, 3)).toBe(0);
  });
});

describe("thisWeekCount", () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date(WED_6PM));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("counts only workouts in the current week", () => {
    const history = [
      workout("Push", WED_6PM, [bench(100)]),
      workout("Push", MON_10AM, [bench(100)]),
      workout("Push", "2026-08-24T08:00:00.000Z", [bench(100)]), // two weeks earlier
    ];
    expect(thisWeekCount(history)).toBe(2);
  });

  test("counts both halves of a two-a-day", () => {
    const history = [
      workout("Evening", MON_6PM, [bench(100)]),
      workout("Morning", MON_7AM, [bench(100)]),
      workout("Push", WED_6PM, [bench(100)]),
    ];
    expect(thisWeekCount(history)).toBe(3);
  });
});