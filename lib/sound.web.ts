import { Asset } from "expo-asset";
import { TIMER_SOUNDS, TimerSoundId } from "./timerSounds";

// Plays the rest timer's sounds in the browser (the home-screen app), through
// the Web Audio API rather than an <audio> element. That's what keeps your
// music playing: on an iPhone, a page playing an <audio> element takes over
// the phone's sound the way a music app does, which pauses Spotify, while a
// page that only uses Web Audio gets iOS's "ambient" kind of sound, which
// plays on top of whatever's on. The catch is iOS's rule for ambient sound:
// the silent switch mutes it. (The native app, lib/sound.ts, has neither
// problem.)

type AudioSession = { type: string };

let context: AudioContext | null = null;
const buffers = new Map<TimerSoundId, Promise<AudioBuffer | null>>();
let wanted = false; // a workout is open, so taps should keep the audio awake
let listening = false;
let sleepTimer: ReturnType<typeof setTimeout> | undefined;

function audio(): AudioContext | null {
  if (context) return context;
  if (typeof window === "undefined" || !window.AudioContext) return null;
  // Safari can be told outright (where it supports the Audio Session API).
  const session = (navigator as Navigator & { audioSession?: AudioSession }).audioSession;
  if (session) session.type = "ambient";
  context = new AudioContext();
  return context;
}

// A browser only lets a page start its audio from a tap. So while a workout
// is open, every tap makes sure it's running, and a rest that ends minutes
// after the tap that started it can still ring.
function wake() {
  const ctx = audio();
  if (ctx && ctx.state !== "running") ctx.resume().catch(() => undefined);
}

function listenForTaps() {
  if (listening) return;
  listening = true;
  for (const type of ["touchend", "click", "keydown"]) {
    document.addEventListener(type, () => wanted && wake(), { capture: true, passive: true });
  }
}

// Lets the audio stop running once nothing needs it, after any sound has
// had time to finish.
function sleepSoon() {
  clearTimeout(sleepTimer);
  sleepTimer = setTimeout(() => {
    if (!wanted && context?.state === "running") context.suspend().catch(() => undefined);
  }, 5000);
}

function load(id: TimerSoundId): Promise<AudioBuffer | null> {
  const ctx = audio();
  const file = TIMER_SOUNDS.find((s) => s.id === id)?.file;
  if (!ctx || file === undefined) return Promise.resolve(null);
  let buffer = buffers.get(id);
  if (!buffer) {
    buffer = fetch(Asset.fromModule(file).uri)
      .then((res) => res.arrayBuffer())
      .then((data) => ctx.decodeAudioData(data))
      .catch(() => {
        buffers.delete(id); // try again next time, e.g. once back online
        return null;
      });
    buffers.set(id, buffer);
  }
  return buffer;
}

// Loads a sound so it's ready to play the moment a rest ends, and keeps the
// audio awake until the returned function is called.
export function prepareSound(id: TimerSoundId): () => void {
  if (typeof document === "undefined") return () => undefined;
  wanted = true;
  listenForTaps();
  load(id);
  return () => {
    wanted = false;
    sleepSoon();
  };
}

export function playSound(id: TimerSoundId): void {
  const ctx = audio();
  if (!ctx) return;
  const asked = Date.now();
  const running = ctx.state === "running" ? Promise.resolve() : ctx.resume();
  Promise.all([running, load(id)])
    .then(([, buffer]) => {
      // If the audio couldn't start in time (no tap since the app opened),
      // skip the sound rather than play it late.
      if (!buffer || ctx.state !== "running" || Date.now() - asked > 1500) return;
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start();
      sleepSoon();
    })
    .catch(() => undefined);
}
