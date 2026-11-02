import { Workout } from "../types/workout";
import { getAchievements } from "./achievements";
import { computeXP, levelInfo } from "./gamification";
import { countedSets, dayKey, prCount, startOfWeek, workoutRecords, workoutVolume } from "./stats";
import { computeStreak } from "./streak";

// The weekly recap on Home (components/WeeklyRecap.tsx): the first time the
// app's opened in a new week, a look back at the week before, Monday to Sunday.

export type WeekRecap = {
  week: string; // its Monday, "2026-10-19": which recap it is
  start: number; // Monday 00:00, local time
  end: number; // the Monday after
  workouts: number;
  goal: number; // the weekly goal
  volume: number; // weight lifted, in the workouts' unit (dumbbells counted twice)
  volumeBefore: number; // the same for the week before, to compare with
  sets: number; // working sets ticked off
  seconds: number; // time trained
  prs: number;
  xp: number; // XP gained
  levelBefore: number;
  levelAfter: number;
  streak: number; // weeks in a row at the goal, as the week ended
  achievements: string[]; // unlocked that week
};

// Monday 00:00 of the week before the one `now` is in. From calendar parts,
// so daylight saving can't shift it.
export function lastWeekStart(now: number): number {
  const monday = new Date(startOfWeek(now));
  return new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() - 7).getTime();
}

const nextWeek = (start: number) => {
  const d = new Date(start);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7).getTime();
};

// Which recap is due, if any: the last full week, unless its recap was seen
// already (`seen`: the Monday of the last one). After weeks away it's still
// only the last week, never the ones before it. A new account's last week
// has no workouts, so there's nothing to show (weekRecap).
export function recapDue(seen: string | undefined, now: number): { week: string; start: number } | null {
  const start = lastWeekStart(now);
  const week = dayKey(new Date(start));
  return seen !== undefined && seen >= week ? null : { week, start };
}

// One line per finished week you trained, newest first, for the list of past
// recaps (app/weekly-recaps.tsx): the headline numbers, which match that
// week's full recap (weekRecap). Quick enough for a whole history, since XP
// is added up once per week rather than from scratch for each one. The week
// in progress isn't in it: its recap comes when it's over.
export type WeekSummary = {
  week: string; // its Monday, "2026-10-19"
  start: number; // Monday 00:00, local time
  workouts: number;
  goalHit: boolean;
  volume: number; // weight lifted, in the workouts' unit
  xp: number; // XP gained
  prs: number;
  levelUp: boolean;
};

export function pastWeeks(workouts: Workout[], weeklyGoal: number, now: number): WeekSummary[] {
  const time = (w: Workout) => new Date(w.date).getTime();
  const thisWeek = startOfWeek(now);
  const byWeek = new Map<number, Workout[]>();
  workouts.forEach((w) => {
    const start = startOfWeek(time(w));
    if (start < thisWeek) byWeek.set(start, [...(byWeek.get(start) ?? []), w]);
  });
  const records = workoutRecords(workouts);
  const weeks: WeekSummary[] = [];
  // Every workout before a week is in an earlier week of the list, so the XP
  // after one week is the XP before the next.
  let xpBefore = 0;
  [...byWeek.keys()]
    .sort((a, b) => a - b)
    .forEach((start) => {
      const inWeek = byWeek.get(start)!;
      const end = nextWeek(start);
      const xpAfter = computeXP(
        workouts.filter((w) => time(w) < end),
        weeklyGoal
      );
      weeks.push({
        week: dayKey(new Date(start)),
        start,
        workouts: inWeek.length,
        goalHit: inWeek.length >= weeklyGoal,
        volume: inWeek.reduce((n, w) => n + workoutVolume(w), 0),
        xp: xpAfter - xpBefore,
        prs: inWeek.reduce((n, w) => n + prCount(records.get(w.id)), 0),
        levelUp: levelInfo(xpAfter).level > levelInfo(xpBefore).level,
      });
      xpBefore = xpAfter;
    });
  return weeks.reverse();
}

// The week starting at `start`, from the workouts (in one unit and matched to
// their templates: getWorkoutsForStats). Null for a week with no workouts:
// nothing to look back on.
export function weekRecap(workouts: Workout[], weeklyGoal: number, start: number): WeekRecap | null {
  const end = nextWeek(start);
  const time = (w: Workout) => new Date(w.date).getTime();
  const inWeek = workouts.filter((w) => time(w) >= start && time(w) < end);
  if (inWeek.length === 0) return null;

  const weekBefore = new Date(start);
  const beforeStart = new Date(weekBefore.getFullYear(), weekBefore.getMonth(), weekBefore.getDate() - 7).getTime();
  const volumeOf = (list: Workout[]) => list.reduce((n, w) => n + workoutVolume(w), 0);

  // Everything up to the week, and up to its end: what it added.
  const before = workouts.filter((w) => time(w) < start);
  const until = workouts.filter((w) => time(w) < end);
  const xpBefore = computeXP(before, weeklyGoal);
  const xpAfter = computeXP(until, weeklyGoal);
  const unlockedBefore = new Set(getAchievements(before, weeklyGoal).filter((a) => a.unlocked).map((a) => a.id));
  const records = workoutRecords(workouts);

  return {
    week: dayKey(new Date(start)),
    start,
    end,
    workouts: inWeek.length,
    goal: weeklyGoal,
    volume: volumeOf(inWeek),
    volumeBefore: volumeOf(before.filter((w) => time(w) >= beforeStart)),
    sets: inWeek.reduce((n, w) => n + w.exercises.reduce((m, ex) => m + countedSets(ex.sets).length, 0), 0),
    seconds: inWeek.reduce((n, w) => n + w.durationSeconds, 0),
    prs: inWeek.reduce((n, w) => n + prCount(records.get(w.id)), 0),
    xp: xpAfter - xpBefore,
    levelBefore: levelInfo(xpBefore).level,
    levelAfter: levelInfo(xpAfter).level,
    streak: computeStreak(until, weeklyGoal, end - 1).weeks,
    achievements: getAchievements(until, weeklyGoal)
      .filter((a) => a.unlocked && !unlockedBefore.has(a.id))
      .map((a) => a.title),
  };
}
