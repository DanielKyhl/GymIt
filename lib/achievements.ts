import { Workout } from "../types/workout";
import { countPRs, weeklyGoalBonusXP, XP_WEEKLY_GOAL_BONUS } from "./gamification";

export type Achievement = {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
};

// Everything an achievement might check, computed once from the history.
function buildContext(workouts: Workout[], weeklyGoal: number) {
  let totalVolume = 0; // sum of weight * reps across every logged set
  let totalReps = 0;
  let totalMinutes = 0;
  const exerciseNames = new Set<string>();
  let earliestHour = 24;
  let latestHour = -1;

  workouts.forEach((w) => {
    totalMinutes += w.durationSeconds / 60;
    const hour = new Date(w.date).getHours();
    if (hour < earliestHour) earliestHour = hour;
    if (hour > latestHour) latestHour = hour;
    w.exercises.forEach((ex) => {
      const working = ex.sets.filter((s) => s.type !== "warmup");
      if (working.length > 0) exerciseNames.add(ex.name);
      working.forEach((s) => {
        totalVolume += s.weight * s.reps;
        totalReps += s.reps;
      });
    });
  });

  // Longest gap between two consecutive workouts, in days.
  const times = workouts.map((w) => new Date(w.date).getTime()).sort((a, b) => a - b);
  let longestGapDays = 0;
  for (let i = 1; i < times.length; i++) {
    const gap = (times[i] - times[i - 1]) / (1000 * 60 * 60 * 24);
    if (gap > longestGapDays) longestGapDays = gap;
  }

  const goalWeeks = weeklyGoalBonusXP(workouts, weeklyGoal) / XP_WEEKLY_GOAL_BONUS;

  return {
    count: workouts.length,
    prs: countPRs(workouts),
    totalVolume,
    totalReps,
    totalHours: totalMinutes / 60,
    distinctExercises: exerciseNames.size,
    earliestHour,
    latestHour,
    longestGapDays,
    goalWeeks,
  };
}

export function getAchievements(workouts: Workout[], weeklyGoal: number): Achievement[] {
  const c = buildContext(workouts, weeklyGoal);

  return [
    // Getting started
    { id: "first-workout", title: "First Steps", description: "Complete your first workout", unlocked: c.count >= 1 },
    { id: "workouts-10", title: "Getting Into It", description: "Complete 10 workouts", unlocked: c.count >= 10 },
    { id: "workouts-25", title: "Making It A Habit", description: "Complete 25 workouts", unlocked: c.count >= 25 },
    { id: "workouts-50", title: "Gym Regular", description: "Complete 50 workouts", unlocked: c.count >= 50 },
    { id: "workouts-100", title: "Centurion", description: "Complete 100 workouts", unlocked: c.count >= 100 },

    // Your own progress (relative — inclusive)
    { id: "first-pr", title: "New Heights", description: "Set your first personal record", unlocked: c.prs >= 1 },
    { id: "pr-10", title: "Record Breaker", description: "Set 10 personal records", unlocked: c.prs >= 10 },
    { id: "pr-25", title: "Ever Upward", description: "Set 25 personal records", unlocked: c.prs >= 25 },

    // Total volume (everyone accumulates, whatever the weights)
    { id: "volume-1k", title: "Moved a Ton", description: "Lift 1,000 total volume", unlocked: c.totalVolume >= 1000 },
    { id: "volume-10k", title: "Heavy Hauler", description: "Lift 10,000 total volume", unlocked: c.totalVolume >= 10000 },
    { id: "volume-100k", title: "Mountain Mover", description: "Lift 100,000 total volume", unlocked: c.totalVolume >= 100000 },

    // Reps
    { id: "reps-1000", title: "Rep Machine", description: "Log 1,000 total reps", unlocked: c.totalReps >= 1000 },

    // Consistency
    { id: "goal-hit", title: "On Target", description: "Hit your weekly goal", unlocked: c.goalWeeks >= 1 },
    { id: "goal-4", title: "In The Groove", description: "Hit your weekly goal 4 weeks", unlocked: c.goalWeeks >= 4 },

    // Time of day
    { id: "early-bird", title: "Early Bird", description: "Finish a workout before 8am", unlocked: c.earliestHour < 8 },
    { id: "night-owl", title: "Night Owl", description: "Finish a workout after 9pm", unlocked: c.latestHour >= 21 },

    // Variety
    { id: "explorer", title: "Explorer", description: "Train 15 different exercises", unlocked: c.distinctExercises >= 15 },
    { id: "variety", title: "Jack Of All Trades", description: "Train 30 different exercises", unlocked: c.distinctExercises >= 30 },

    // Time invested
    { id: "time-10h", title: "Time Under Tension", description: "Spend 10 hours training", unlocked: c.totalHours >= 10 },

    // Fun
    { id: "comeback", title: "The Comeback", description: "Return after 14+ days off", unlocked: c.longestGapDays >= 14 },
  ];
}
