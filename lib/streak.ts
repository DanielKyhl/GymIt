import { Workout } from "../types/workout";
import { computeXP, levelInfo } from "./gamification";

// Weekly-goal streak with shields. A shield is earned every 10 levels (up to
// 3 held); when a week misses the goal, one is used automatically and the
// streak carries on. Everything is replayed from the history, so it's the
// same on every device and needs nothing extra saved.

export const LEVELS_PER_SHIELD = 10;
export const MAX_SHIELDS = 3;

export type StreakState = {
  weeks: number; // weeks in a row at the weekly goal (this week counts once it's hit)
  shields: number; // ready to use, 0-3
  shieldUsedLastWeek: boolean; // last week was missed, and a shield kept the streak going
};

// Local midnight on the Monday that starts a date's week.
function weekStart(t: number): number {
  const d = new Date(t);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7)).getTime();
}

// Built from calendar parts, so daylight saving can't skip or repeat a week.
function addWeeks(ws: number, n: number): number {
  const d = new Date(ws);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7 * n).getTime();
}

// The level reached from the workouts done before a moment.
const levelFromHistory = (workouts: Workout[], weeklyGoal: number) => (until: number) =>
  levelInfo(computeXP(workouts.filter((w) => new Date(w.date).getTime() < until), weeklyGoal)).level;

export function computeStreak(
  workouts: Workout[],
  weeklyGoal: number,
  now: number = Date.now(),
  levelAt: (until: number) => number = levelFromHistory(workouts, weeklyGoal)
): StreakState {
  const counts = new Map<number, number>();
  workouts.forEach((w) => {
    const k = weekStart(new Date(w.date).getTime());
    counts.set(k, (counts.get(k) ?? 0) + 1);
  });
  if (counts.size === 0) return { weeks: 0, shields: 0, shieldUsedLastWeek: false };

  const current = weekStart(now);
  let streak = 0;
  let held = 0;
  let earned = 0;
  let lastShieldWeek: number | null = null;

  for (let ws = Math.min(...counts.keys()); ws <= current; ws = addWeeks(ws, 1)) {
    // Shields earned by the end of this week; any beyond 3 held are lost.
    const total = Math.floor(levelAt(Math.min(addWeeks(ws, 1), now)) / LEVELS_PER_SHIELD);
    if (total > earned) {
      held = Math.min(MAX_SHIELDS, held + total - earned);
      earned = total;
    }
    const hit = (counts.get(ws) ?? 0) >= weeklyGoal;
    if (ws === current) {
      // Still in progress: counts once hit, and can't break the streak yet.
      if (hit) streak += 1;
      break;
    }
    if (hit) {
      streak += 1;
    } else if (streak > 0 && held > 0) {
      held -= 1;
      lastShieldWeek = ws;
    } else {
      streak = 0;
    }
  }

  return { weeks: streak, shields: held, shieldUsedLastWeek: lastShieldWeek === addWeeks(current, -1) };
}
