import { Template } from "../types/workout";

// Beginner starter templates, seeded once on first launch.
// Every exercise name matches an entry in assets/exercises.json exactly.
export const PREMADE_TEMPLATES: Template[] = [
  {
    id: "premade-push",
    name: "Push",
    exercises: [
      { name: "Barbell Bench Press" },
      { name: "Barbell Incline Bench Press" },
      { name: "Barbell Seated Overhead Press" },
      { name: "Dumbbell Lateral Raise" },
      { name: "Cable Pushdown" },
    ],
  },
  {
    id: "premade-pull",
    name: "Pull",
    exercises: [
      { name: "Barbell Deadlift" },
      { name: "Barbell Bent Over Row" },
      { name: "Cable Pulldown (Pro Lat Bar)" },
      { name: "Cable Seated Row" },
      { name: "Barbell Curl" },
    ],
  },
  {
    id: "premade-legs",
    name: "Legs",
    exercises: [
      { name: "Barbell Full Squat" },
      { name: "Sled 45° Leg Press" },
      { name: "Lever Seated Leg Curl" },
      { name: "Lever Leg Extension" },
      { name: "Lever Calf Press" },
    ],
  },
  {
    id: "premade-fullbody",
    name: "Full Body",
    exercises: [
      { name: "Barbell Full Squat" },
      { name: "Barbell Bench Press" },
      { name: "Barbell Bent Over Row" },
      { name: "Barbell Seated Overhead Press" },
      { name: "Barbell Curl" },
    ],
  },
  {
    id: "premade-upper",
    name: "Upper",
    exercises: [
      { name: "Barbell Bench Press" },
      { name: "Barbell Bent Over Row" },
      { name: "Barbell Seated Overhead Press" },
      { name: "Cable Pulldown (Pro Lat Bar)" },
      { name: "Barbell Curl" },
      { name: "Cable Pushdown" },
    ],
  },
  {
    id: "premade-lower",
    name: "Lower",
    exercises: [
      { name: "Barbell Full Squat" },
      { name: "Barbell Deadlift" },
      { name: "Sled 45° Leg Press" },
      { name: "Lever Seated Leg Curl" },
      { name: "Lever Calf Press" },
    ],
  },
];
