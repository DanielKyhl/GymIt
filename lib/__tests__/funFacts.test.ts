import { SILHOUETTES } from "../../components/animalSilhouettes";
import { ANIMALS, compareVolume } from "../funFacts";
import { averageRPE, rpeByWorkout, rpeHistory, workoutRPE } from "../rpe";
import { set, workout } from "./fixtures";

describe("compareVolume", () => {
  test("picks an animal that gives a readable count", () => {
    for (let seed = 0; seed < 20; seed++) {
      const c = compareVolume(9000, "kg", seed)!;
      expect(c.count).toBeGreaterThanOrEqual(1.5);
      expect(c.count).toBeLessThanOrEqual(99);
      expect(c.text).toContain(c.animal.many);
    }
  });

  test("the next workout at the same volume gets a different animal", () => {
    const seen = new Set([0, 1, 2, 3].map((seed) => compareVolume(9000, "kg", seed)!.animal.id));
    expect(seen.size).toBe(4);
  });

  test("the same workout always gets the same comparison", () => {
    expect(compareVolume(9000, "kg", 7)).toEqual(compareVolume(9000, "kg", 7));
  });

  test("counts are rounded to one decimal under 10, whole above", () => {
    const hippo = ANIMALS.find((a) => a.id === "hippo")!;
    const counts = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((seed) => compareVolume(hippo.kg * 3.26, "kg", seed)!);
    expect(counts.find((c) => c.animal.id === "hippo")?.count).toBe(3.3);
    expect(counts.every((c) => c.count >= 10 ? Number.isInteger(c.count) : true)).toBe(true);
  });

  test("reads as one plain sentence", () => {
    const c = compareVolume(2200, "kg", 7)!; // tiger is the 8th of 10 animals that fit 2,200 kg
    expect(c.animal.id).toBe("tiger");
    expect(c.text).toBe("Lifted what is equal to 10 tigers");
  });

  test("works in pounds too", () => {
    const kg = compareVolume(4000, "kg", 0)!;
    const lb = compareVolume(4000 * 2.20462, "lb", 0)!;
    expect(lb.animal.id).toBe(kg.animal.id);
    expect(lb.count).toBe(kg.count);
  });

  test("nothing lifted, or less than one gorilla, gives no comparison", () => {
    expect(compareVolume(0, "kg", 0)).toBeNull();
    expect(compareVolume(120, "kg", 0)).toBeNull();
  });

  test("only big animals: the lightest is a gorilla", () => {
    expect(Math.min(...ANIMALS.map((a) => a.kg))).toBeGreaterThanOrEqual(150);
    const ids = ANIMALS.map((a) => a.id);
    expect(ids).toEqual(expect.arrayContaining(["elephant", "hippo", "lion", "tiger", "minke", "orca"]));
  });

  test("every animal has an icon", () => {
    ANIMALS.forEach((a) => expect(SILHOUETTES[a.icon]?.paths.length).toBeGreaterThan(0));
  });
});

describe("RPE averages", () => {
  const w1 = workout("Push", "2026-09-01", [
    { name: "Bench", sets: [set(60, 10, { type: "warmup", rpe: 4 }), set(80, 8, { rpe: 8 }), set(80, 8, { rpe: 9 })] },
  ]);
  const w2 = workout("Pull", "2026-09-03", [{ name: "Row", sets: [set(60, 10, { rpe: 7 }), set(60, 10)] }]);
  const w3 = workout("Push", "2026-09-05", [{ name: "Bench", sets: [set(82.5, 8, { rpe: 9.5 }), set(82.5, 8, { rpe: 7, done: false })] }]);
  const unrated = workout("Legs", "2026-09-04", [{ name: "Squat", sets: [set(100, 5)] }]);

  test("a workout's average leaves out warm-ups, unrated and unfinished sets", () => {
    expect(workoutRPE(w1)).toBe(8.5);
    expect(workoutRPE(w3)).toBe(9.5);
    expect(workoutRPE(unrated)).toBeNull();
  });

  test("the overall average counts every rated set", () => {
    expect(averageRPE([w1, w2, w3, unrated])).toBe(8.4); // (8 + 9 + 7 + 9.5) / 4
    expect(averageRPE([unrated])).toBeNull();
  });

  test("history is oldest first and skips unrated workouts", () => {
    expect(rpeHistory([w3, unrated, w1, w2])).toEqual([
      { date: "2026-09-01", value: 8.5 },
      { date: "2026-09-03", value: 7 },
      { date: "2026-09-05", value: 9.5 },
    ]);
  });

  test("per workout name, most done first", () => {
    expect(rpeByWorkout([w1, w2, w3, unrated])).toEqual([
      { name: "Push", average: 8.8, sessions: 2 }, // (8 + 9 + 9.5) / 3
      { name: "Pull", average: 7, sessions: 1 },
    ]);
  });
});
