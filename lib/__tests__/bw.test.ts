import { computeXP, countPRs } from "../gamification";
import { estimate1RM, getTrainedExercises, workoutVolume } from "../stats";
import { set, workout } from "./fixtures";

test("bodyweight behaviour today", () => {
  // Pull-ups: 3 sets of 8, weight left at 0
  const w = workout("Pull", "2026-09-07T08:00:00.000Z", [
    { name: "Pullups", sets: [set(0, 8), set(0, 8), set(0, 8)] },
  ]);
  const better = workout("Pull", "2026-09-09T16:00:00.000Z", [
    { name: "Pullups", sets: [set(0, 12), set(0, 12), set(0, 12)] },
  ]);

  console.log([
    `volume:            ${workoutVolume(w)}`,
    `1RM(0,8):          ${estimate1RM(0, 8)}`,
    `XP (3 sets):       ${computeXP([w], 3)}`,
    `PRs 8 -> 12 reps:  ${countPRs([better, w])}`,
    `progress row:      ${JSON.stringify(getTrainedExercises([w])[0])}`,
  ].join("\n"));
});
