import legacyNames from "../../assets/legacyNames.json";
import { currentName, withCurrentNames } from "../exerciseNames";
import { barWeight, exerciseByName, exercises, isBodyweight } from "../exercises";
import { PREMADE_TEMPLATES } from "../premadeTemplates";
import { musclesFor } from "../recovery";
import { weeklyMuscleSets } from "../stats";
import { set, workout } from "./fixtures";

const RENAMES = legacyNames as Record<string, string>;

describe("renaming saved exercises", () => {
  test("old names with a clear match move to the new one", () => {
    expect(currentName("Barbell Bench Press - Medium Grip")).toBe("Barbell Bench Press");
    expect(currentName("Barbell Squat")).toBe("Barbell Full Squat");
    expect(currentName("Pullups")).toBe("Pull-Up");
    expect(currentName("Triceps Pushdown")).toBe("Cable Pushdown");
  });

  test("names already in the list are never touched", () => {
    expect(currentName("Barbell Deadlift")).toBe("Barbell Deadlift");
    expect(currentName("Face Pull")).toBe("Face Pull"); // kept from the old list
  });

  test("old names without a match stay as they are", () => {
    expect(currentName("Axle Deadlift")).toBe("Axle Deadlift");
    expect(currentName("Something Else Entirely")).toBe("Something Else Entirely");
  });

  test("every rename points at an exercise that exists", () => {
    const broken = Object.values(RENAMES).filter((to) => !exerciseByName(to));
    expect(broken).toEqual([]);
  });

  test("renaming twice changes nothing more", () => {
    Object.keys(RENAMES).forEach((name) => {
      expect(currentName(currentName(name))).toBe(currentName(name));
    });
  });

  test("a workout keeps its sets, and only changes if a name did", () => {
    const old = workout("Push", "2026-09-01T18:00:00.000Z", [
      { name: "Barbell Bench Press - Medium Grip", sets: [set(80, 5), set(80, 5)] },
      { name: "Face Pull", sets: [set(20, 15)] },
    ]);
    const renamed = withCurrentNames(old)!;
    expect(renamed.exercises.map((e) => e.name)).toEqual(["Barbell Bench Press", "Face Pull"]);
    expect(renamed.exercises[0].sets).toEqual(old.exercises[0].sets);
    expect(renamed.id).toBe(old.id);
    expect(withCurrentNames(renamed)).toBeNull();
  });
});

describe("history under old names still counts", () => {
  test("an old name keeps its muscles", () => {
    expect(musclesFor("Axle Deadlift").primary.length).toBeGreaterThan(0);
    expect(musclesFor("Barbell Bench Press - Medium Grip").primary).toEqual(["chest"]);
  });

  test("and still shows on the weekly sets chart", () => {
    const now = new Date("2026-09-10T12:00:00.000Z").getTime();
    const old = workout("Old", "2026-09-09T18:00:00.000Z", [{ name: "Barbell Bench Press - Medium Grip", sets: [set(80, 5), set(80, 5)] }]);
    expect(weeklyMuscleSets([old], now).find((m) => m.slug === "chest")?.sets).toBe(2);
  });

  test("bodyweight and bar weight still know old names", () => {
    expect(isBodyweight("Pullups")).toBe(true);
    expect(barWeight("Barbell Bench Press - Medium Grip", "kg")).toBe(20);
  });
});

describe("the new list", () => {
  test("every premade template uses exercises that exist", () => {
    const missing = PREMADE_TEMPLATES.flatMap((t) => t.exercises.map((e) => e.name)).filter((n) => !exerciseByName(n));
    expect(missing).toEqual([]);
  });

  test("names are unique", () => {
    expect(new Set(exercises.map((e) => e.name)).size).toBe(exercises.length);
  });

  test("lifters' main muscles: squats are quads, bench is chest", () => {
    expect(exerciseByName("Barbell Full Squat")!.primaryMuscles).toEqual(["quadriceps"]);
    expect(exerciseByName("Sled 45° Leg Press")!.primaryMuscles).toEqual(["quadriceps"]);
    expect(exerciseByName("Barbell Bench Press")!.primaryMuscles).toEqual(["chest"]);
    expect(exerciseByName("Barbell Romanian Deadlift")!.primaryMuscles).toEqual(["hamstrings"]);
    expect(exerciseByName("Barbell Close-Grip Bench Press")!.primaryMuscles).toEqual(["triceps"]);
  });

  test("bodyweight, bars and stretches", () => {
    expect(isBodyweight("Pull-Up")).toBe(true);
    expect(isBodyweight("Push-Up")).toBe(true);
    expect(exercises.some((e) => /stretch/i.test(e.name) && isBodyweight(e.name))).toBe(false);
    expect(barWeight("Barbell Bench Press", "lb")).toBe(45);
    expect(barWeight("EZ Barbell Curl", "kg")).toBe(10);
    expect(barWeight("Dumbbell Bench Press", "kg")).toBe(0);
  });

  test("every exercise has an animation", () => {
    expect(exercises.filter((e) => !e.gif)).toEqual([]);
  });

  test("the few ExerciseDB lacks show the closest movement, and say so", () => {
    const standIns = exercises.filter((e) => e.gifId);
    expect(standIns.map((e) => e.name).sort()).toEqual(["Barbell Hip Thrust", "Face Pull", "Plank", "Standing Military Press"]);
    standIns.forEach((e) => {
      expect(e.gifOf).toBeTruthy();
      expect(exercises.some((x) => x.id === e.gifId)).toBe(true); // a real animation
    });
  });

  test("the pec deck is ExerciseDB's own", () => {
    expect(currentName("Butterfly")).toBe("Lever Seated Fly");
    expect(exerciseByName("Lever Seated Fly")!.primaryMuscles).toEqual(["chest"]);
  });
});
