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
    expect(finds("press bench barbell", "Barbell Bench Press - Medium Grip")).toBe(true);
  });

  test("every word has to be there", () => {
    expect(finds("dumbbell squat", "Dumbbell Bicep Curl")).toBe(false);
  });

  test("hyphens and spaces don't matter", () => {
    expect(finds("pullup", "Pullups")).toBe(true);
    expect(finds("pull up", "Pullups")).toBe(true);
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
    expect(search("rdl")).toContain("Romanian Deadlift");
    expect(search("db press")).toContain("Dumbbell Shoulder Press");
    expect(search("ohp")).toContain("Barbell Shoulder Press");
    expect(search("pec deck")).toContain("Butterfly");
    expect(search("skull crusher")).toEqual(expect.arrayContaining(["EZ-Bar Skullcrusher", "Lying Triceps Press"]));
    expect(search("bulgarian")).toContain("Split Squat with Dumbbells");
    expect(search("ghr")).toContain("Glute Ham Raise");
  });

  test("shorthand only counts as a whole word", () => {
    // "rdl" is inside "hurdle"
    expect(search("rdl")).not.toContain("Front Cone Hops (or hurdle hops)");
    expect(search("rdl").every((name) => /romanian deadlift/i.test(name))).toBe(true);
  });

  test("shorthand combines with other words", () => {
    const results = search("db bench");
    expect(results).toContain("Dumbbell Bench Press");
    expect(results).toContain("Hammer Grip Incline DB Bench Press"); // says DB, not dumbbell
    results.forEach((name) => expect(name.toLowerCase()).toMatch(/dumbbell|\bdb\b/));
  });

  test("an empty search keeps everything", () => {
    expect(search("   ")).toHaveLength(exercises.length);
  });
});

describe("filters", () => {
  test("by main muscle only: bench press is chest, not arms", () => {
    const arms = filterExercises(exercises, { query: "", muscle: "arms", equipment: null }).map((e) => e.name);
    expect(arms).toContain("Triceps Pushdown");
    expect(arms).not.toContain("Barbell Bench Press - Medium Grip");
    const chest = filterExercises(exercises, { query: "", muscle: "chest", equipment: null }).map((e) => e.name);
    expect(chest).toContain("Barbell Bench Press - Medium Grip");
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
    expect(names).toContain("EZ-Bar Curl");
  });

  test("filters and search combine", () => {
    const names = filterExercises(exercises, { query: "press", muscle: "shoulders", equipment: "dumbbell" }).map((e) => e.name);
    expect(names).toContain("Dumbbell Shoulder Press");
    expect(names).not.toContain("Barbell Shoulder Press");
  });
});

describe("recent", () => {
  const NOW = new Date(2026, 8, 20, 12).getTime();
  const daysAgo = (d: number) => new Date(NOW - d * 86400000).toISOString();
  const did = (d: number, ...names: string[]) => workout(`W${d}`, daysAgo(d), names.map((name) => ({ name, sets: [set(50, 8)] })));

  test("most used lately comes first, then the most recent", () => {
    const history = [
      did(1, "Barbell Squat"),
      did(3, "Barbell Bench Press - Medium Grip", "Barbell Squat"),
      did(5, "Barbell Bench Press - Medium Grip", "Barbell Squat"),
      did(2, "Pullups"),
    ];
    expect(recentExercises(history, NOW).map((e) => e.name)).toEqual([
      "Barbell Squat", // 3 times
      "Barbell Bench Press - Medium Grip", // twice
      "Pullups", // once, 2 days ago
    ]);
  });

  test("anything older than 90 days ranks behind the last 90, by recency", () => {
    const history = [did(200, "Barbell Squat"), did(200, "Barbell Squat"), did(10, "Pullups"), did(120, "Barbell Deadlift")];
    expect(recentExercises(history, NOW).map((e) => e.name)).toEqual(["Pullups", "Barbell Deadlift", "Barbell Squat"]);
  });

  test("an exercise with nothing ticked off doesn't count", () => {
    const skipped = workout("W", daysAgo(1), [{ name: "Pullups", sets: [set(0, 8, { done: false })] }]);
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
    const rows = buildPickerRows(byName("Pullups", "Romanian Deadlift"), byName("Pullups"), byName("Romanian Deadlift"));
    expect(rows.map((r) => (r.type === "exercise" ? `${r.pinned ?? "·"}:${r.exercise.name}` : r.type === "section" ? r.title : r.letter))).toEqual([
      "Recent",
      "recent:Pullups",
      "Favourites",
      "favourites:Romanian Deadlift",
      "P",
      "·:Pullups",
      "R",
      "·:Romanian Deadlift",
    ]);
  });

  test("empty pinned lists leave no heading behind", () => {
    const rows = buildPickerRows(byName("Pullups"), [], []);
    expect(rows[0]).toEqual({ type: "header", letter: "P" });
  });

  test("favourites come out A-Z and skip names that no longer exist", () => {
    expect(favouriteExercises(["Romanian Deadlift", "Not A Real Lift", "Barbell Squat"]).map((e) => e.name)).toEqual([
      "Barbell Squat",
      "Romanian Deadlift",
    ]);
  });
});
