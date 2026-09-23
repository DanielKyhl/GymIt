import { exercises } from "../exercises";
import {
  buildPickerRows,
  favouriteExercises,
  filterExercises,
  matchesQuery,
  parseQuery,
  recentExercises,
} from "../exerciseSearch";
import { set, workout } from "./fixtures";

// Names from the real list, so the tests break if the data stops supporting a
// search people rely on.
const search = (query: string) => filterExercises(exercises, { query, muscle: null, equipment: null }).map((e) => e.name);
const finds = (query: string, name: string) => matchesQuery(name, parseQuery(query));

describe("search", () => {
  test("word order doesn't matter", () => {
    expect(finds("curl dumbbell", "Dumbbell Bicep Curl")).toBe(true);
    expect(finds("press bench barbell", "Barbell Bench Press")).toBe(true);
  });

  test("every word has to be there", () => {
    expect(finds("dumbbell squat", "Dumbbell Bicep Curl")).toBe(false);
  });

  test("hyphens and spaces don't matter", () => {
    expect(finds("pullup", "Pull-Up")).toBe(true);
    expect(finds("pull up", "Pull-Up")).toBe(true);
    expect(finds("chinup", "Chin-Up")).toBe(true);
    expect(search("tbar row").length).toBeGreaterThan(0);
  });

  test("a one or two letter word only matches the start of a word", () => {
    expect(finds("t bar row", "Bent Over One-Arm Long Bar Row")).toBe(false);
    expect(finds("ez curl", "EZ-Bar Curl")).toBe(true);
    expect(finds("ez curl", "Seated Close-Grip Concentration Barbell Curl")).toBe(false);
  });

  test("singular finds plural", () => {
    expect(finds("tricep", "Triceps Pushdown")).toBe(true);
    expect(finds("fly", "Dumbbell Flyes")).toBe(true);
  });

  test("knows gym shorthand", () => {
    expect(search("rdl")).toContain("Barbell Romanian Deadlift");
    expect(search("db press")).toContain("Dumbbell Seated Shoulder Press");
    expect(search("ohp")).toContain("Barbell Seated Overhead Press");
    expect(search("pec deck")).toContain("Lever Seated Fly");
    expect(search("butterfly")).toContain("Lever Seated Fly"); // what the old list called it
    expect(search("skull crusher")).toEqual(
      expect.arrayContaining(["Barbell Lying Triceps Extension Skull Crusher", "Barbell Reverse Grip Skullcrusher", "Barbell Lying Triceps Extension"])
    );
    expect(search("bulgarian")).toContain("Dumbbell Single Leg Split Squat");
    expect(search("ghr")).toContain("Glute-Ham Raise");
    expect(search("machine chest press")).toContain("Lever Chest Press"); // ExerciseDB says "lever"
  });

  test("shorthand only counts as a whole word", () => {
    // "rdl" is inside "hurdle", "ohp" could be inside anything
    expect(finds("rdl", "Hurdle Hops")).toBe(false);
    expect(search("rdl").every((name) => /romanian deadlift/i.test(name))).toBe(true);
  });

  test("shorthand combines with other words", () => {
    const results = search("db bench");
    expect(results).toEqual(expect.arrayContaining(["Dumbbell Bench Press", "Dumbbell Incline Bench Press"]));
    results.forEach((name) => expect(name.toLowerCase()).toMatch(/dumbbell|\bdb\b/));
  });

  test("an empty search keeps everything", () => {
    expect(search("   ")).toHaveLength(exercises.length);
  });
});

