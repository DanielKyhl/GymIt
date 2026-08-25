import AsyncStorage from '@react-native-async-storage/async-storage';
import { Workout, Template } from '../types/workout';
import { PREMADE_TEMPLATES } from './premadeTemplates';

const WORKOUTS_KEY = 'workouts';
const TEMPLATES_KEY = 'templates';
const SEEDED_KEY = 'premadeSeeded';
const WEEKLY_GOAL_KEY = 'weeklyGoal';
const BODY_GENDER_KEY = 'bodyGender';
const DEFAULT_UNIT_KEY = 'defaultUnit';
const DEFAULT_REST_KEY = 'defaultRest';

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

export async function updateTemplate(template: Template): Promise<void> {
    const templates = await getTemplates();
    const updated = templates.map((t) => (t.id === template.id ? template : t));
    await AsyncStorage.setItem(TEMPLATES_KEY, JSON.stringify(updated));
}

export async function deleteTemplate(id: string): Promise<void> {
    const templates = await getTemplates();
    const updated = templates.filter((t) => t.id !== id);
    await AsyncStorage.setItem(TEMPLATES_KEY, JSON.stringify(updated));
}

export async function getWeeklyGoal(): Promise<number> {
    const saved = await AsyncStorage.getItem(WEEKLY_GOAL_KEY);
    return saved ? Number(saved) : 3;
}

export async function setWeeklyGoal(goal: number): Promise<void> {
    await AsyncStorage.setItem(WEEKLY_GOAL_KEY, String(goal));
}

export async function getBodyGender(): Promise<"male" | "female"> {
    const saved = await AsyncStorage.getItem(BODY_GENDER_KEY);
    return saved === "female" ? "female" : "male";
}

export async function setBodyGender(gender: "male" | "female"): Promise<void> {
    await AsyncStorage.setItem(BODY_GENDER_KEY, gender);
}

export async function getDefaultUnit(): Promise<"kg" | "lb"> {
    const saved = await AsyncStorage.getItem(DEFAULT_UNIT_KEY);
    return saved === "lb" ? "lb" : "kg";
}

export async function setDefaultUnit(unit: "kg" | "lb"): Promise<void> {
    await AsyncStorage.setItem(DEFAULT_UNIT_KEY, unit);
}

export async function getDefaultRest(): Promise<number> {
    const saved = await AsyncStorage.getItem(DEFAULT_REST_KEY);
    return saved ? Number(saved) : 120;
}

export async function setDefaultRest(seconds: number): Promise<void> {
    await AsyncStorage.setItem(DEFAULT_REST_KEY, String(seconds));
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
