import { Workout } from "../types/workout";
import { countPRs, weeklyGoalBonusXP, XP_WEEKLY_GOAL_BONUS } from "./gamification";
import { lifetimeKg } from "./milestones";
import { estimate1RM, workoutVolume } from "./stats";
import { convertWeight } from "./units";

export type Achievement = {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
};

const DAY_MS = 24 * 60 * 60 * 1000;

// Local calendar day, "2026-09-21".
function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// The Monday that starts a date's week, at local midnight.
function weekStart(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7)).getTime();
}

// Most weeks in a row where the weekly goal was hit.
function longestGoalStreak(workouts: Workout[], weeklyGoal: number): number {
  const counts = new Map<number, number>();
  workouts.forEach((w) => {
    const k = weekStart(new Date(w.date));
    counts.set(k, (counts.get(k) ?? 0) + 1);
  });
  const hit = [...counts.entries()].filter(([, n]) => n >= weeklyGoal).map(([k]) => k).sort((a, b) => a - b);
  let best = 0;
  let run = 0;
  hit.forEach((k, i) => {
    // Rounding absorbs the 23- and 25-hour days around daylight saving.
    run = i > 0 && Math.round((k - hit[i - 1]) / DAY_MS) === 7 ? run + 1 : 1;
    best = Math.max(best, run);
  });
  return best;
}

