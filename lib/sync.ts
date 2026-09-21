import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  collection,
  doc,
  getDocsFromServer,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  where,
  writeBatch,
} from "firebase/firestore";
import { auth, db } from "./firebase";
import { PREMADE_TEMPLATES } from "./premadeTemplates";
import { mergeRecords, SyncRecord, upsert } from "./syncMerge";

// Local-first sync. The device copy in AsyncStorage is what the app reads and
// writes; Firestore is the backup that keeps devices in step. The Firestore JS
// SDK has no persistent offline cache on React Native, so writing to it
// directly would lose a workout finished offline if the app was then closed.
//
// Cloud layout (one private tree per account, enforced by firestore.rules):
//   users/{uid}/workouts/{id}
//   users/{uid}/templates/{id}
//   users/{uid}/meta/settings

export type Collection = "workouts" | "templates" | "meta";
const COLLECTIONS: Collection[] = ["workouts", "templates", "meta"];

export const SETTINGS_ID = "settings";

const key = (uid: string, coll: Collection, part: string) => `gymit:${uid}:${coll}:${part}`;
const readyKey = (uid: string) => `gymit:${uid}:ready`;

export function currentUid(): string | null {
  return auth.currentUser?.uid ?? null;
}

// Firebase restores the saved login asynchronously when the app starts. Reads
// must wait for that: a screen opened first (a page refresh, a link) would
// otherwise see "signed out" and load nothing.
export async function readyUid(): Promise<string | null> {
  await auth.authStateReady();
  return currentUid();
}

// ---------------------------------------------------------------------------
// Serialising writes. Two quick edits (typing "90" into the rest field fires
// for "9" then "90") must apply in the order they were made, or the older one
// can land last and win. Each collection gets its own queue.

const queues = new Map<string, Promise<unknown>>();

function serial<T>(k: string, fn: () => Promise<T>): Promise<T> {
  const prev = queues.get(k) ?? Promise.resolve();
  const next = prev.then(fn, fn);
  queues.set(k, next.catch(() => undefined));
  return next;
}

// ---------------------------------------------------------------------------
// Local copy

export async function readLocal<T extends SyncRecord>(uid: string, coll: Collection): Promise<T[]> {
  const raw = await AsyncStorage.getItem(key(uid, coll, "data"));
  return raw ? JSON.parse(raw) : [];
}

async function writeLocal(uid: string, coll: Collection, records: SyncRecord[]): Promise<void> {
  await AsyncStorage.setItem(key(uid, coll, "data"), JSON.stringify(records));
}

// Ids edited locally that the cloud hasn't confirmed yet. Survives restarts,
// so anything saved offline is retried on the next sync.
async function readDirty(uid: string, coll: Collection): Promise<string[]> {
  const raw = await AsyncStorage.getItem(key(uid, coll, "dirty"));
  return raw ? JSON.parse(raw) : [];
}

async function addDirty(uid: string, coll: Collection, ids: string[]): Promise<void> {
  const dirty = new Set(await readDirty(uid, coll));
  ids.forEach((id) => dirty.add(id));
  await AsyncStorage.setItem(key(uid, coll, "dirty"), JSON.stringify([...dirty]));
}

// Upsert records locally and queue them for upload.
export async function putRecords<T extends SyncRecord>(
  uid: string,
  coll: Collection,
  incoming: T[],
  prepend = false
): Promise<void> {
  if (incoming.length === 0) return;
  await serial(key(uid, coll, "lock"), async () => {
    let records = await readLocal<T>(uid, coll);
    for (const r of incoming) records = upsert(records, r, prepend);
    await writeLocal(uid, coll, records);
    await addDirty(uid, coll, incoming.map((r) => r.id));
  });
  schedulePush(uid, coll);
}

