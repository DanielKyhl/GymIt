import { Template, Workout } from '../types/workout';
import { currentUid, putRecords, readLocal, SETTINGS_ID, updateRecord } from './sync';
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
};

// Writes need an account to belong to; reaching one signed out is a bug.
function requireUid(): string {
    const uid = currentUid();
    if (!uid) throw new Error('Tried to save while signed out.');
    return uid;
}

// ---------------------------------------------------------------------------
// Workouts — returned newest first.

export async function getWorkouts(): Promise<Workout[]> {
    const uid = currentUid();
    if (!uid) return [];
    const all = await readLocal<Synced<Workout>>(uid, 'workouts');
    return live(all).sort((a, b) => b.date.localeCompare(a.date));
}

export async function saveWorkout(workout: Workout): Promise<void> {
    await putRecords(requireUid(), 'workouts', [{ ...workout, updatedAt: Date.now() }], true);
}

// ---------------------------------------------------------------------------
// Templates

export async function getTemplates(): Promise<Template[]> {
    const uid = currentUid();
    if (!uid) return [];
    return live(await readLocal<Synced<Template>>(uid, 'templates'));
}

export async function saveTemplate(template: Template): Promise<void> {
    await putRecords(requireUid(), 'templates', [{ ...template, updatedAt: Date.now() }]);
}

export async function updateTemplate(template: Template): Promise<void> {
    await putRecords(requireUid(), 'templates', [{ ...template, updatedAt: Date.now() }]);
}

// Kept as a tombstone rather than removed, so the deletion reaches your other
// devices instead of the next sync bringing the template back.
export async function deleteTemplate(id: string): Promise<void> {
    await updateRecord<Synced<Template>>(requireUid(), 'templates', id, (current) => ({
        ...(current ?? { id, name: '', exercises: [] }),
        deleted: true,
        updatedAt: Date.now(),
    }));
}

// ---------------------------------------------------------------------------
// Settings — one synced record per account.

async function getSettings(): Promise<Partial<Settings>> {
    const uid = currentUid();
    if (!uid) return {};
    const meta = await readLocal<Settings>(uid, 'meta');
    return meta.find((r) => r.id === SETTINGS_ID) ?? {};
}

async function setSetting(change: Partial<Settings>): Promise<void> {
    await updateRecord<Settings>(requireUid(), 'meta', SETTINGS_ID, (current) => ({
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

// Everything the user owns, as plain JSON, for the Settings backup button.
export async function exportAll(): Promise<string> {
    const { weeklyGoal, bodyGender, defaultUnit, defaultRest } = await getSettings();
    return JSON.stringify({
        workouts: await getWorkouts(),
        templates: await getTemplates(),
        settings: { weeklyGoal, bodyGender, defaultUnit, defaultRest },
    });
}
