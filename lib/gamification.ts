import { Workout } from "../types/workout";
import { prCount, workoutRecords } from "./stats";

export const XP_PER_WORKOUT = 50;
export const XP_PER_SET = 5;
export const XP_PER_PR = 25;
export const XP_WEEKLY_GOAL_BONUS = 100;
export const DEFAULT_WEEKLY_GOAL = 3;

// Identify a week by the date of its Monday, e.g. "2026-08-17".
// All local time — mixing local getters with toISOString() (UTC) would put a
// late-night workout in the previous week.
function weekKey(iso: string): string {
  const d = new Date(iso);
  const dayFromMonday = (d.getDay() + 6) % 7; // Sun=6 ... Mon=0
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - dayFromMonday);
  const month = String(monday.getMonth() + 1).padStart(2, "0");
  const day = String(monday.getDate()).padStart(2, "0");
  return `${monday.getFullYear()}-${month}-${day}`;
}

// How many PRs were set across the whole history: exercises beating their
// best total (see workoutRecords). Milestones don't count.
export function countPRs(workouts: Workout[]): number {
  let prs = 0;
  workoutRecords(workouts).forEach((records) => (prs += prCount(records)));
  return prs;
}

// Bonus XP for every completed week where the workout count met the goal.
export function weeklyGoalBonusXP(workouts: Workout[], weeklyGoal: number): number {
  const counts: Record<string, number> = {};
  workouts.forEach((w) => {
    const k = weekKey(w.date);
    counts[k] = (counts[k] ?? 0) + 1;
  });
  let bonus = 0;
  Object.values(counts).forEach((c) => {
    if (c >= weeklyGoal) bonus += XP_WEEKLY_GOAL_BONUS;
  });
  return bonus;
}

// Total XP derived from the whole workout history.
export function computeXP(workouts: Workout[], weeklyGoal: number): number {
  let xp = 0;
  workouts.forEach((w) => {
    xp += XP_PER_WORKOUT;
    w.exercises.forEach((ex) => {
      ex.sets.forEach((s) => {
        if (s.done && s.type !== "warmup") xp += XP_PER_SET;
      });
    });
  });
  xp += countPRs(workouts) * XP_PER_PR;
  xp += weeklyGoalBonusXP(workouts, weeklyGoal);
  return xp;
}

export const MAX_LEVEL = 150;

// XP to go from level N to N+1: 100 for the first, 11 more for each level
// after, up to 1,728 for the last. Level 150 takes 136,186 XP in total: about
// 3 years at 5 workouts a week (weekly-goal bonus and records included).
export const xpToNextLevel = (level: number) => 89 + 11 * level;

// Turn a total XP number into a level plus progress toward the next one.
// Level is capped at MAX_LEVEL; there, xpForNext is 0 (you're maxed out).
export function levelInfo(totalXP: number): {
  level: number;
  xpIntoLevel: number;
  xpForNext: number;
  isMax: boolean;
} {
  let level = 1;
  let need = xpToNextLevel(1);
  let remaining = totalXP;
  while (level < MAX_LEVEL && remaining >= need) {
    remaining -= need;
    level += 1;
    need = xpToNextLevel(level);
  }
  if (level >= MAX_LEVEL) {
    return { level: MAX_LEVEL, xpIntoLevel: 0, xpForNext: 0, isMax: true };
  }
  return { level, xpIntoLevel: remaining, xpForNext: need, isMax: false };
}

// Workouts logged in the current calendar week.
export function thisWeekCount(workouts: Workout[]): number {
  const nowKey = weekKey(new Date().toISOString());
  return workouts.filter((w) => weekKey(w.date) === nowKey).length;
}
