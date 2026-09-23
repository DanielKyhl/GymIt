import exercisesData from '../assets/exercises.json';
import legacyData from '../assets/legacyExercises.json';
import { Exercise } from '../types/workout';

// The catalogue is ExerciseDB's free dataset (built by
// scripts/import-exercises.cjs). Its animations are free for personal and
// non-commercial apps, with credit to AscendAPI, and are served from
// ExerciseDB's own host rather than bundled.
const GIF_BASE = 'https://static.exercisedb.dev/media';

export const EXERCISE_CREDIT = 'Exercise animations by AscendAPI (ExerciseDB)';

// Sorted once at startup so every list that shows exercises is alphabetical.
export const exercises = (exercisesData as unknown as Exercise[])
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));

// Names from the previous catalogue that aren't in this one, with what they
// trained, so workouts logged under them still count on the charts and the
// recovery map. Saved names move to their new equivalent where there's a
// clear one (lib/storage.ts, migrateExerciseNames); the rest stay as they are.
type LegacyEntry = [primary: string[], secondary: string[], equipment: string | null, stretch: 0 | 1];
const LEGACY = legacyData as unknown as Record<string, LegacyEntry>;

export type LegacyExercise = { name: string; primaryMuscles: string[]; secondaryMuscles: string[]; equipment: string | null };

export function legacyExercise(name: string): LegacyExercise | undefined {
    const entry = LEGACY[name];
    if (!entry) return undefined;
    return { name, primaryMuscles: entry[0], secondaryMuscles: entry[1], equipment: entry[2] };
}

// Exercises where you move your own body weight (pull-ups, push-ups, dips...).
// Sets for these start at the user's body weight. Stretches, yoga poses and
// cardio are left out: they don't add lifting volume.
const BODYWEIGHT = new Set([
    ...exercises
        .filter((e) => e.equipment === 'body weight' && e.primaryMuscles.length > 0 && !/stretch|pose\b/i.test(e.name))
        .map((e) => e.name),
    ...Object.entries(LEGACY)
        .filter(([name, [, , equipment, stretch]]) => (equipment === 'body weight' || /\bbodyweight\b/i.test(name)) && !stretch)
        .map(([name]) => name),
]);

export function isBodyweight(name: string): boolean {
    return BODYWEIGHT.has(name);
}

const EQUIPMENT = new Map<string, string | null>([
    ...Object.entries(LEGACY).map(([name, entry]) => [name, entry[2]] as const),
    ...exercises.map((e) => [e.name, e.equipment] as const),
]);

// Empty-bar weight for exercises loaded with plates, 0 for everything else.
// Used by the plate and warm-up calculators.
export function barWeight(name: string, unit: 'kg' | 'lb'): number {
    const equipment = EQUIPMENT.get(name);
    if (equipment === 'barbell' || equipment === 'olympic barbell') return unit === 'kg' ? 20 : 45;
    if (equipment === 'ez barbell') return unit === 'kg' ? 10 : 25;
    return 0;
}

const BY_NAME = new Map(exercises.map((e) => [e.name, e]));

// The full entry for a name, or undefined for names not in the list.
export function exerciseByName(name: string): Exercise | undefined {
    return BY_NAME.get(name);
}

// The letter an exercise files under. Names that start with a digit ("3/4
// Sit-Up") go under "#", which sorts first, the same way the list does.
export function letterFor(name: string): string {
    const c = name.trim()[0]?.toUpperCase() ?? '#';
    return c >= 'A' && c <= 'Z' ? c : '#';
}

export const LETTERS = ['#', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')];

// One flat list of headings and exercises, so the picker can show where it is
// in the alphabet and jump straight to a letter. Pinned lists (recent,
// starred) sit above the alphabet under a section heading, and their rows are
// marked so the same exercise can appear twice without clashing.
export type ExerciseRow =
    | { type: 'section'; title: string }
    | { type: 'header'; letter: string }
    | { type: 'exercise'; exercise: Exercise; pinned?: 'recent' | 'favourites' };

export function withLetterHeaders(list: Exercise[]): ExerciseRow[] {
    const rows: ExerciseRow[] = [];
    let current = '';
    list.forEach((exercise) => {
        const letter = letterFor(exercise.name);
        if (letter !== current) {
            rows.push({ type: 'header', letter });
            current = letter;
        }
        rows.push({ type: 'exercise', exercise });
    });
    return rows;
}

// Where each letter's heading sits in that list, for the A-Z rail.
export function letterPositions(rows: ExerciseRow[]): Record<string, number> {
    const at: Record<string, number> = {};
    rows.forEach((row, i) => {
        if (row.type === 'header') at[row.letter] = i;
    });
    return at;
}

// The exercise's animation, or null if it has none.
export function exerciseImageUrl(exercise: Exercise): string | null {
    return exercise.gif ? `${GIF_BASE}/${exercise.gifId ?? exercise.id}.gif` : null;
}

// "chest, triceps" -> "Chest, Triceps"
export function muscleList(muscles: string[]): string {
    return muscles
        .map((m) => m.replace(/\b\w/g, (c) => c.toUpperCase()))
        .join(', ');
}