// Read-modify-write one record without racing other writes to the same list.
export async function updateRecord<T extends SyncRecord>(
  uid: string,
  coll: Collection,
  id: string,
  change: (current: T | undefined) => T
): Promise<void> {
  await serial(key(uid, coll, "lock"), async () => {
    const records = await readLocal<T>(uid, coll);
    const next = change(records.find((r) => r.id === id));
    await writeLocal(uid, coll, upsert(records, next));
    await addDirty(uid, coll, [id]);
  });
  schedulePush(uid, coll);
}

// ---------------------------------------------------------------------------
// Upload

const pushing = new Map<string, Promise<void>>();
const pushAgain = new Set<string>();

// Fire-and-forget: never awaited by the UI, because offline the commit only
// resolves once the connection is back.
export function schedulePush(uid: string, coll: Collection): void {
  const k = key(uid, coll, "push");
  if (pushing.has(k)) {
    pushAgain.add(k);
    return;
  }
  const run = push(uid, coll)
    .catch(() => undefined) // stays dirty; retried on the next sync
    .finally(() => {
      pushing.delete(k);
      if (pushAgain.delete(k)) schedulePush(uid, coll);
    });
  pushing.set(k, run);
}

async function push(uid: string, coll: Collection): Promise<void> {
  const lock = key(uid, coll, "lock");
  const outgoing = await serial(lock, async () => {
    const dirty = new Set(await readDirty(uid, coll));
    return (await readLocal(uid, coll)).filter((r) => dirty.has(r.id));
  });
  if (outgoing.length === 0) return;

  // A batch holds at most 500 writes.
  for (let i = 0; i < outgoing.length; i += 400) {
    const batch = writeBatch(db);
    for (const r of outgoing.slice(i, i + 400)) {
      batch.set(doc(db, "users", uid, coll, r.id), { ...r, syncedAt: serverTimestamp() });
    }
    await batch.commit();
  }

  // Clear only what was sent unchanged. If a record was edited again while the
  // upload was in flight, it stays dirty so the newer version goes up too.
  const sent = new Map(outgoing.map((r) => [r.id, r.updatedAt]));
  await serial(lock, async () => {
    const current = new Map((await readLocal(uid, coll)).map((r) => [r.id, r.updatedAt]));
    const remaining = (await readDirty(uid, coll)).filter(
      (id) => !(sent.has(id) && current.get(id) === sent.get(id))
    );
    await AsyncStorage.setItem(key(uid, coll, "dirty"), JSON.stringify(remaining));
  });
}

// ---------------------------------------------------------------------------
// Download

type Cursor = { s: number; n: number };

// Fetch only documents the server has stamped since the last pull. The stamp
// is the server's clock, not the phone's, so a device with a wrong clock can't
// make another device skip its changes. Returns false if offline.
async function pull(uid: string, coll: Collection): Promise<boolean> {
  const rawCursor = await AsyncStorage.getItem(key(uid, coll, "cursor"));
  const cursor: Cursor = rawCursor ? JSON.parse(rawCursor) : { s: 0, n: 0 };

  let snap;
  try {
    snap = await getDocsFromServer(
      query(
        collection(db, "users", uid, coll),
        where("syncedAt", ">", new Timestamp(cursor.s, cursor.n)),
        orderBy("syncedAt")
      )
    );
  } catch {
    return false;
  }
  if (snap.empty) return true;

  let latest = cursor;
  const remote = snap.docs.map((d) => {
    const { syncedAt, ...record } = d.data() as SyncRecord & { syncedAt: Timestamp };
    latest = { s: syncedAt.seconds, n: syncedAt.nanoseconds };
    return record;
  });

  await serial(key(uid, coll, "lock"), async () => {
    const local = await readLocal(uid, coll);
    await writeLocal(uid, coll, mergeRecords(local, remote));
    await AsyncStorage.setItem(key(uid, coll, "cursor"), JSON.stringify(latest));
  });
  return true;
}

// ---------------------------------------------------------------------------
// One-off setup per account

type SettingsFields = {
  weeklyGoal?: number;
  bodyGender?: "male" | "female";
  defaultUnit?: "kg" | "lb";
  defaultRest?: number;
  premadeSeeded?: boolean;
};

