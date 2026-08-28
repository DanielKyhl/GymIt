import { Workout } from "../types/workout";
import { getAchievements } from "./achievements";
import { computeXP, countPRs, levelInfo } from "./gamification";
import { workoutVolume } from "./stats";

export type WorkoutSummary = {
  xpGained: number;
  levelAfter: number;
  leveledUp: boolean;
  newPRs: number;
  newAchievements: string[];
  volume: number;
};

// Compare stats before vs after this workout to see what the user just earned.
export function summarizeWorkout(
  pastWorkouts: Workout[],
  newWorkout: Workout,
  weeklyGoal: number
): WorkoutSummary {
  const after = [newWorkout, ...pastWorkouts];

  const xpBefore = computeXP(pastWorkouts, weeklyGoal);
  const xpAfter = computeXP(after, weeklyGoal);
  const levelBefore = levelInfo(xpBefore).level;
  const levelAfter = levelInfo(xpAfter).level;

  const beforeUnlocked = new Set(
    getAchievements(pastWorkouts, weeklyGoal)
      .filter((a) => a.unlocked)
      .map((a) => a.id)
  );
  const newAchievements = getAchievements(after, weeklyGoal)
    .filter((a) => a.unlocked && !beforeUnlocked.has(a.id))
    .map((a) => a.title);

  return {
    xpGained: xpAfter - xpBefore,
    levelAfter,
    leveledUp: levelAfter > levelBefore,
    newPRs: countPRs(after) - countPRs(pastWorkouts),
    newAchievements,
    volume: workoutVolume(newWorkout),
  };
}
