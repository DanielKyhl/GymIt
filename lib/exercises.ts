import exercisesData from '../assets/exercises.json';
import { Exercise } from '../types/workout';

export const exercises = exercisesData as unknown as Exercise[];

export function searchExercises(query: string): Exercise[] {
    const q = query.trim().toLowerCase();
    if (!q) return exercises;
    return exercises.filter((e) => e.name.toLowerCase().includes(q));
}
