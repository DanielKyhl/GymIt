import AsyncStorage from '@react-native-async-storage/async-storage';
import { Workout, Template } from '../types/workout';
import { PREMADE_TEMPLATES } from './premadeTemplates';

const WORKOUTS_KEY = 'workouts';
const TEMPLATES_KEY = 'templates';
const SEEDED_KEY = 'premadeSeeded';

export async function getWorkouts(): Promise<Workout[]> {
    const saved = await AsyncStorage.getItem(WORKOUTS_KEY);
    return saved ? JSON.parse(saved) : [];
}

export async function saveWorkout(workout: Workout): Promise<void> {
    const workouts = await getWorkouts();
    const updated = [workout, ...workouts];
    await AsyncStorage.setItem(WORKOUTS_KEY, JSON.stringify(updated));
}

export async function getTemplates(): Promise<Template[]> {
    const saved = await AsyncStorage.getItem(TEMPLATES_KEY);
    return saved ? JSON.parse(saved) : [];
}

export async function saveTemplate(template: Template): Promise<void> {
    const templates = await getTemplates();
    const updated = [...templates, template];
    await AsyncStorage.setItem(TEMPLATES_KEY, JSON.stringify(updated));
}

// Add the beginner templates once, on first launch. Guarded by a flag so
// deleting a premade template won't make it come back on the next launch.
export async function seedPremadeTemplates(): Promise<void> {
    const seeded = await AsyncStorage.getItem(SEEDED_KEY);
    if (seeded) return;
    const existing = await getTemplates();
    const updated = [...PREMADE_TEMPLATES, ...existing];
    await AsyncStorage.setItem(TEMPLATES_KEY, JSON.stringify(updated));
    await AsyncStorage.setItem(SEEDED_KEY, 'true');
}
