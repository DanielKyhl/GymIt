import { isBodyweight } from "./exercises";
import { convertWeight, Unit } from "./units";

export type BodyWeight = { value: number; unit: Unit };

// The weight a new set starts with. For bodyweight exercises (pull-ups,
// push-ups, dips...) that's your body weight, so those sets count toward
// volume, estimated 1RM and PRs like any other lift. Everything else starts
// empty. The value is stored on the set, so history keeps the weight you were
// at the time even after you update it.
export function startingWeight(exercise: string, bodyWeight: BodyWeight | null, unit: Unit): number {
  if (!bodyWeight || !isBodyweight(exercise)) return 0;
  return convertWeight(bodyWeight.value, bodyWeight.unit, unit);
}
