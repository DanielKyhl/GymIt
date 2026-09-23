import exercisesData from '../assets/exercises.json';
import { Exercise } from '../types/workout';

// free-exercise-db ships the photos in its own repo; serving them from a CDN
// keeps ~1700 images out of the app bundle.
const IMAGE_BASE =
    'https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/exercises';

// Sorted once at startup so every list that shows exercises is alphabetical.
export const exercises = (exercisesData as unknown as Exercise[])
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));

// Exercises where you move your own body weight (pull-ups, push-ups, dips...).
// Sets for these start at the user's body weight. A few lack an equipment
// value but say "Bodyweight" in the name. Stretches are excluded: holding a
// stretch isn't lifting your body weight, so it shouldn't add volume.
const BODYWEIGHT = new Set(
    exercises
        .filter((e) => e.equipment === 'body only' || /\bbodyweight\b/i.test(e.name))
        .filter((e) => e.category !== 'stretching')
        .map((e) => e.name)
);

export function isBodyweight(name: string): boolean {
    return BODYWEIGHT.has(name);
}

const EQUIPMENT = new Map(exercises.map((e) => [e.name, e.equipment]));

// Empty-bar weight for exercises loaded with plates, 0 for everything else.
// Used by the plate and warm-up calculators.
export function barWeight(name: string, unit: 'kg' | 'lb'): number {
    const equipment = EQUIPMENT.get(name);
    if (equipment === 'barbell') return unit === 'kg' ? 20 : 45;
    if (equipment === 'e-z curl bar') return unit === 'kg' ? 10 : 25;
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

// Full URL for one of an exercise's photos, or null if it has none.
export function exerciseImageUrl(exercise: Exercise, index = 0): string | null {
    const path = exercise.images?.[index];
    return path ? `${IMAGE_BASE}/${path}` : null;
}

// "chest, triceps" -> "Chest, Triceps"
export function muscleList(muscles: string[]): string {
    return muscles
        .map((m) => m.replace(/\b\w/g, (c) => c.toUpperCase()))
        .join(', ');
}
