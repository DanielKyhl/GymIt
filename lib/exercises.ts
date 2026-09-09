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

export function searchExercises(query: string): Exercise[] {
    const q = query.trim().toLowerCase();
    if (!q) return exercises;
    return exercises.filter((e) => e.name.toLowerCase().includes(q));
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
