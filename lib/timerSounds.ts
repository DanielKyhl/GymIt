// The sounds the rest timer can make when a rest is up, picked in Settings.
// The files are made by scripts/make-sounds.cjs; lib/sound.ts plays them.

export type TimerSoundId = "boxing-bell" | "gym-bell" | "gong" | "whistle";

export type TimerSound = { id: TimerSoundId; name: string; detail: string; file: number };

export const TIMER_SOUNDS: TimerSound[] = [
  {
    id: "boxing-bell",
    name: "Boxing bell",
    detail: "Ding-ding-ding, like the end of a round",
    file: require("../assets/sounds/boxing-bell.wav"),
  },
  { id: "gym-bell", name: "Gym bell", detail: "One clear strike that rings on", file: require("../assets/sounds/gym-bell.wav") },
  { id: "gong", name: "Gong", detail: "One deep hit", file: require("../assets/sounds/gong.wav") },
  { id: "whistle", name: "Whistle", detail: "Two short blasts, like a coach", file: require("../assets/sounds/whistle.wav") },
];

export const DEFAULT_TIMER_SOUND: TimerSoundId = "boxing-bell";

// A saved choice, or the default if there isn't one (or it's a sound this
// version of the app doesn't have).
export function timerSoundOrDefault(id: unknown): TimerSoundId {
  return TIMER_SOUNDS.find((s) => s.id === id)?.id ?? DEFAULT_TIMER_SOUND;
}
