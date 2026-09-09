import { Slug } from "react-native-body-highlighter";
import { Exercise } from "../types/workout";

// free-exercise-db records the muscles that *move* a weight, not the ones
// holding you rigid while you lift it. That's why a deadlift lists no core at
// all. These rules add the stabilising work back in as secondary involvement,
// so bracing shows up on the recovery model but clears faster than a set of
// direct ab work would.

type Rule = { match: RegExp; add: Slug[] };

const RULES: Rule[] = [
  // Axially loaded lifts: the spine is the thing being braced.
  { match: /deadlift|good\s*morning|rack pull/i, add: ["abs"] },
  { match: /squat/i, add: ["abs"] },
  { match: /clean|snatch|jerk|thruster/i, add: ["abs"] },

  // Standing presses — no bench to brace against.
  { match: /(overhead|military|shoulder|push)\s*press/i, add: ["abs"] },
  { match: /handstand|overhead (carry|hold|walk)/i, add: ["abs"] },

  // Unilateral lower body: resisting rotation and lateral tilt.
  { match: /lunge|step[-\s]?up|split squat|bulgarian|pistol/i, add: ["abs", "obliques"] },

  // Loaded carries and drags.
  { match: /farmer|carry|yoke|sled|prowler|drag|waiter walk/i, add: ["abs"] },

  // Bent-over pulling: the torso is held horizontal against the load.
  { match: /bent[-\s]?over|pendlay|t[-\s]?bar row|barbell row/i, add: ["abs"] },

  // Rotation and anti-lateral-flexion work the obliques directly.
  {
    match: /twist|wood\s*chop|chop|oblique|side bend|windmill|landmine|russian|side plank|suitcase|turkish/i,
    add: ["abs", "obliques"],
  },

  // Anything single-arm resists rotation across the trunk.
  { match: /one[-\s]?arm|single[-\s]?arm|one[-\s]?legged|single[-\s]?leg/i, add: ["obliques"] },
];

// Catches braced compounds the name patterns miss (odd names, strongman lifts).
function bracesStructurally(exercise: Exercise): boolean {
  const all = [...exercise.primaryMuscles, ...exercise.secondaryMuscles];
  return exercise.mechanic === "compound" && all.includes("lower back");
}

// Extra muscle slugs an exercise trains that the source data leaves out.
export function stabiliserMuscles(exercise: Exercise): Slug[] {
  const found = new Set<Slug>();

  RULES.forEach((rule) => {
    if (rule.match.test(exercise.name)) rule.add.forEach((s) => found.add(s));
  });

  if (bracesStructurally(exercise)) found.add("abs");

  return [...found];
}
