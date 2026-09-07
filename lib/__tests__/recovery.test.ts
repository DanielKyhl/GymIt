import {
  COLOR_PARTIAL,
  COLOR_RECOVERED,
  COLOR_TRAINED,
  computeRecovery,
  slugLabel,
} from "../recovery";
import { set, workout } from "./fixtures";

const HOUR = 60 * 60 * 1000;
const NOW = new Date("2026-09-09T12:00:00.000Z").getTime();

const hoursAgo = (h: number) => new Date(NOW - h * HOUR).toISOString();

// Barbell Bench Press - Medium Grip: primary chest, secondary shoulders + triceps.
const bench = (date: string) =>
  workout("Push", date, [
    { name: "Barbell Bench Press - Medium Grip", sets: [set(100, 5)] },
  ]);

const muscle = (workouts: Parameters<typeof computeRecovery>[0], slug: string) =>
  computeRecovery(workouts, NOW).find((m) => m.slug === slug)!;

describe("computeRecovery", () => {
  test("with no history every muscle is fully recovered", () => {
    const all = computeRecovery([], NOW);
    expect(all.length).toBeGreaterThan(0);
    expect(all.every((m) => m.color === COLOR_RECOVERED)).toBe(true);
    expect(all.every((m) => m.fraction === 1 && m.hoursLeft === 0)).toBe(true);
  });

  test("a muscle trained an hour ago is red with nearly all its time left", () => {
    const chest = muscle([bench(hoursAgo(1))], "chest");
    expect(chest.color).toBe(COLOR_TRAINED);
    expect(chest.hoursLeft).toBe(59); // chest recovers in 60h
  });

  test("secondary muscles recover in half the time", () => {
    const history = [bench(hoursAgo(10))];

    // chest is primary: 10 of 60 hours done, still red
    expect(muscle(history, "chest")).toMatchObject({
      color: COLOR_TRAINED,
      hoursLeft: 50,
    });

    // triceps only assisted: 36h base, halved to 18h, so 10h in it is past halfway
    expect(muscle(history, "triceps")).toMatchObject({
      color: COLOR_PARTIAL,
      hoursLeft: 8,
    });
  });

  test("a muscle is green again once its window has passed", () => {
    const chest = muscle([bench(hoursAgo(61))], "chest");
    expect(chest.color).toBe(COLOR_RECOVERED);
    expect(chest.fraction).toBe(1);
    expect(chest.hoursLeft).toBe(0);
  });

  test("muscles the workout never touched stay green", () => {
    expect(muscle([bench(hoursAgo(1))], "calves").color).toBe(COLOR_RECOVERED);
  });

  test("the most recent session wins when a muscle was trained twice", () => {
    const history = [bench(hoursAgo(5)), bench(hoursAgo(50))];
    expect(muscle(history, "chest")).toMatchObject({
      color: COLOR_TRAINED,
      hoursLeft: 55,
    });
  });

  test("halfway through recovery flips red to yellow", () => {
    expect(muscle([bench(hoursAgo(29))], "chest").color).toBe(COLOR_TRAINED);
    expect(muscle([bench(hoursAgo(30))], "chest").color).toBe(COLOR_PARTIAL);
  });

  test("an exercise with no sets does not count as training", () => {
    const empty = workout("Push", hoursAgo(1), [
      { name: "Barbell Bench Press - Medium Grip", sets: [] },
    ]);
    expect(muscle([empty], "chest").color).toBe(COLOR_RECOVERED);
  });

  test("an unknown exercise name is ignored rather than crashing", () => {
    const odd = workout("Push", hoursAgo(1), [
      { name: "Totally Made Up Lift", sets: [set(100, 5)] },
    ]);
    expect(() => computeRecovery([odd], NOW)).not.toThrow();
    expect(muscle([odd], "chest").color).toBe(COLOR_RECOVERED);
  });

  test("legs and arms map to their own slugs", () => {
    const squat = workout("Legs", hoursAgo(1), [
      { name: "Barbell Squat", sets: [set(100, 5)] },
    ]);
    const curl = workout("Arms", hoursAgo(1), [
      { name: "Barbell Curl", sets: [set(30, 10)] },
    ]);
    expect(muscle([squat], "quadriceps").color).toBe(COLOR_TRAINED);
    expect(muscle([curl], "biceps").color).toBe(COLOR_TRAINED);
    expect(muscle([curl], "quadriceps").color).toBe(COLOR_RECOVERED);
  });
});

describe("slugLabel", () => {
  test("turns a slug into a readable name", () => {
    expect(slugLabel("abs")).toBe("Abs");
    expect(slugLabel("lower-back")).toBe("Lower Back");
    expect(slugLabel("quadriceps")).toBe("Quadriceps");
  });
});
