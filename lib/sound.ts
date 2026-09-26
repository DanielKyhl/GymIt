import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from "expo-audio";
import { TIMER_SOUNDS, TimerSoundId } from "./timerSounds";

// Plays the rest timer's sounds in the native app. They mix with other apps'
// audio, so a rest ending doesn't pause your music, and they play with the
// phone on silent. The browser version is lib/sound.web.ts.

const players = new Map<TimerSoundId, AudioPlayer>();
let modeSet = false;

function player(id: TimerSoundId): AudioPlayer | null {
  if (!modeSet) {
    modeSet = true;
    setAudioModeAsync({ interruptionMode: "mixWithOthers", playsInSilentMode: true }).catch(() => undefined);
  }
  let p = players.get(id);
  if (!p) {
    const file = TIMER_SOUNDS.find((s) => s.id === id)?.file;
    if (file === undefined) return null;
    p = createAudioPlayer(file);
    players.set(id, p);
  }
  return p;
}

// Loads a sound so it's ready to play the moment a rest ends.
export function prepareSound(id: TimerSoundId): () => void {
  player(id);
  return () => undefined;
}

export function playSound(id: TimerSoundId): void {
  try {
    const p = player(id);
    if (!p) return;
    p.seekTo(0);
    p.play();
  } catch {
    // Sound is a nice-to-have; the vibration and colour change still happen.
  }
}
