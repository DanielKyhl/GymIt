import { Template, Workout } from '../types/workout';
import { BodyWeight } from './bodyweight';
import { putRecords, readLocal, readyUid, SETTINGS_ID, updateRecord } from './sync';
import { live, SyncRecord } from './syncMerge';

// The app's only doorway to saved data. Everything here reads and writes the
// signed-in account's copy on this device; lib/sync.ts backs it up to Firebase
// and keeps other devices in step. Screens never talk to Firebase directly.

type Synced<T> = T & SyncRecord;

type Settings = SyncRecord & {
    weeklyGoal?: number;
    bodyGender?: 'male' | 'female';
    defaultUnit?: 'kg' | 'lb';
    defaultRest?: number;
    premadeSeeded?: boolean;
    bodyWeight?: number;
    bodyWeightUnit?: 'kg' | 'lb';
    bodyWeightAsked?: boolean; // the Home prompt was answered or skipped
};

// Writes need an account to belong to; reaching one signed out is a bug.
async function requireUid(): Promise<string> {
    const uid = await readyUid();
    if (!uid) throw new Error('Tried to save while signed out.');
    return uid;
}

// ---------------------------------------------------------------------------
// Workouts — returned newest first.

export async function getWorkouts(): Promise<Workout[]> {
    const uid = await readyUid();
    if (!uid) return [];
    const all = await readLocal<Synced<Workout>>(uid, 'workouts');
    return live(all).sort((a, b) => b.date.localeCompare(a.date));
}

export async function saveWorkout(workout: Workout): Promise<void> {
    await putRecords(await requireUid(), 'workouts', [{ ...workout, updatedAt: Date.now() }], true);
}

// ---------------------------------------------------------------------------
// Templates

export async function getTemplates(): Promise<Template[]> {
    const uid = await readyUid();
    if (!uid) return [];
    return live(await readLocal<Synced<Template>>(uid, 'templates'));
}

export async function saveTemplate(template: Template): Promise<void> {
    await putRecords(await requireUid(), 'templates', [{ ...template, updatedAt: Date.now() }]);
}

export async function updateTemplate(template: Template): Promise<void> {
    await putRecords(await requireUid(), 'templates', [{ ...template, updatedAt: Date.now() }]);
}

// Kept as a tombstone rather than removed, so the deletion reaches your other
// devices instead of the next sync bringing the template back.
export async function deleteTemplate(id: string): Promise<void> {
    await updateRecord<Synced<Template>>(await requireUid(), 'templates', id, (current) => ({
        ...(current ?? { id, name: '', exercises: [] }),
        deleted: true,
        updatedAt: Date.now(),
    }));
}

// ---------------------------------------------------------------------------
// Settings — one synced record per account.

async function getSettings(): Promise<Partial<Settings>> {
    const uid = await readyUid();
    if (!uid) return {};
    const meta = await readLocal<Settings>(uid, 'meta');
    return meta.find((r) => r.id === SETTINGS_ID) ?? {};
}

async function setSetting(change: Partial<Settings>): Promise<void> {
    await updateRecord<Settings>(await requireUid(), 'meta', SETTINGS_ID, (current) => ({
        ...current,
        ...change,
        id: SETTINGS_ID,
        updatedAt: Date.now(),
    }));
}

export async function getWeeklyGoal(): Promise<number> {
    return (await getSettings()).weeklyGoal ?? 3;
}

export async function setWeeklyGoal(goal: number): Promise<void> {
    await setSetting({ weeklyGoal: goal });
}

export async function getBodyGender(): Promise<'male' | 'female'> {
    return (await getSettings()).bodyGender === 'female' ? 'female' : 'male';
}

export async function setBodyGender(gender: 'male' | 'female'): Promise<void> {
    await setSetting({ bodyGender: gender });
}

export async function getDefaultUnit(): Promise<'kg' | 'lb'> {
    return (await getSettings()).defaultUnit === 'lb' ? 'lb' : 'kg';
}

export async function setDefaultUnit(unit: 'kg' | 'lb'): Promise<void> {
    await setSetting({ defaultUnit: unit });
}

export async function getDefaultRest(): Promise<number> {
    return (await getSettings()).defaultRest ?? 120;
}

export async function setDefaultRest(seconds: number): Promise<void> {
    await setSetting({ defaultRest: seconds });
}

// Used as the weight for bodyweight exercises. Kept with the unit it was
// entered in, so switching kg/lb later converts it rather than misreading it.
export async function getBodyWeight(): Promise<BodyWeight | null> {
    const s = await getSettings();
    return s.bodyWeight ? { value: s.bodyWeight, unit: s.bodyWeightUnit ?? 'kg' } : null;
}

export async function setBodyWeight(value: number, unit: 'kg' | 'lb'): Promise<void> {
    await setSetting({ bodyWeight: value, bodyWeightUnit: unit, bodyWeightAsked: true });
}

// Ask once. After that it's changed from Settings, not nagged about.
export async function shouldAskBodyWeight(): Promise<boolean> {
    const s = await getSettings();
    return !s.bodyWeight && !s.bodyWeightAsked;
}

export async function skipBodyWeight(): Promise<void> {
    await setSetting({ bodyWeightAsked: true });
}

// Everything the user owns, as plain JSON, for the Settings backup button.
export async function exportAll(): Promise<string> {
    const { weeklyGoal, bodyGender, defaultUnit, defaultRest, bodyWeight, bodyWeightUnit } =
        await getSettings();
    return JSON.stringify({
        workouts: await getWorkouts(),
        templates: await getTemplates(),
        settings: { weeklyGoal, bodyGender, defaultUnit, defaultRest, bodyWeight, bodyWeightUnit },
    });
}
