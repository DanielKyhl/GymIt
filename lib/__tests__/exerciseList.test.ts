import { Exercise } from "../../types/workout";
import { exercises, letterFor, letterPositions, withLetterHeaders } from "../exercises";

const make = (name: string): Exercise => ({
  id: name,
  name,
  equipment: null,
  bodyPart: null,
  primaryMuscles: [],
  secondaryMuscles: [],
  instructions: [],
});

describe("letterFor", () => {
  test("files a name under its first letter", () => {
    expect(letterFor("Barbell Curl")).toBe("B");
    expect(letterFor("dumbbell row")).toBe("D");
  });

  test("anything not a letter goes under #", () => {
    expect(letterFor("3/4 Sit-Up")).toBe("#");
    expect(letterFor("90/90 Hamstring")).toBe("#");
  });
});

describe("withLetterHeaders", () => {
  test("puts one heading in front of each run of names", () => {
    const rows = withLetterHeaders(["Ab Crunch", "Arnold Press", "Bench Press", "Crunch"].map(make));
    expect(rows.map((r) => (r.type === "header" ? r.letter : "·"))).toEqual(["A", "·", "·", "B", "·", "C", "·"]);
  });

  test("an empty list has no headings", () => {
    expect(withLetterHeaders([])).toEqual([]);
  });

  test("keeps every exercise, in the order given", () => {
    const names = ["Ab Crunch", "Bench Press", "Crunch"];
    const rows = withLetterHeaders(names.map(make));
    expect(rows.filter((r) => r.type === "exercise").map((r) => (r as { exercise: Exercise }).exercise.name)).toEqual(names);
  });
});

describe("letterPositions", () => {
  test("points at the row each heading sits on", () => {
    const rows = withLetterHeaders(["Ab Crunch", "Arnold Press", "Bench Press"].map(make));
    expect(letterPositions(rows)).toEqual({ A: 0, B: 3 });
  });
});

describe("the real exercise list", () => {
  test("is alphabetical, so the headings never repeat a letter", () => {
    const rows = withLetterHeaders(exercises);
    const letters = rows.filter((r) => r.type === "header").map((r) => (r as { letter: string }).letter);
    expect(letters).toEqual([...new Set(letters)]);
  });

  test("covers the alphabet without gaps in the middle", () => {
    const rows = withLetterHeaders(exercises);
    const letters = rows.filter((r) => r.type === "header").map((r) => (r as { letter: string }).letter);
    expect(letters.length).toBeGreaterThan(20);
    expect(rows).toHaveLength(exercises.length + letters.length);
  });
});