describe("filters", () => {
  test("by main muscle only: bench press is chest, not arms", () => {
    const arms = filterExercises(exercises, { query: "", muscle: "arms", equipment: null }).map((e) => e.name);
    expect(arms).toContain("Cable Pushdown");
    expect(arms).not.toContain("Barbell Bench Press");
    const chest = filterExercises(exercises, { query: "", muscle: "chest", equipment: null }).map((e) => e.name);
    expect(chest).toContain("Barbell Bench Press");
  });

  test("muscle and equipment combine", () => {
    const list = filterExercises(exercises, { query: "", muscle: "chest", equipment: "dumbbell" });
    expect(list.length).toBeGreaterThan(5);
    list.forEach((e) => {
      expect(e.primaryMuscles).toContain("chest");
      expect(e.equipment).toBe("dumbbell");
    });
  });

  test("Barbell includes the EZ bar", () => {
    const names = filterExercises(exercises, { query: "curl", muscle: null, equipment: "barbell" }).map((e) => e.name);
    expect(names).toContain("EZ Barbell Curl");
  });

  test("filters and search combine", () => {
    const names = filterExercises(exercises, { query: "press", muscle: "shoulders", equipment: "dumbbell" }).map((e) => e.name);
    expect(names).toContain("Dumbbell Seated Shoulder Press");
    expect(names).not.toContain("Barbell Seated Overhead Press");
  });
});

describe("recent", () => {
  const NOW = new Date(2026, 8, 20, 12).getTime();
  const daysAgo = (d: number) => new Date(NOW - d * 86400000).toISOString();
  const did = (d: number, ...names: string[]) => workout(`W${d}`, daysAgo(d), names.map((name) => ({ name, sets: [set(50, 8)] })));

  test("most used lately comes first, then the most recent", () => {
    const history = [
      did(1, "Barbell Full Squat"),
      did(3, "Barbell Bench Press", "Barbell Full Squat"),
      did(5, "Barbell Bench Press", "Barbell Full Squat"),
      did(2, "Pull-Up"),
    ];
    expect(recentExercises(history, NOW).map((e) => e.name)).toEqual([
      "Barbell Full Squat", // 3 times
      "Barbell Bench Press", // twice
      "Pull-Up", // once, 2 days ago
    ]);
  });

  test("anything older than 90 days ranks behind the last 90, by recency", () => {
    const history = [did(200, "Barbell Full Squat"), did(200, "Barbell Full Squat"), did(10, "Pull-Up"), did(120, "Barbell Deadlift")];
    expect(recentExercises(history, NOW).map((e) => e.name)).toEqual(["Pull-Up", "Barbell Deadlift", "Barbell Full Squat"]);
  });

  test("an exercise with nothing ticked off doesn't count", () => {
    const skipped = workout("W", daysAgo(1), [{ name: "Pull-Up", sets: [set(0, 8, { done: false })] }]);
    expect(recentExercises([skipped], NOW)).toEqual([]);
  });

  test("counts an exercise once per workout, and stops at 10", () => {
    const names = exercises.slice(0, 12).map((e) => e.name);
    const history = [did(1, ...names, names[0])];
    const recent = recentExercises(history, NOW);
    expect(recent).toHaveLength(10);
    expect(new Set(recent.map((e) => e.id)).size).toBe(10);
  });
});

describe("the picker's rows", () => {
  const byName = (...names: string[]) => names.map((n) => exercises.find((e) => e.name === n)!);

  test("Recent, then Favourites, then the alphabet", () => {
    const rows = buildPickerRows(byName("Barbell Romanian Deadlift", "Pull-Up"), byName("Pull-Up"), byName("Barbell Romanian Deadlift"));
    expect(rows.map((r) => (r.type === "exercise" ? `${r.pinned ?? "·"}:${r.exercise.name}` : r.type === "section" ? r.title : r.letter))).toEqual([
      "Recent",
      "recent:Pull-Up",
      "Favourites",
      "favourites:Barbell Romanian Deadlift",
      "B",
      "·:Barbell Romanian Deadlift",
      "P",
      "·:Pull-Up",
    ]);
  });

  test("empty pinned lists leave no heading behind", () => {
    const rows = buildPickerRows(byName("Pull-Up"), [], []);
    expect(rows[0]).toEqual({ type: "header", letter: "P" });
  });

  test("favourites come out A-Z and skip names that no longer exist", () => {
    expect(favouriteExercises(["Barbell Romanian Deadlift", "Not A Real Lift", "Barbell Full Squat"]).map((e) => e.name)).toEqual([
      "Barbell Full Squat",
      "Barbell Romanian Deadlift",
    ]);
  });
});
