import { Workout } from "../types/workout";
import { estimate1RM } from "./stats";

export const XP_PER_WORKOUT = 50;
export const XP_PER_SET = 5;
export const XP_PER_PR = 25;
export const XP_WEEKLY_GOAL_BONUS = 100;
export const DEFAULT_WEEKLY_GOAL = 3;

// Identify a week by the date of its Monday, e.g. "2026-08-17".
function weekKey(iso: string): string {
  const d = new Date(iso);
  const dayFromMonday = (d.getDay() + 6) % 7; // Sun=6 ... Mon=0
  const monday = new Date(d);
  monday.setDate(d.getDate() - dayFromMonday);
  return monday.toISOString().slice(0, 10);
}

// The single best estimated 1RM logged for an exercise in one workout.
function sessionBest1RM(sets: { weight: number; reps: number; type?: string }[]): number {
  let best = 0;
  sets
    .filter((s) => s.type !== "warmup")
    .forEach((s) => {
      const oneRM = estimate1RM(s.weight, s.reps);
      if (oneRM > best) best = oneRM;
    });
  return best;
}

// How many personal records were set across the whole history (an exercise
// beating its own previous best est. 1RM). The first time an exercise appears
// establishes a baseline and does not count.
export function countPRs(workouts: Workout[]): number {
  const best: Record<string, number> = {};
  let prs = 0;
  [...workouts].reverse().forEach((w) => {
    w.exercises.forEach((ex) => {
      const now = sessionBest1RM(ex.sets);
      if (now <= 0) return;
      const prev = best[ex.name] ?? 0;
      if (now > prev) {
        if (prev > 0) prs += 1;
        best[ex.name] = now;
      }
    });
  });
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

export const MAX_LEVEL = 100;

// Turn a total XP number into a level plus progress toward the next one.
// Level N -> N+1 costs N * 100 XP (each level a little harder than the last).
// Level is capped at MAX_LEVEL; there, xpForNext is 0 (you're maxed out).
export function levelInfo(totalXP: number): {
  level: number;
  xpIntoLevel: number;
  xpForNext: number;
  isMax: boolean;
} {
  let level = 1;
  let need = 100;
  let remaining = totalXP;
  while (level < MAX_LEVEL && remaining >= need) {
    remaining -= need;
    level += 1;
    need = level * 100;
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
