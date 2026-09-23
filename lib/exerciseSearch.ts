import { Exercise, Workout } from "../types/workout";
import { exerciseByName, ExerciseRow, withLetterHeaders } from "./exercises";

// Finding an exercise in the picker: a search that ignores word order and
// knows gym shorthand, filters by main muscle and by equipment, and the lists
// pinned above the alphabet (what you've been doing lately, what you starred).

const DAY_MS = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Search

// Lowercase with punctuation as spaces, so "Pull-Up", "pull up" and "pullup"
// can all find each other.
const spaced = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

// Shorthand and gym names, each with what the exercise list actually calls
// it. The shorthand still matches as typed too, so "db" also finds the names
// that say "DB".
const SYNONYMS: Record<string, string[]> = {
  db: ["dumbbell"],
  bb: ["barbell"],
  kb: ["kettlebell"],
  dl: ["deadlift"],
  machine: ["lever", "sled", "smith"], // what ExerciseDB calls its machines
  rdl: ["romanian deadlift"],
  sldl: ["stiff leg deadlift", "straight leg deadlift"],
  ohp: ["overhead press", "military press", "shoulder press"],
  "overhead press": ["shoulder press", "military press"],
  "military press": ["shoulder press", "overhead press"],
  "shoulder press": ["overhead press", "military press"],
  cgbp: ["close grip bench press"],
  "lat pulldown": ["pulldown"],
  "skull crusher": ["skullcrusher", "lying triceps extension", "lying extension"],
  skullcrusher: ["skull crusher", "lying triceps extension", "lying extension"],
  "pec deck": ["lever seated fly", "butterfly"],
  butterfly: ["lever seated fly"],
  "cable fly": ["cable cross over", "cable standing fly", "cable middle fly"],
  crossover: ["cross over"],
  flies: ["fly"],
  "rear delt fly": ["reverse fly", "rear delt"],
  bulgarian: ["split squat"],
  ghr: ["glute ham raise"],
  hspu: ["handstand push"],
  "ab wheel": ["rollerout", "rollout"],
  "farmers carry": ["farmers walk"],
  "farmer carry": ["farmers walk"],
};

// Longest first, so "rear delt fly" is taken whole before anything shorter.
const SYNONYM_KEYS = Object.keys(SYNONYMS).sort((a, b) => b.length - a.length);

// A query becomes a list of terms that must all match. Each term is a few
// alternatives, and an alternative is a set of words that must all appear.
// `whole` is the query with its spaces taken out, for names that run the
// words together: "pull up" is "Pullups", "t bar" is "T-Bar".
type Term = string[][];
export type ParsedQuery = { terms: Term[]; whole: string | null };

export function parseQuery(query: string): ParsedQuery {
  const words = spaced(query);
  const compact = words.replace(/ /g, "");
  const whole = words.includes(" ") && compact.length >= 3 ? compact : null;
  let rest = ` ${words} `;
  const terms: Term[] = [];
  for (const key of SYNONYM_KEYS) {
    const at = rest.indexOf(` ${key} `);
    if (at === -1) continue;
    // The shorthand as typed only counts as a whole word (" rdl " is not in
    // "hurdle"), marked by the spaces around it.
    terms.push([[` ${key} `], ...SYNONYMS[key].map((s) => s.split(" "))]);
    rest = rest.slice(0, at) + rest.slice(at + key.length + 1);
  }
  rest
    .split(" ")
    .filter(Boolean)
    .forEach((word) => terms.push([[word]]));
  return { terms, whole };
}

const forms = new Map<string, { spaced: string; compact: string }>();
function formsOf(name: string) {
  let f = forms.get(name);
  if (!f) {
    const s = spaced(name);
    f = { spaced: s, compact: s.replace(/ /g, "") };
    forms.set(name, f);
  }
  return f;
}

export function matchesQuery(name: string, { terms, whole }: ParsedQuery): boolean {
  if (terms.length === 0) return true;
  const f = formsOf(name);
  if (whole && f.compact.includes(whole)) return true;
  // Short words only count at the start of a word: the "t" in "t bar row"
  // shouldn't match every name with a t in it. Longer ones match anywhere, so
  // "tricep" finds "triceps" and "chinup" finds "Chin-Up". A word with spaces
  // around it has to be a whole word.
  const padded = ` ${f.spaced} `;
  const has = (word: string) =>
    word.startsWith(" ")
      ? padded.includes(word)
      : word.length <= 2
        ? padded.includes(` ${word}`)
        : f.spaced.includes(word) || f.compact.includes(word);
  return terms.every((alternatives) => alternatives.some((words) => words.every(has)));
}

// The results worth putting above the alphabet while searching, since the
// list itself is A-Z: "pull up" would otherwise leave Pull-Up under P, below
// "Archer Pull Up" and every other name that contains it. Best first: the
// name exactly, then names starting with it, then an equipment word plus it
// ("bench press" -> Barbell Bench Press, Dumbbell Bench Press).
const BEST_LIMIT = 5;

