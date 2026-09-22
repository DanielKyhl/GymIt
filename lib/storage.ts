import AsyncStorage from '@react-native-async-storage/async-storage';
import { Template, Workout } from '../types/workout';
import { ActiveWorkout } from './activeWorkout';
import { addWeighIn, BodyWeight, BodyWeightEntry, todayKey } from './bodyweight';
import { Experience, Goal, needsOnboarding, restForGoal } from './onboarding';
import { hasSyncedBefore, isNewAccount, putRecords, readLocal, readyUid, SETTINGS_ID, updateRecord } from './sync';
import { live, SyncRecord } from './syncMerge';
import { normalizeUnits } from './units';

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
    bodyWeightLog?: BodyWeightEntry[]; // every weigh-in, oldest first
    goal?: Goal;
    experience?: Experience;
    onboarded?: boolean; // finished or skipped the first-run setup
    planTemplates?: string[]; // the split picked during setup, e.g. upper then lower
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

// For anything that compares or adds up weights (progress, PRs, XP, volume):
// every workout converted to the unit currently chosen in Settings.
export async function getWorkoutsForStats(): Promise<Workout[]> {
    const [workouts, unit] = await Promise.all([getWorkouts(), getDefaultUnit()]);
    return normalizeUnits(workouts, unit);
}

// ---------------------------------------------------------------------------
// The workout in progress. Device-only (not synced): it changes with every
// keystroke, and it only matters on the phone you're training with.

const activeKey = (uid: string) => `gymit:${uid}:active`;

export async function getActiveWorkout(): Promise<ActiveWorkout | null> {
    const uid = await readyUid();
    if (!uid) return null;
    const raw = await AsyncStorage.getItem(activeKey(uid));
    return raw ? JSON.parse(raw) : null;
}

export async function saveActiveWorkout(active: ActiveWorkout): Promise<void> {
    const uid = await readyUid();
    if (uid) await AsyncStorage.setItem(activeKey(uid), JSON.stringify(active));
}

export async function clearActiveWorkout(): Promise<void> {
    const uid = await readyUid();
    if (uid) await AsyncStorage.removeItem(activeKey(uid));
}

export async function saveWorkout(workout: Workout): Promise<void> {
    await putRecords(await requireUid(), 'workouts', [{ ...workout, updatedAt: Date.now() }], true);
}

// Fixing a finished workout (a typo'd weight, a set that didn't happen).
export async function updateWorkout(workout: Workout): Promise<void> {
    await putRecords(await requireUid(), 'workouts', [{ ...workout, updatedAt: Date.now() }]);
}

// A tombstone, like templates, so the deletion reaches your other devices.
export async function deleteWorkout(id: string): Promise<void> {
    await updateRecord<Synced<Workout>>(await requireUid(), 'workouts', id, (current) => ({
        ...(current ?? { id, name: '', date: new Date(0).toISOString(), durationSeconds: 0, unit: 'kg', exercises: [] }),
        deleted: true,
        updatedAt: Date.now(),
    }));
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

// Also logs today's weigh-in, for the body-weight chart on Progress.
export async function setBodyWeight(value: number, unit: 'kg' | 'lb'): Promise<void> {
    await updateRecord<Settings>(await requireUid(), 'meta', SETTINGS_ID, (current) => ({
        ...current,
        bodyWeight: value,
        bodyWeightUnit: unit,
        bodyWeightAsked: true,
        bodyWeightLog: addWeighIn(current?.bodyWeightLog ?? [], { date: todayKey(), value, unit }),
        id: SETTINGS_ID,
        updatedAt: Date.now(),
    }));
}

export async function getBodyWeightLog(): Promise<BodyWeightEntry[]> {
    return (await getSettings()).bodyWeightLog ?? [];
}

// Ask once. After that it's changed from Settings, not nagged about.
export async function shouldAskBodyWeight(): Promise<boolean> {
    const s = await getSettings();
    return !s.bodyWeight && !s.bodyWeightAsked;
}

export async function skipBodyWeight(): Promise<void> {
    await setSetting({ bodyWeightAsked: true });
}

// ---------------------------------------------------------------------------
// First-run setup (app/onboarding.tsx).

// Whether to show it. For older accounts, only once this device's first
// download has finished: an existing account whose data hasn't arrived yet
// (slow network) would otherwise look brand new.
export async function shouldOnboard(): Promise<boolean> {
    const uid = await readyUid();
    if (!uid) return false;
    if (!isNewAccount() && !(await hasSyncedBefore(uid))) return false;
    const [settings, workouts] = await Promise.all([getSettings(), getWorkouts()]);
    return needsOnboarding(settings, workouts.length);
}

export type OnboardingAnswers = {
    goal: Goal;
    experience: Experience;
    gender: 'male' | 'female'; // picks the body on the Recovery muscle map
    unit: 'kg' | 'lb';
    weeklyGoal: number;
    bodyWeight: number | null; // optional question
    planTemplates: string[];
};

// Saves every answer in one go, plus the rest timer that suits the goal.
export async function completeOnboarding(a: OnboardingAnswers): Promise<void> {
    await updateRecord<Settings>(await requireUid(), 'meta', SETTINGS_ID, (current) => ({
        ...current,
        goal: a.goal,
        experience: a.experience,
        bodyGender: a.gender,
        defaultUnit: a.unit,
        weeklyGoal: a.weeklyGoal,
        defaultRest: restForGoal(a.goal),
        planTemplates: a.planTemplates,
        onboarded: true,
        // Asked here, so Home doesn't ask again (even if they left it blank).
        bodyWeightAsked: true,
        ...(a.bodyWeight
            ? {
                  bodyWeight: a.bodyWeight,
                  bodyWeightUnit: a.unit,
                  bodyWeightLog: addWeighIn(current?.bodyWeightLog ?? [], {
                      date: todayKey(),
                      value: a.bodyWeight,
                      unit: a.unit,
                  }),
              }
            : {}),
        id: SETTINGS_ID,
        updatedAt: Date.now(),
    }));
}

// The templates of the split picked during setup, for the "Up next" suggestion.
export async function getPlanTemplates(): Promise<string[]> {
    return (await getSettings()).planTemplates ?? [];
}

export async function skipOnboarding(): Promise<void> {
    await setSetting({ onboarded: true });
}

// Everything the user owns, as plain JSON, for the Settings backup button.
export async function exportAll(): Promise<string> {
    const { weeklyGoal, bodyGender, defaultUnit, defaultRest, bodyWeight, bodyWeightUnit, bodyWeightLog, goal, experience } =
        await getSettings();
    return JSON.stringify({
        workouts: await getWorkouts(),
        templates: await getTemplates(),
        settings: {
            weeklyGoal,
            bodyGender,
            defaultUnit,
            defaultRest,
            bodyWeight,
            bodyWeightUnit,
            bodyWeightLog,
            goal,
            experience,
        },
    });
}
