import { Workout } from "../types/workout";
import { workoutVolume } from "./stats";
import { convertWeight } from "./units";

// Lifetime total lifted, measured against famous heavy things: "More than
// the Statue of Liberty. Next: the International Space Station, 45%".
// Rounded, commonly quoted total weights, lightest first.

export type Landmark = { id: string; name: string; kg: number };

export const LANDMARKS: Landmark[] = [
  { id: "bus", name: "a double-decker bus", kg: 12_500 },
  { id: "shuttle", name: "the Space Shuttle", kg: 78_000 },
  { id: "liberty", name: "the Statue of Liberty", kg: 204_000 },
  { id: "iss", name: "the International Space Station", kg: 420_000 },
  { id: "redeemer", name: "Christ the Redeemer", kg: 635_000 },
  { id: "saturn", name: "a fully fuelled Saturn V rocket", kg: 2_800_000 },
  { id: "submarine", name: "a nuclear submarine", kg: 7_900_000 },
  { id: "eiffel", name: "the Eiffel Tower", kg: 10_100_000 },
  { id: "pisa", name: "the Leaning Tower of Pisa", kg: 14_500_000 },
  { id: "titanic", name: "the Titanic", kg: 52_000_000 },
  { id: "carrier", name: "an aircraft carrier", kg: 100_000_000 },
  { id: "empire", name: "the Empire State Building", kg: 331_000_000 },
  { id: "burj", name: "the Burj Khalifa", kg: 500_000_000 },
  { id: "pyramid", name: "the Great Pyramid of Giza", kg: 5_900_000_000 },
];

export type Milestone = {
  passed: Landmark | null; // the heaviest one you've lifted more than
  next: Landmark | null; // the one after it (null past the pyramid)
  progress: number; // 0-1 of the way to `next`
};

export function lifetimeMilestone(totalKg: number): Milestone {
  // How many landmarks are behind you (the list is lightest first).
  const passedIndex = LANDMARKS.filter((l) => totalKg >= l.kg).length - 1;
  const passed = passedIndex >= 0 ? LANDMARKS[passedIndex] : null;
  const next = LANDMARKS[passedIndex + 1] ?? null;
  return { passed, next, progress: next ? Math.min(1, totalKg / next.kg) : 1 };
}

// Every workout's volume added up, in kg (workouts can be logged in either unit).
export function lifetimeKg(workouts: Workout[]): number {
  return workouts.reduce((sum, w) => sum + convertWeight(workoutVolume(w), w.unit, "kg"), 0);
}
