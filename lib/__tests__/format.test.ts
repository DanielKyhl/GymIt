import { plural, relativeDay } from "../format";

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