const LEGACY_KEYS = [
  "workouts",
  "templates",
  "premadeSeeded",
  "weeklyGoal",
  "bodyGender",
  "defaultUnit",
  "defaultRest",
];

// Data from before accounts existed was stored under global keys. The first
// account to sign in on this device adopts it, then the old keys are removed
// so a second account doesn't inherit it too. The old login system also kept
// plaintext passwords ("registeredUsers"); those are deleted here.
async function adoptLegacyData(uid: string): Promise<void> {
  const found = Object.fromEntries(await AsyncStorage.multiGet(LEGACY_KEYS));
  const now = Date.now();

  if (found.workouts) {
    const workouts = JSON.parse(found.workouts) as SyncRecord[];
    await putRecords(uid, "workouts", workouts.map((w) => ({ ...w, updatedAt: now })));
  }
  if (found.templates) {
    const templates = JSON.parse(found.templates) as SyncRecord[];
    await putRecords(uid, "templates", templates.map((t) => ({ ...t, updatedAt: now })));
  }

  const legacy: SettingsFields = {};
  if (found.weeklyGoal) legacy.weeklyGoal = Number(found.weeklyGoal);
  if (found.bodyGender === "male" || found.bodyGender === "female") legacy.bodyGender = found.bodyGender;
  if (found.defaultUnit === "kg" || found.defaultUnit === "lb") legacy.defaultUnit = found.defaultUnit;
  if (found.defaultRest) legacy.defaultRest = Number(found.defaultRest);
  if (found.premadeSeeded) legacy.premadeSeeded = true;

  if (Object.keys(legacy).length > 0) {
    // Only fill gaps: if this account already has settings from another
    // device, those are newer than whatever this phone had lying around.
    await updateRecord<SyncRecord & SettingsFields>(uid, "meta", SETTINGS_ID, (current) => ({
      ...legacy,
      ...current,
      premadeSeeded: Boolean(current?.premadeSeeded || legacy.premadeSeeded),
      id: SETTINGS_ID,
      updatedAt: now,
    }));
  }

  await AsyncStorage.multiRemove([...LEGACY_KEYS, "user", "registeredUsers"]);
}

// The starter templates are added once per account, not once per device, so
// deleting one on your phone doesn't make it reappear when you sign in on web.
async function seedPremade(uid: string): Promise<void> {
  const settings = (await readLocal<SyncRecord & SettingsFields>(uid, "meta")).find(
    (r) => r.id === SETTINGS_ID
  );
  if (settings?.premadeSeeded) return;

  const now = Date.now();
  const existing = new Set((await readLocal(uid, "templates")).map((t) => t.id));
  const missing = PREMADE_TEMPLATES.filter((t) => !existing.has(t.id));
  await putRecords(uid, "templates", missing.map((t) => ({ ...t, updatedAt: now })));
  await updateRecord<SyncRecord & SettingsFields>(uid, "meta", SETTINGS_ID, (current) => ({
    ...current,
    premadeSeeded: true,
    id: SETTINGS_ID,
    updatedAt: now,
  }));
}

// ---------------------------------------------------------------------------

// True once this device has completed a full download for this account.
export async function hasSyncedBefore(uid: string): Promise<boolean> {
  return (await AsyncStorage.getItem(readyKey(uid))) === "1";
}

// Pull everything new, run one-off setup, then upload anything pending.
// Setup only runs after a successful pull: deciding "this account has no
// starter templates yet" from an empty offline cache would re-add ones the
// user had deliberately deleted.
export async function syncAll(uid: string): Promise<void> {
  const results = await Promise.all(COLLECTIONS.map((c) => pull(uid, c)));
  if (results.every(Boolean)) {
    await adoptLegacyData(uid);
    await seedPremade(uid);
    await AsyncStorage.setItem(readyKey(uid), "1");
  }
  COLLECTIONS.forEach((c) => schedulePush(uid, c));
}
