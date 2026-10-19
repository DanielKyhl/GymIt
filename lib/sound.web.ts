import { Asset } from "expo-asset";
import { audioStuck, TIMER_SOUNDS, TimerSoundId } from "./timerSounds";

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
let prepared: TimerSoundId | null = null; // the sound the open workout rings
let listening = false;
let sleepTimer: ReturnType<typeof setTimeout> | undefined;
// The audio got stuck (see ring), so the next tap starts it afresh.
let stuck = false;
let rebuiltAt = 0;

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
// after the tap that started it can still ring. An iPhone also stops the
// audio when the app goes off screen; coming back on screen, it's woken
// again straight away, where the phone allows it without a tap.
function wake() {
  const ctx = audio();
  if (ctx && ctx.state !== "running") ctx.resume().catch(() => undefined);
}

// Audio that got stuck is replaced with new audio, started by the tap (which
// only a tap can do). Not more than once every few seconds.
function rebuild() {
  if (Date.now() - rebuiltAt < 5000) return;
  rebuiltAt = Date.now();
  stuck = false;
  const old = context;
  context = null;
  buffers.clear(); // loaded again for the new audio
  old?.close?.().catch(() => undefined);
  wake();
  if (prepared) load(prepared);
}

function onTap() {
  if (!wanted) return;
  if (stuck) rebuild();
  else wake();
}

function listenForTaps() {
  if (listening) return;
  listening = true;
  for (const type of ["touchend", "click", "keydown"]) {
    document.addEventListener(type, onTap, { capture: true, passive: true });
  }
  document.addEventListener("visibilitychange", () => {
    if (wanted && document.visibilityState === "visible") wake();
  });
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
  prepared = id;
  listenForTaps();
  load(id);
  return () => {
    wanted = false;
    prepared = null;
    sleepSoon();
  };
}

export function playSound(id: TimerSoundId): void {
  const ctx = audio();
  if (!ctx) return;
  // Off screen it can't be heard, and would only come out once you're back.
  if (document.visibilityState === "hidden") return;
  const asked = Date.now();
  const running = ctx.state === "running" ? Promise.resolve() : ctx.resume();
  Promise.all([running, load(id)])
    .then(([, buffer]) => {
      // If the audio couldn't start in time (no tap since the app opened),
      // skip the sound rather than play it late.
      if (!buffer || ctx.state !== "running" || Date.now() - asked > 1500) return;
      ring(ctx, buffer, true);
    })
    .catch(() => undefined);
}

// Plays a sound, and makes sure it really did. iOS can leave a home-screen
// app's audio stuck after it's been off screen: it says it's running, but its
// clock stands still and nothing comes out until iOS restarts it, typically
// when you leave the app and come back, and then the sound comes out late. So
// a second after it starts, the clock has to have moved (audioStuck). If it
// hasn't, the sound is cut so it can't come out late, and the audio is
// restarted and the sound tried once more; if that doesn't take either, your
// next tap starts the audio afresh (rebuild).
function ring(ctx: AudioContext, buffer: AudioBuffer, again: boolean) {
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  const from = { audio: ctx.currentTime, wall: Date.now() };
  source.start();
  sleepSoon();
  if (typeof from.audio !== "number") return; // a test's stand-in, with no clock
  setTimeout(() => {
    if (!audioStuck(ctx.currentTime - from.audio, (Date.now() - from.wall) / 1000)) {
      stuck = false;
      return;
    }
    try {
      source.stop();
      source.disconnect();
    } catch {
      // Already over: nothing to cut.
    }
    stuck = true;
    if (!again || document.visibilityState === "hidden") return;
    ctx
      .suspend()
      .then(() => ctx.resume())
      .then(() => {
        if (ctx === context && ctx.state === "running" && Date.now() - from.wall < 3000) ring(ctx, buffer, false);
      })
      .catch(() => undefined);
  }, 1000);
}
