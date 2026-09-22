// The first-run questions and what the answers set up. Pure, so the rules are
// easy to test; app/onboarding.tsx is the screen that asks them.

export type Goal = "muscle" | "strength" | "fitness";
export type Experience = "new" | "some" | "experienced";

export const GOALS: { id: Goal; title: string; detail: string }[] = [
  { id: "muscle", title: "Build muscle", detail: "Moderate weights for 8–12 reps, plenty of sets." },
  { id: "strength", title: "Get stronger", detail: "Heavier weights, fewer reps, longer rests." },
  { id: "fitness", title: "Get fit and healthy", detail: "A bit of everything, with shorter rests." },
];

export const EXPERIENCE: { id: Experience; title: string; detail: string }[] = [
  { id: "new", title: "New to lifting", detail: "Under 6 months, or starting over." },
  { id: "some", title: "Some experience", detail: "6 months to 2 years of fairly regular training." },
  { id: "experienced", title: "Experienced", detail: "Over 2 years, comfortable with the main lifts." },
];

export const WEEKLY_OPTIONS = [1, 2, 3, 4, 5, 6, 7];

// Rest between sets that suits the goal: heavy strength work needs the longest.
export function restForGoal(goal: Goal): number {
  return goal === "strength" ? 180 : goal === "muscle" ? 90 : 60;
}

// A weekly goal that's realistic to keep up at each level.
export function suggestedWeeklyGoal(experience: Experience): number {
  return experience === "experienced" ? 4 : 3;
}

export type StarterPlan = {
  templateId: string; // the first workout
  rotation: string[]; // every template in the split, in the order to do them
  split: string;
  why: string;
};

// Which example split to start with, from how often they'll train: full body
// for up to 3 days, upper/lower for 4 (and for beginners training more),
// push/pull/legs for 5 or more. Each trains every muscle about twice a week.
export function starterPlan(experience: Experience, weeklyGoal: number): StarterPlan {
  if (weeklyGoal <= 3) {
    return {
      templateId: "premade-fullbody",
      rotation: ["premade-fullbody"],
      split: "Full body",
      why: `Training everything each session works every muscle ${["once", "twice", "three times"][weeklyGoal - 1] ?? "once"} a week, and it's the quickest way to learn the main lifts.`,
    };
  }
  if (weeklyGoal === 4 || experience === "new") {
    return {
      templateId: "premade-upper",
      rotation: ["premade-upper", "premade-lower"],
      split: "Upper / lower",
      why: "Alternate upper-body and lower-body days, so each muscle gets trained twice a week with rest in between.",
    };
  }
  return {
    templateId: "premade-push",
    rotation: ["premade-push", "premade-pull", "premade-legs"],
    split: "Push / pull / legs",
    why: "Rotate push, pull and leg days. With 5 or more sessions a week each muscle gets two hard sessions and time to recover.",
  };
}

// Only brand-new accounts get the setup flow. Anyone who has logged a
// workout or answered the old body-weight question is already set up.
export function needsOnboarding(
  settings: { onboarded?: boolean; bodyWeightAsked?: boolean },
  workoutCount: number
): boolean {
  return !settings.onboarded && !settings.bodyWeightAsked && workoutCount === 0;
}
