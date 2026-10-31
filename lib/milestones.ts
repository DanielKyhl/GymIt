import { Workout } from "../types/workout";
import { formatNumber } from "./format";
import { workoutVolume } from "./stats";
import { convertWeight, Unit } from "./units";

// Lifetime total lifted, measured against famous heavy things: "More than
// the Statue of Liberty. Next: the International Space Station, 45%".
// Rounded, commonly quoted total weights, lightest first.
//
// A ladder you can climb: after the first two (passed in your first couple of
// workouts), none is more than about twice the one before, and the last, the
// Saturn V, is a couple of years of steady training away. Past it the goals
// carry on in round numbers (roundGoal), so there's always a next one and
// never a jump to something out of reach.

export type Landmark = { id: string; name: string; kg: number };

export const LANDMARKS: Landmark[] = [
  { id: "car", name: "a car", kg: 1_500 },
  { id: "bus", name: "a double-decker bus", kg: 12_500 },
  { id: "chinook", name: "a fully loaded Chinook helicopter", kg: 22_700 },
  { id: "semi", name: "a fully loaded semi-truck", kg: 36_000 },
  { id: "tank", name: "an M1 Abrams tank", kg: 62_000 },
  { id: "shuttle", name: "the Space Shuttle", kg: 78_000 },
  { id: "whale", name: "a blue whale", kg: 150_000 },
  { id: "liberty", name: "the Statue of Liberty", kg: 204_000 },
  { id: "b777", name: "a Boeing 777 ready for take-off", kg: 351_000 },
  { id: "iss", name: "the International Space Station", kg: 420_000 },
  { id: "redeemer", name: "Christ the Redeemer", kg: 635_000 },
  { id: "a380s", name: "two A380s at take-off", kg: 1_150_000 },
  { id: "falcon", name: "a Falcon Heavy rocket at lift-off", kg: 1_420_000 },
  { id: "eye", name: "the London Eye", kg: 2_100_000 },
  { id: "atomium", name: "the Atomium", kg: 2_400_000 },
  { id: "saturn", name: "a fully fuelled Saturn V rocket", kg: 2_800_000 },
];

// Past the Saturn V, a goal every half million kilograms, or every million
// pounds (about the same distance), so the numbers stay round in your unit.
const STEP: Record<Unit, number> = { kg: 500_000, lb: 1_000_000 };

// A round goal past the last landmark, in your unit: "3.5 million kg".
function roundGoal(amount: number, unit: Unit): Landmark {
  return {
    id: `${unit}-${amount}`,
    name: `${formatNumber(amount / 1_000_000)} million ${unit}`,
    kg: unit === "kg" ? amount : convertWeight(amount, "lb", "kg"),
  };
}

export type Milestone = {
  passed: Landmark | null; // the heaviest one you've lifted more than
  next: Landmark; // the one after it: there's always one
  progress: number; // 0-1 of the way from `passed` (or nothing) to `next`
};

// Where a lifetime total stands on the ladder. `unit` is the one you use, for
// the round goals past the last landmark.
export function lifetimeMilestone(totalKg: number, unit: Unit = "kg"): Milestone {
  const top = LANDMARKS[LANDMARKS.length - 1];
  let passed: Landmark | null;
  let next: Landmark;
  if (totalKg < top.kg) {
    // How many landmarks are behind you (the list is lightest first).
    const passedIndex = LANDMARKS.filter((l) => totalKg >= l.kg).length - 1;
    passed = passedIndex >= 0 ? LANDMARKS[passedIndex] : null;
    next = LANDMARKS[passedIndex + 1];
  } else {
    // Past the top: round numbers in your unit, the first one above the top.
    const step = STEP[unit];
    const total = convertWeight(totalKg, "kg", unit);
    const first = (Math.floor(convertWeight(top.kg, "kg", unit) / step) + 1) * step;
    const reached = total >= first ? Math.floor(total / step) * step : null;
    passed = reached === null ? top : roundGoal(reached, unit);
    next = roundGoal(reached === null ? first : reached + step, unit);
  }
  // The bar fills from the landmark just passed to the next one.
  const from = passed?.kg ?? 0;
  const progress = Math.min(1, Math.max(0, (totalKg - from) / (next.kg - from)));
  return { passed, next, progress };
}

// Every workout's volume added up, in kg (workouts can be logged in either unit).
export function lifetimeKg(workouts: Workout[]): number {
  return workouts.reduce((sum, w) => sum + convertWeight(workoutVolume(w), w.unit, "kg"), 0);
}
