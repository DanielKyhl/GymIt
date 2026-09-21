// Pure merge rules for syncing — no Firebase imports, so they're unit-testable.

// Anything that syncs carries an id, the time it was last edited on a device,
// and a tombstone flag so deletions can travel between devices too.
export type SyncRecord = {
  id: string;
  updatedAt: number;
  deleted?: boolean;
};

// Last edit wins, per record. Local order is kept and records that only exist
// remotely are appended, so lists don't reshuffle on every sync. On a tie the
// local copy is kept.
export function mergeRecords<T extends SyncRecord>(local: T[], remote: T[]): T[] {
  const byId = new Map(local.map((r) => [r.id, r]));
  for (const r of remote) {
    const mine = byId.get(r.id);
    if (!mine || r.updatedAt > mine.updatedAt) byId.set(r.id, r);
  }
  return [...byId.values()];
}

// What the rest of the app sees: tombstones hidden.
export function live<T extends SyncRecord>(records: T[]): T[] {
  return records.filter((r) => !r.deleted);
}

// Add or replace one record in a list, keeping its position if it exists.
export function upsert<T extends SyncRecord>(records: T[], record: T, prepend = false): T[] {
  const i = records.findIndex((r) => r.id === record.id);
  if (i === -1) return prepend ? [record, ...records] : [...records, record];
  const next = records.slice();
  next[i] = record;
  return next;
}
