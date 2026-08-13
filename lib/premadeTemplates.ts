import { Template } from "../types/workout";

// Beginner starter templates, seeded once on first launch.
// Every exercise name matches an entry in assets/exercises.json exactly.
export const PREMADE_TEMPLATES: Template[] = [
  {
    id: "premade-push",
    name: "Push",
    exercises: [
      { name: "Barbell Bench Press - Medium Grip" },
      { name: "Barbell Incline Bench Press - Medium Grip" },
      { name: "Barbell Shoulder Press" },
      { name: "Side Lateral Raise" },
      { name: "Triceps Pushdown" },
    ],
  },
  {
    id: "premade-pull",
    name: "Pull",
    exercises: [
      { name: "Barbell Deadlift" },
      { name: "Bent Over Barbell Row" },
      { name: "Wide-Grip Lat Pulldown" },
      { name: "Seated Cable Rows" },
      { name: "Barbell Curl" },
    ],
  },
  {
    id: "premade-legs",
    name: "Legs",
    exercises: [
      { name: "Barbell Squat" },
      { name: "Leg Press" },
      { name: "Seated Leg Curl" },
      { name: "Leg Extensions" },
      { name: "Calf Press" },
    ],
  },
  {
    id: "premade-fullbody",
    name: "Full Body",
    exercises: [
      { name: "Barbell Squat" },
      { name: "Barbell Bench Press - Medium Grip" },
      { name: "Bent Over Barbell Row" },
      { name: "Barbell Shoulder Press" },
      { name: "Barbell Curl" },
    ],
  },
  {
    id: "premade-upper",
    name: "Upper",
    exercises: [
      { name: "Barbell Bench Press - Medium Grip" },
      { name: "Bent Over Barbell Row" },
      { name: "Barbell Shoulder Press" },
      { name: "Wide-Grip Lat Pulldown" },
      { name: "Barbell Curl" },
      { name: "Triceps Pushdown" },
    ],
  },
  {
    id: "premade-lower",
    name: "Lower",
    exercises: [
      { name: "Barbell Squat" },
      { name: "Barbell Deadlift" },
      { name: "Leg Press" },
      { name: "Seated Leg Curl" },
      { name: "Calf Press" },
    ],
  },
];
