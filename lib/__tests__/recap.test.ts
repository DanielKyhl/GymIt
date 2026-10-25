import { lastWeekStart, recapCheck, weekRecap } from "../recap";
import { set, workout } from "./fixtures";

// Local times, so the weeks don't depend on the time zone the tests run in.
const at = (month: number, day: number, hour = 18) => new Date(2026, month - 1, day, hour).getTime();
const iso = (month: number, day: number, hour = 18) => new Date(at(month, day, hour)).toISOString();

describe("when the recap shows", () => {
  const sunday = at(10, 25, 20); // the week of 19 October
  const monday = at(10, 26, 7); // the next one

  test("it looks back on the last full week, Monday to Sunday", () => {
    expect(new Date(lastWeekStart(monday))).toEqual(new Date(2026, 9, 19)); // clocks went back on the 25th
    expect(new Date(lastWeekStart(sunday))).toEqual(new Date(2026, 9, 12));
  });

  test("the first check only starts the count", () => {
    expect(recapCheck(undefined, sunday)).toEqual({ week: "2026-10-12", start: lastWeekStart(sunday), show: false });
  });

  test("then once a week: the first time the app's opened in a new week", () => {
    expect(recapCheck("2026-10-12", sunday)).toBeNull(); // still the same week
    expect(recapCheck("2026-10-12", monday)).toEqual({ week: "2026-10-19", start: lastWeekStart(monday), show: true });
    expect(recapCheck("2026-10-19", monday)).toBeNull(); // seen
  });

  test("after weeks away, only the last week shows: the ones before don't stack up", () => {
    expect(recapCheck("2026-09-07", monday)?.week).toBe("2026-10-19"); // not 14 Sep, 21 Sep...
    expect(recapCheck("2026-10-19", monday)).toBeNull(); // once it's closed, nothing's left
  });
});

describe("the recap", () => {
  const history = [
    // This week: not in it.
    { ...workout("Push", iso(10, 20), [{ name: "Barbell Bench Press", sets: [set(100, 8)] }]), id: "w3" },
    // The week of 12 October.
    {
      ...workout("Arms", iso(10, 15), [{ name: "Dumbbell Hammer Curl", sets: [set(16, 10), set(16, 10)] }]),
      id: "w2",
      durationSeconds: 1800,
    },
    { ...workout("Push", iso(10, 12), [{ name: "Barbell Bench Press", sets: [set(100, 6)] }]), id: "w1" },
    // The week before.
    { ...workout("Push", iso(10, 7), [{ name: "Barbell Bench Press", sets: [set(100, 5)] }]), id: "w0" },
  ];
  const recap = weekRecap(history, 2, at(10, 12, 0))!;

  test("counts the week's workouts, sets and time", () => {
    expect(recap.week).toBe("2026-10-12");
    expect(recap.workouts).toBe(2);
    expect(recap.goal).toBe(2);
    expect(recap.sets).toBe(3);
    expect(recap.seconds).toBe(3600 + 1800);
  });

  test("adds up the weight lifted, both dumbbells counted, next to the week before", () => {
    expect(recap.volume).toBe(600 + 2 * 320);
    expect(recap.volumeBefore).toBe(500);
  });

  test("its PRs, and the XP and levels it brought", () => {
    expect(recap.prs).toBe(1); // bench beat the week before; the curls were a first
    // Two workouts, three sets, a PR and the weekly goal's bonus.
    expect(recap.xp).toBe(2 * 50 + 3 * 5 + 25 + 100);
    expect([recap.levelBefore, recap.levelAfter]).toEqual([1, 3]);
    expect(recap.streak).toBe(1);
  });

  test("lists only the achievements unlocked that week", () => {
    expect(recap.achievements).toEqual(expect.arrayContaining(["New Heights", "On Target", "Moved a Ton"]));
    expect(recap.achievements).not.toContain("First Steps"); // that was the week before
  });

  test("a week with no workouts has nothing to look back on", () => {
    expect(weekRecap(history, 2, at(9, 28, 0))).toBeNull();
  });
});
