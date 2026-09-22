import { RANKS, rankFor } from "../ranks";
import { computeStreak } from "../streak";
import { set, workout } from "./fixtures";

describe("ranks", () => {
  test("every 15 levels, from Rookie to Legend at 150", () => {
    expect(rankFor(1).name).toBe("Rookie");
    expect(rankFor(9).name).toBe("Rookie");
    expect(rankFor(10).name).toBe("Iron");
    expect(rankFor(54).name).toBe("Silver");
    expect(rankFor(55).name).toBe("Gold");
    expect(rankFor(149).name).toBe("Diamond");
    expect(rankFor(150).name).toBe("Legend");
    expect(RANKS).toHaveLength(11);
  });
});

describe("streak shields", () => {
  // Mondays at 6pm, local time; "now" is the Wednesday of the last week.
  const monday = (week: number) => new Date(2026, 6, 6 + week * 7, 18).toISOString();
  const NOW = new Date(2026, 6, 6 + 10 * 7 + 2, 12).getTime(); // week 10, Wednesday
  const trainedWeeks = (weeks: number[]) =>
    weeks.map((wk) => workout(`W${wk}`, monday(wk), [{ name: "Squat", sets: [set(100, 5)] }]));
  const level = (l: number) => () => l;

  test("counts weeks in a row at the goal; this week counts once it's hit", () => {
    const s = computeStreak(trainedWeeks([6, 7, 8, 9, 10]), 1, NOW, level(1));
    expect(s.weeks).toBe(5);
  });

  test("an unfinished week doesn't break the streak", () => {
    expect(computeStreak(trainedWeeks([7, 8, 9]), 1, NOW, level(1)).weeks).toBe(3);
  });

  test("a missed week resets the streak when there's no shield", () => {
    expect(computeStreak(trainedWeeks([5, 6, 7, 9]), 1, NOW, level(9)).weeks).toBe(1);
  });

  test("a shield covers a missed week and is used up", () => {
    const s = computeStreak(trainedWeeks([5, 6, 7, 9]), 1, NOW, level(10));
    expect(s.weeks).toBe(4); // 5, 6, 7 and 9; week 8 was shielded
    expect(s.shields).toBe(0);
  });

  test("one shield per 10 levels, never more than 3 held", () => {
    expect(computeStreak(trainedWeeks([9]), 1, NOW, level(27)).shields).toBe(2);
    expect(computeStreak(trainedWeeks([9]), 1, NOW, level(80)).shields).toBe(3);
  });

  test("tells you when last week's miss used a shield", () => {
    const s = computeStreak(trainedWeeks([6, 7, 8]), 1, NOW, level(20));
    expect(s.shieldUsedLastWeek).toBe(true); // week 9 missed
    expect(s.weeks).toBe(3);
    expect(s.shields).toBe(1);
  });

  test("nothing logged, nothing to show", () => {
    expect(computeStreak([], 3, NOW)).toEqual({ weeks: 0, shields: 0, shieldUsedLastWeek: false });
  });
});
