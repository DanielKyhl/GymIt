import AsyncStorage from '@react-native-async-storage/async-storage';
import { Workout, Template } from '../types/workout';

const WORKOUTS_KEY = 'workouts';
const TEMPLATES_KEY = 'templates';

export async function getWorkouts(): Promise<Workout[]> {
    const saved = await AsyncStorage.getItem(WORKOUTS_KEY);
    return saved ? JSON.parse(saved) : [];
}

export async function saveWorkouts(workout: Workout[]): Promise<void> {
    const workouts = await getWorkouts();
    const updated = [workouts, ...workouts];
    await AsyncStorage.setItem(WORKOUTS_KEY, JSON.stringify(updated));
}

export async function getTemplates(): Promise<Template[]> {
    const saved = await AsyncStorage.getItem(TEMPLATES_KEY);
    return saved ? JSON.parse(saved) : [];
}

export async function saveTemplates(template: Template[]): Promise<void> {
    const templates = await getTemplates();
    const updated = [...templates, template];
    await AsyncStorage.setItem(TEMPLATES_KEY, JSON.stringify(updated));
}