// Everything an achievement might check, computed once from the history.
function buildContext(workouts: Workout[], weeklyGoal: number) {
  let totalVolume = 0; // sum of weight * reps across every logged set
  let totalReps = 0;
  let totalMinutes = 0;
  const exerciseNames = new Set<string>();
  let earliestHour = 24;
  let latestHour = -1;
  let biggestSessionKg = 0;
  let mostSetsInSession = 0;
  let longestSessionMin = 0;
  let mostRepsInSet = 0;
  let best1RMKg = 0;
  let ratedSets = 0;
  let maxRPE = 0;
  let supersets = false;
  const days = new Map<string, number>();

  workouts.forEach((w) => {
    const minutes = w.durationSeconds / 60;
    totalMinutes += minutes;
    longestSessionMin = Math.max(longestSessionMin, minutes);
    const date = new Date(w.date);
    const hour = date.getHours();
    if (hour < earliestHour) earliestHour = hour;
    if (hour > latestHour) latestHour = hour;
    days.set(dayKey(date), (days.get(dayKey(date)) ?? 0) + 1);
    biggestSessionKg = Math.max(biggestSessionKg, convertWeight(workoutVolume(w), w.unit, "kg"));

    let sessionSets = 0;
    w.exercises.forEach((ex) => {
      if (ex.supersetId) supersets = true;
      const working = ex.sets.filter((s) => s.type !== "warmup");
      if (working.length > 0) exerciseNames.add(ex.name);
      working.forEach((s) => {
        totalVolume += s.weight * s.reps;
        totalReps += s.reps;
        mostRepsInSet = Math.max(mostRepsInSet, s.reps);
        best1RMKg = Math.max(best1RMKg, convertWeight(estimate1RM(s.weight, s.reps), w.unit, "kg"));
        if (s.done) sessionSets += 1;
        if (s.done && (s.rpe ?? 0) > 0) {
          ratedSets += 1;
          maxRPE = Math.max(maxRPE, s.rpe ?? 0);
        }
      });
    });
    mostSetsInSession = Math.max(mostSetsInSession, sessionSets);
  });

  // Longest gap between two consecutive workouts, in days.
  const times = workouts.map((w) => new Date(w.date).getTime()).sort((a, b) => a - b);
  let longestGapDays = 0;
  for (let i = 1; i < times.length; i++) {
    const gap = (times[i] - times[i - 1]) / DAY_MS;
    if (gap > longestGapDays) longestGapDays = gap;
  }

  // Saturday and the Sunday straight after it.
  const weekendWarrior = [...days.keys()].some((k) => {
    const [y, m, d] = k.split("-").map(Number);
    const day = new Date(y, m - 1, d);
    return day.getDay() === 6 && days.has(dayKey(new Date(y, m - 1, d + 1)));
  });

  const goalWeeks = weeklyGoalBonusXP(workouts, weeklyGoal) / XP_WEEKLY_GOAL_BONUS;

  return {
    count: workouts.length,
    prs: countPRs(workouts),
    totalVolume,
    lifetimeKg: lifetimeKg(workouts),
    totalReps,
    totalHours: totalMinutes / 60,
    distinctExercises: exerciseNames.size,
    earliestHour,
    latestHour,
    longestGapDays,
    goalWeeks,
    goalStreak: longestGoalStreak(workouts, weeklyGoal),
    biggestSessionKg,
    mostSetsInSession,
    longestSessionMin,
    mostRepsInSet,
    best1RMKg,
    ratedSets,
    maxRPE,
    supersets,
    doubleDay: [...days.values()].some((n) => n >= 2),
    weekendWarrior,
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
    { id: "workouts-200", title: "Double Centurion", description: "Complete 200 workouts", unlocked: c.count >= 200 },
    { id: "workouts-365", title: "A Year Of Iron", description: "Complete 365 workouts", unlocked: c.count >= 365 },

    // Your own progress (relative — inclusive)
    { id: "first-pr", title: "New Heights", description: "Set your first personal record", unlocked: c.prs >= 1 },
    { id: "pr-10", title: "Record Breaker", description: "Set 10 personal records", unlocked: c.prs >= 10 },
    { id: "pr-25", title: "Ever Upward", description: "Set 25 personal records", unlocked: c.prs >= 25 },
    { id: "pr-50", title: "Unstoppable", description: "Set 50 personal records", unlocked: c.prs >= 50 },
    { id: "pr-100", title: "Record Collector", description: "Set 100 personal records", unlocked: c.prs >= 100 },

    // Strength
    { id: "triple-digits", title: "Triple Digits", description: "Reach an estimated 1RM of 100 kg (220 lb) on any lift", unlocked: c.best1RMKg >= 100 },

    // Total volume (everyone accumulates, whatever the weights)
    { id: "volume-1k", title: "Moved a Ton", description: "Lift 1,000 total volume", unlocked: c.totalVolume >= 1000 },
    { id: "volume-10k", title: "Heavy Hauler", description: "Lift 10,000 total volume", unlocked: c.totalVolume >= 10000 },
    { id: "volume-100k", title: "Mountain Mover", description: "Lift 100,000 total volume", unlocked: c.totalVolume >= 100000 },

    // Lifetime total against the landmarks on Progress
    { id: "landmark-bus", title: "Bus Pass", description: "Lift more than a double-decker bus in total", unlocked: c.lifetimeKg >= 12_500 },
    { id: "landmark-liberty", title: "Lady Liberty", description: "Lift more than the Statue of Liberty in total", unlocked: c.lifetimeKg >= 204_000 },
    { id: "landmark-iss", title: "Orbital", description: "Lift more than the International Space Station in total", unlocked: c.lifetimeKg >= 420_000 },
    { id: "landmark-saturn", title: "Lift-Off", description: "Lift more than a Saturn V rocket in total", unlocked: c.lifetimeKg >= 2_800_000 },
    { id: "landmark-eiffel", title: "Tour de Force", description: "Lift more than the Eiffel Tower in total", unlocked: c.lifetimeKg >= 10_100_000 },

    // Big sessions
    { id: "session-elephant", title: "Elephant In The Room", description: "Lift an elephant's weight (6,000 kg) in one workout", unlocked: c.biggestSessionKg >= 6000 },
    { id: "session-whale", title: "Whale Of A Time", description: "Lift a humpback whale's weight (30,000 kg) in one workout", unlocked: c.biggestSessionKg >= 30000 },
    { id: "sets-30", title: "Volume Junkie", description: "Finish 30 working sets in one workout", unlocked: c.mostSetsInSession >= 30 },
    { id: "long-session", title: "Marathon Session", description: "Train for 90 minutes in one go", unlocked: c.longestSessionMin >= 90 },

    // Reps
    { id: "reps-1000", title: "Rep Machine", description: "Log 1,000 total reps", unlocked: c.totalReps >= 1000 },
    { id: "reps-5000", title: "Rep Factory", description: "Log 5,000 total reps", unlocked: c.totalReps >= 5000 },
    { id: "reps-10000", title: "Ten Thousand", description: "Log 10,000 total reps", unlocked: c.totalReps >= 10000 },
    { id: "high-rep", title: "Twenty Club", description: "Do 20 or more reps in a single set", unlocked: c.mostRepsInSet >= 20 },

    // Consistency
    { id: "goal-hit", title: "On Target", description: "Hit your weekly goal", unlocked: c.goalWeeks >= 1 },
    { id: "goal-4", title: "In The Groove", description: "Hit your weekly goal 4 weeks", unlocked: c.goalWeeks >= 4 },
    { id: "goal-12", title: "Quarter Strong", description: "Hit your weekly goal 12 weeks", unlocked: c.goalWeeks >= 12 },
    { id: "goal-26", title: "Half-Year Hero", description: "Hit your weekly goal 26 weeks", unlocked: c.goalWeeks >= 26 },
    { id: "goal-52", title: "Year Round", description: "Hit your weekly goal 52 weeks", unlocked: c.goalWeeks >= 52 },
    { id: "streak-8", title: "Unbroken", description: "Hit your weekly goal 8 weeks in a row", unlocked: c.goalStreak >= 8 },

    // Time of day, and when you train
    { id: "early-bird", title: "Early Bird", description: "Finish a workout before 8am", unlocked: c.earliestHour < 8 },
    { id: "dawn-patrol", title: "Dawn Patrol", description: "Finish a workout before 6am", unlocked: c.earliestHour < 6 },
    { id: "night-owl", title: "Night Owl", description: "Finish a workout after 9pm", unlocked: c.latestHour >= 21 },
    { id: "weekend-warrior", title: "Weekend Warrior", description: "Train on both Saturday and Sunday of a weekend", unlocked: c.weekendWarrior },
    { id: "double-day", title: "Double Session", description: "Do two workouts in one day", unlocked: c.doubleDay },

    // Variety
    { id: "explorer", title: "Explorer", description: "Train 15 different exercises", unlocked: c.distinctExercises >= 15 },
    { id: "variety", title: "Jack Of All Trades", description: "Train 30 different exercises", unlocked: c.distinctExercises >= 30 },
    { id: "encyclopedia", title: "Encyclopedia", description: "Train 50 different exercises", unlocked: c.distinctExercises >= 50 },
    { id: "superset", title: "Double Up", description: "Do a superset", unlocked: c.supersets },

    // Time invested
    { id: "time-10h", title: "Time Under Tension", description: "Spend 10 hours training", unlocked: c.totalHours >= 10 },
    { id: "time-50h", title: "Dedicated", description: "Spend 50 hours training", unlocked: c.totalHours >= 50 },
    { id: "time-100h", title: "Hundred Hours", description: "Spend 100 hours training", unlocked: c.totalHours >= 100 },

    // Effort
    { id: "rpe-100", title: "Self Aware", description: "Rate 100 sets with RPE", unlocked: c.ratedSets >= 100 },
    { id: "rpe-10", title: "All Out", description: "Rate a set RPE 10", unlocked: c.maxRPE >= 10 },

    // Fun
    { id: "comeback", title: "The Comeback", description: "Return after 14+ days off", unlocked: c.longestGapDays >= 14 },
  ];
}