export function bestMatches(list: Exercise[], query: string, limit = BEST_LIMIT): Exercise[] {
  const q = spaced(query);
  if (!q) return [];
  const qCompact = q.replace(/ /g, "");
  const qWords = q.split(" ").length;
  const rank = (name: string) => {
    const f = formsOf(name);
    if (f.spaced === q || f.compact === qCompact) return 0;
    if (f.spaced.startsWith(q) || f.compact.startsWith(qCompact)) return 1;
    if (f.spaced.endsWith(` ${q}`) && f.spaced.split(" ").length === qWords + 1) return 2;
    return -1;
  };
  return list
    .map((e) => ({ e, r: rank(e.name) }))
    .filter((x) => x.r >= 0)
    .sort((a, b) => a.r - b.r || a.e.name.length - b.e.name.length || a.e.name.localeCompare(b.e.name))
    .slice(0, limit)
    .map((x) => x.e);
}

// ---------------------------------------------------------------------------
// Filters

// By the exercise's main muscle only, the same rule the weekly sets chart uses.
export const MUSCLE_GROUPS = [
  { id: "chest", label: "Chest", muscles: ["chest"] },
  { id: "back", label: "Back", muscles: ["lats", "middle back", "lower back", "traps"] },
  { id: "shoulders", label: "Shoulders", muscles: ["shoulders"] },
  { id: "arms", label: "Arms", muscles: ["biceps", "triceps", "forearms"] },
  { id: "legs", label: "Legs", muscles: ["quadriceps", "hamstrings", "glutes", "calves", "adductors", "abductors"] },
  { id: "core", label: "Core", muscles: ["abdominals"] },
] as const;

export const EQUIPMENT_GROUPS = [
  { id: "barbell", label: "Barbell", equipment: ["barbell", "olympic barbell", "ez barbell", "trap bar"] },
  { id: "dumbbell", label: "Dumbbell", equipment: ["dumbbell"] },
  { id: "cable", label: "Cable", equipment: ["cable"] },
  { id: "machine", label: "Machine", equipment: ["leverage machine", "smith machine", "sled machine", "assisted"] },
  { id: "bodyweight", label: "Bodyweight", equipment: ["body weight", "weighted"] },
  { id: "kettlebell", label: "Kettlebell", equipment: ["kettlebell"] },
] as const;

export type MuscleGroupId = (typeof MUSCLE_GROUPS)[number]["id"];
export type EquipmentId = (typeof EQUIPMENT_GROUPS)[number]["id"];

export type ExerciseFilters = {
  query: string;
  muscle: MuscleGroupId | null;
  equipment: EquipmentId | null;
};

// Keeps the order it was given, so pinned lists stay in their own order.
export function filterExercises(list: Exercise[], { query, muscle, equipment }: ExerciseFilters): Exercise[] {
  const parsed = parseQuery(query);
  const muscles: readonly string[] | null = muscle ? MUSCLE_GROUPS.find((g) => g.id === muscle)!.muscles : null;
  const kinds: readonly string[] | null = equipment ? EQUIPMENT_GROUPS.find((g) => g.id === equipment)!.equipment : null;
  return list.filter(
    (e) =>
      (!muscles || e.primaryMuscles.some((m) => muscles.includes(m))) &&
      (!kinds || (e.equipment !== null && kinds.includes(e.equipment))) &&
      matchesQuery(e.name, parsed)
  );
}

// ---------------------------------------------------------------------------
// Pinned lists

const RECENT_DAYS = 90;
const RECENT_LIMIT = 10;

// What you've been doing: the exercises used in the most workouts over the
// last 90 days, then anything older by how recently it was done. Only counts
// an exercise if at least one of its sets was ticked off.
export function recentExercises(workouts: Workout[], now: number = Date.now(), limit = RECENT_LIMIT): Exercise[] {
  const seen = new Map<string, { recent: number; last: number }>();
  workouts.forEach((w) => {
    const t = new Date(w.date).getTime();
    if (t > now) return;
    const names = new Set(w.exercises.filter((ex) => ex.sets.some((s) => s.done)).map((ex) => ex.name));
    names.forEach((name) => {
      const cur = seen.get(name) ?? { recent: 0, last: 0 };
      if (now - t <= RECENT_DAYS * DAY_MS) cur.recent += 1;
      cur.last = Math.max(cur.last, t);
      seen.set(name, cur);
    });
  });
  return [...seen.entries()]
    .sort(([a, x], [b, y]) => y.recent - x.recent || y.last - x.last || a.localeCompare(b))
    .map(([name]) => exerciseByName(name))
    .filter((e): e is Exercise => e !== undefined)
    .slice(0, limit);
}

// Starred exercises, A-Z, skipping any name no longer in the list.
export function favouriteExercises(names: string[]): Exercise[] {
  return names
    .map(exerciseByName)
    .filter((e): e is Exercise => e !== undefined)
    .sort((a, b) => a.name.localeCompare(b.name));
}

// The picker's whole list: Best matches (while searching), Recent, then
// Favourites, then the alphabet.
export function buildPickerRows(all: Exercise[], recent: Exercise[], favourites: Exercise[], best: Exercise[] = []): ExerciseRow[] {
  const rows: ExerciseRow[] = [];
  if (best.length > 0) {
    rows.push({ type: "section", title: "Best matches" });
    best.forEach((exercise) => rows.push({ type: "exercise", exercise, pinned: "best" }));
  }
  if (recent.length > 0) {
    rows.push({ type: "section", title: "Recent" });
    recent.forEach((exercise) => rows.push({ type: "exercise", exercise, pinned: "recent" }));
  }
  if (favourites.length > 0) {
    rows.push({ type: "section", title: "Favourites" });
    favourites.forEach((exercise) => rows.push({ type: "exercise", exercise, pinned: "favourites" }));
  }
  return rows.concat(withLetterHeaders(all));
}
