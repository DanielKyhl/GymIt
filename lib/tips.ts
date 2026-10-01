// The welcome tips (components/Tips.tsx): a new account sees each set once,
// on the real screens, the first time it gets there. Home's when it first
// opens after setup, the workout's when the first workout has a set to point at.

export type TipTour = "home" | "workout";

// Every set, for a new account to see (lib/storage.ts, set at setup).
export const TIP_TOURS: TipTour[] = ["home", "workout"];

// `target`: what the tip points at, registered by the screen that shows it.
export type Tip = { target: string; title: string; body: string };

export const TIPS: Record<TipTour, Tip[]> = {
  home: [
    {
      target: "home.upNext",
      title: "Your next workout",
      body: "GymIt picks the next one from your plan. Tap Start workout when you're at the gym.",
    },
    {
      target: "home.tabs",
      title: "History, progress and recovery",
      body: "Every workout you finish, your PRs and sets per muscle, and which muscles are ready again. All down here.",
    },
    {
      target: "home.settings",
      title: "Settings",
      body: "The rest timer's sound, kg or lb, your weekly goal and your body weight.",
    },
  ],
  workout: [
    {
      target: "workout.set",
      title: "Logging a set",
      body: "Tap a number to type it on GymIt's number pad. Tick the circle when the set's done, and the rest timer starts by itself.",
    },
    {
      target: "workout.handle",
      title: "Look around mid-workout",
      body: "Pull this handle down and the workout waits above the tabs, with its clock and rest timer still running. Pull it back up to carry on.",
    },
    {
      target: "workout.name",
      title: "Change the order",
      body: "Hold an exercise's name, then drag it up or down.",
    },
  ],
};

// What's still to show once a set is finished, or all of them skipped.
export function tipsAfter(pending: TipTour[], done: TipTour | "all"): TipTour[] {
  return done === "all" ? [] : pending.filter((t) => t !== done);
}

export type Rect = { x: number; y: number; width: number; height: number };

// Where a tip goes for what it points at: below it if it fits, otherwise above,
// and where along the tip its arrow sits (under the middle of the target, but
// clear of the tip's rounded corners).
export function placeTip(
  target: Rect,
  screen: { width: number; height: number },
  tip: { height: number; side: number; gap: number; corner: number }
): { below: boolean; top: number; arrowX: number } {
  const below = target.y + target.height + tip.gap + tip.height <= screen.height - tip.side;
  const top = below ? target.y + target.height + tip.gap : Math.max(tip.side, target.y - tip.gap - tip.height);
  const width = screen.width - 2 * tip.side;
  const middle = target.x + target.width / 2 - tip.side;
  const arrowX = Math.min(Math.max(middle, tip.corner), width - tip.corner);
  return { below, top, arrowX };
}
