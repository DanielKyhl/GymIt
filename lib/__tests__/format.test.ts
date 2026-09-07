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

  test("buckets by elapsed hours, not calendar days", () => {
    // 20 hours earlier is the previous calendar day, but under 24h elapsed.
    const twentyHoursAgo = new Date(new Date(NOW).getTime() - 20 * 60 * 60 * 1000);
    expect(relativeDay(twentyHoursAgo.toISOString())).toBe("Today");
  });
});
