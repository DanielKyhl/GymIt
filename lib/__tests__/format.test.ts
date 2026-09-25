import { formatNumber, formatSets, plural, prGain, prTotal, relativeDay } from "../format";
import { set } from "./fixtures";

const NOW = "2026-09-09T12:00:00.000Z";
const DAY = 24 * 60 * 60 * 1000;

const daysAgo = (n: number) => new Date(new Date(NOW).getTime() - n * DAY).toISOString();

describe("plural", () => {
  test("keeps the singular for exactly one", () => {
    expect(plural(1, "set")).toBe("1 set");
  });

  test("adds an s for anything else", () => {
    expect(plural(0, "set")).toBe("0 sets");
    expect(plural(2, "set")).toBe("2 sets");
    expect(plural(12, "workout")).toBe("12 workouts");
  });
});

describe("relativeDay", () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date(NOW));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("names the last two days", () => {
    expect(relativeDay(daysAgo(0))).toBe("Today");
    expect(relativeDay(daysAgo(1))).toBe("Yesterday");
  });

  test("counts days beyond that", () => {
    expect(relativeDay(daysAgo(2))).toBe("2 days ago");
    expect(relativeDay(daysAgo(30))).toBe("30 days ago");
  });

  test("a future date reads as today rather than a negative count", () => {
    expect(relativeDay(daysAgo(-3))).toBe("Today");
  });

  test("counts calendar days, not 24-hour blocks", () => {
    // NOW is 14:00 in Copenhagen. 20 hours earlier is 18:00 the day before:
    // under 24 hours ago, but still yesterday.
    const twentyHoursAgo = new Date(new Date(NOW).getTime() - 20 * 60 * 60 * 1000);
    expect(relativeDay(twentyHoursAgo.toISOString())).toBe("Yesterday");
  });

  test("an hour before midnight is yesterday once midnight has passed", () => {
    jest.setSystemTime(new Date("2026-09-08T22:30:00.000Z")); // 00:30 on the 9th
    expect(relativeDay("2026-09-08T21:30:00.000Z")).toBe("Yesterday"); // 23:30 on the 8th
  });

  test("earlier the same day is still today", () => {
    jest.setSystemTime(new Date("2026-09-08T21:30:00.000Z")); // 23:30
    expect(relativeDay("2026-09-07T22:30:00.000Z")).toBe("Today"); // 00:30, 23 hours earlier
  });
});

describe("formatNumber", () => {
  test("one style everywhere: comma thousands, dot decimals", () => {
    expect(formatNumber(2420)).toBe("2,420");
    expect(formatNumber(8.5)).toBe("8.5");
    expect(formatNumber(1.63)).toBe("1.6");
    expect(formatNumber(1667.5, 0)).toBe("1,668");
  });
});

describe("formatSets", () => {
  test("the same weight throughout says it once", () => {
    expect(formatSets([set(65, 10), set(65, 8), set(65, 8)], "kg", false)).toBe("65 kg × 10, 8, 8");
  });

  test("a changing weight lists every set", () => {
    expect(formatSets([set(55, 12), set(60, 10), set(60, 9)], "kg", false)).toBe("55×12 · 60×10 · 60×9");
  });

  test("bodyweight exercises show BW", () => {
    expect(formatSets([set(80, 10), set(80, 9), set(80, 8)], "kg", true)).toBe("BW × 10, 9, 8");
  });

  test("only the working sets you ticked off", () => {
    const sets = [set(40, 10, { type: "warmup" }), set(60, 8), set(60, 8, { done: false })];
    expect(formatSets(sets, "kg", false)).toBe("60 kg × 8");
    expect(formatSets([set(60, 8, { done: false })], "kg", false)).toBe("");
  });
});

describe("prGain and prTotal", () => {
  test("weight totals in the unit, bodyweight totals in reps", () => {
    const kg = { total: 1260, previous: 1170, inReps: false };
    expect(prGain(kg, "kg")).toBe("+90 kg");
    expect(prTotal(kg, "kg")).toBe("1,260 kg");
    const reps = { total: 28, previous: 27, inReps: true };
    expect(prGain(reps, "kg")).toBe("+1 rep");
    expect(prTotal(reps, "kg")).toBe("28 reps");
  });
});
