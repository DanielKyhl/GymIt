import legacyNames from "../assets/legacyNames.json";
import { exerciseByName } from "./exercises";

// The exercise list moved from free-exercise-db to ExerciseDB, which names
// things differently ("Barbell Bench Press - Medium Grip" is now "Barbell
// Bench Press"). Old names with a clear new equivalent are moved over, so
// history, records and charts carry on under the new name. Old names without
// one stay as they are; lib/exercises.ts still knows what they trained.
const RENAMES = legacyNames as Record<string, string>;

// The name an exercise goes by now. A name that's already in the list is never
// touched, which makes renaming safe to repeat.
export function currentName(name: string): string {
  return (!exerciseByName(name) && RENAMES[name]) || name;
}

// The same record with its exercises under their current names, or null if
// nothing needed renaming (so callers only write what actually changed).
export function withCurrentNames<T extends { exercises: { name: string }[] }>(record: T): T | null {
  let changed = false;
  const exercises = record.exercises.map((ex) => {
    const name = currentName(ex.name);
    if (name === ex.name) return ex;
    changed = true;
    return { ...ex, name };
  });
  return changed ? { ...record, exercises } : null;
}
