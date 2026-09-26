// Makes the rest timer's sounds, assets/sounds/*.wav. They're synthesised here
// rather than recorded, so there's no licence to worry about, and any of them
// can be retuned by changing a number and running this again:
//
//   node scripts/make-sounds.cjs
//
// The list the app offers is in lib/timerSounds.ts.

const fs = require("fs");
const path = require("path");

const RATE = 22050; // plenty: the brightest partial of any sound here is under 6 kHz
const OUT = path.join(__dirname, "..", "assets", "sounds");

// Seeded, so running this again only changes the files if the recipe changed.
function randomFrom(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Bells. A bell is a handful of partials at ratios that aren't whole numbers,
// each dying away at its own rate: the high ones in a flash (the "ding"), the
// low ones ringing on. These are Jean-Claude Risset's, from his 1969 catalogue
// of computer-made sounds: [ratio to the pitch, extra Hz, level, share of the
// ring]. The pairs a few Hz apart beat against each other, which is the
// shimmer of a real bell.
const PARTIALS = [
  [0.56, 0, 1, 1],
  [0.56, 1, 0.67, 0.9],
  [0.92, 0, 1, 0.65],
  [0.92, 1.7, 1.8, 0.55],
  [1.19, 0, 2.67, 0.325],
  [1.7, 0, 1.67, 0.35],
  [2, 0, 1.46, 0.25],
  [2.74, 0, 1.33, 0.2],
  [3, 0, 1.33, 0.15],
  [3.76, 0, 1, 0.1],
  [4.07, 0, 1.33, 0.075],
];

// One strike, starting `at` seconds in. `ring`: seconds until the lowest
// partial has died away (60 dB down). `hammer`: how much of the metal-on-metal
// click to add. `attack`: a soft mallet takes a few ms to bring the bell in.
function strike(out, at, { pitch, ring, level = 1, hammer = 0, attack = 0.001 }, rand) {
  const start = Math.round(at * RATE);
  for (const [ratio, extra, amp, share] of PARTIALS) {
    const freq = pitch * ratio + extra;
    const length = share * ring;
    const tau = length / Math.log(1000);
    const a = amp * level * (0.9 + 0.2 * rand());
    const phase = rand() * 2 * Math.PI;
    const n = Math.min(out.length - start, Math.ceil(length * RATE));
    for (let i = 0; i < n; i++) {
      const t = i / RATE;
      out[start + i] += a * Math.min(1, t / attack) * Math.exp(-t / tau) * Math.sin(2 * Math.PI * freq * t + phase);
    }
  }
  // The hammer: a few ms of bright noise (white noise, differenced).
  let last = 0;
  const n = Math.min(out.length - start, Math.round(0.03 * RATE));
  for (let i = 0; hammer > 0 && i < n; i++) {
    const noise = rand() * 2 - 1;
    out[start + i] += hammer * level * (noise - last) * Math.exp(-i / RATE / 0.004);
    last = noise;
  }
}

// ---------------------------------------------------------------------------
// A pea whistle: one tone, warbled by the pea rattling round the chamber, over
// a little breath noise at the same pitch.
function blast(out, at, length, { pitch, trill = 34 }, rand) {
  const start = Math.round(at * RATE);
  const n = Math.min(out.length - start, Math.round(length * RATE));
  // Breath: white noise through a narrow band-pass at the whistle's pitch
  // (RBJ cookbook biquad).
  const w = (2 * Math.PI * pitch) / RATE;
  const alpha = Math.sin(w) / (2 * 6);
  const [b0, b2, a0, a1, a2] = [alpha, -alpha, 1 + alpha, -2 * Math.cos(w), 1 - alpha];
  let [x1, x2, y1, y2] = [0, 0, 0, 0];
  let phase = rand() * 2 * Math.PI;
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    const env = Math.min(1, t / 0.012) * Math.min(1, (length - t) / 0.03);
    const pea = Math.sin(2 * Math.PI * trill * t);
    // Starts a touch flat and rises into the note as the breath builds.
    const freq = pitch * (1 + 0.03 * pea) * (1 - 0.05 * Math.exp(-t / 0.025));
    phase += (2 * Math.PI * freq) / RATE;
    const tone = (Math.sin(phase) + 0.1 * Math.sin(2 * phase)) * (0.8 + 0.2 * pea);
    const x0 = rand() * 2 - 1;
    const y0 = (b0 * x0 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    [x2, x1, y2, y1] = [x1, x0, y1, y0];
    out[start + i] += env * (tone + 0.9 * y0);
  }
}

// ---------------------------------------------------------------------------
// The sounds. Keep the ids in step with lib/timerSounds.ts.
const SOUNDS = {
  // The end of a round: three quick strikes on a bright bell.
  "boxing-bell": (rand) => {
    const out = new Float32Array(Math.round(2.6 * RATE));
    const bell = { pitch: 1250, ring: 2.2, hammer: 2.2 };
    [0, 0.23, 0.46].forEach((at, i) => strike(out, at, { ...bell, level: [1, 0.85, 0.95][i] }, rand));
    return out;
  },
  // One strike on a lower, warmer bell that rings on.
  "gym-bell": (rand) => {
    const out = new Float32Array(Math.round(2.8 * RATE));
    strike(out, 0, { pitch: 780, ring: 2.8, hammer: 1 }, rand);
    return out;
  },
  // A big bell hit with a soft mallet: deep, with a gentler start.
  gong: (rand) => {
    const out = new Float32Array(Math.round(3.6 * RATE));
    strike(out, 0, { pitch: 330, ring: 4.5, attack: 0.012 }, rand);
    return out;
  },
  // Two short blasts.
  whistle: (rand) => {
    const out = new Float32Array(Math.round(0.75 * RATE));
    blast(out, 0, 0.2, { pitch: 2650 }, rand);
    blast(out, 0.3, 0.38, { pitch: 2650 }, rand);
    return out;
  },
};

// ---------------------------------------------------------------------------
// Levels. Every sound is set to the same loudness, measured the way streaming
// services measure music (ITU-R BS.1770, the LUFS Spotify evens tracks out
// to) but over its loudest 100 ms, about how long the ear takes to judge a
// short sound. So switching sounds doesn't make the timer louder or quieter,
// and it's pitched to be heard over a song. A bell's strike peaks far above
// the rest of it, so a limiter turns those few milliseconds down to make room.

const TARGET_LUFS = -10; // louder than Spotify's normal -14, so it cuts through
const CEILING = 0.94;

// BS.1770's "K" weighting, at this sample rate (the two filters' analogue
// prototypes, as libebur128 derives them): a gentle lift above ~1.5 kHz,
// where the ear is most sensitive, and a cut below ~40 Hz.
function kWeighted(x) {
  const biquad = (input, [b0, b1, b2], [a1, a2]) => {
    const out = new Float64Array(input.length);
    let [x1, x2, y1, y2] = [0, 0, 0, 0];
    for (let i = 0; i < input.length; i++) {
      const y = b0 * input[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
      [x2, x1, y2, y1] = [x1, input[i], y1, y];
      out[i] = y;
    }
    return out;
  };
  let K = Math.tan((Math.PI * 1681.974450955533) / RATE);
  let Q = 0.7071752369554196;
  const Vh = 10 ** (3.999843853973347 / 20);
  const Vb = Vh ** 0.4996667741545416;
  let a0 = 1 + K / Q + K * K;
  const shelf = biquad(
    x,
    [(Vh + (Vb * K) / Q + K * K) / a0, (2 * (K * K - Vh)) / a0, (Vh - (Vb * K) / Q + K * K) / a0],
    [(2 * (K * K - 1)) / a0, (1 - K / Q + K * K) / a0]
  );
  K = Math.tan((Math.PI * 38.13547087602444) / RATE);
  Q = 0.5003270373238773;
  a0 = 1 + K / Q + K * K;
  return biquad(shelf, [1, -2, 1], [(2 * (K * K - 1)) / a0, (1 - K / Q + K * K) / a0]);
}

// BS.1770 loudness over 100 ms windows (the standard's shortest is 400 ms,
// which averages a bell's strike in with its fading ring), at its loudest.
function loudness(x) {
  const k = kWeighted(x);
  const win = Math.round(0.1 * RATE);
  let best = 0;
  for (let start = 0; start < k.length; start += Math.round(0.01 * RATE)) {
    let sum = 0;
    for (let i = start; i < Math.min(k.length, start + win); i++) sum += k[i] * k[i];
    best = Math.max(best, sum / win);
  }
  return -0.691 + 10 * Math.log10(best);
}

const peak = (x) => x.reduce((m, v) => Math.max(m, Math.abs(v)), 0);

// A look-ahead limiter: the level starts coming down a few ms before a peak
// that would go over the ceiling, and eases back up over ~60 ms. Unlike
// clipping, it doesn't bend the waveform, so the bell still sounds like a bell.
// (Each sample's gain is an average over gains that all saw the peak coming,
// so none can let it through.)
function limit(input, ceiling) {
  const look = Math.round(0.004 * RATE);
  const recover = 1 - Math.exp(-1 / (0.06 * RATE));
  // Silence in front, so a peak right at the start is seen coming too.
  const x = new Float32Array(input.length + look);
  x.set(input, look);
  const need = x.map((v) => Math.min(1, ceiling / Math.max(Math.abs(v), 1e-9)));
  const env = new Float32Array(x.length);
  let e = 1;
  for (let i = 0; i < x.length; i++) {
    let lowest = 1;
    for (let j = i; j < Math.min(x.length, i + look); j++) lowest = Math.min(lowest, need[j]);
    e = Math.min(lowest, e + (1 - e) * recover);
    env[i] = e;
  }
  let sum = 0;
  const out = x.map((v, i) => {
    sum += env[i] - (i >= look ? env[i - look] : 1);
    return v * ((sum + look) / look);
  });
  return out.slice(look);
}

// Ends the file once the sound has died away (50 dB down), with a short fade.
function trim(x) {
  const floor = peak(x) * 10 ** (-50 / 20);
  let end = x.length;
  while (end > 0 && Math.abs(x[end - 1]) < floor) end--;
  end = Math.min(x.length, end + Math.round(0.02 * RATE));
  const fade = Math.round(0.05 * RATE);
  const y = x.slice(0, end);
  for (let i = 0; i < Math.min(fade, end); i++) y[end - 1 - i] *= i / fade;
  return y;
}

function wav(samples) {
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((v, i) => data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v)) * 32767), i * 2));
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16); // PCM header size
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 2, 28); // bytes per second
  header.writeUInt16LE(2, 32); // bytes per frame
  header.writeUInt16LE(16, 34); // bits
  header.write("data", 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

Object.entries(SOUNDS).forEach(([name, make], i) => {
  const raw = make(randomFrom(1000 + i));
  // Limiting takes a little loudness off, so settle the gain in a few passes.
  let gain = 10 ** ((TARGET_LUFS - loudness(raw)) / 20);
  let out = limit(raw.map((v) => v * gain), CEILING);
  for (let pass = 0; pass < 3; pass++) {
    gain *= 10 ** ((TARGET_LUFS - loudness(out)) / 20);
    out = limit(raw.map((v) => v * gain), CEILING);
  }
  out = trim(out);
  fs.writeFileSync(path.join(OUT, `${name}.wav`), wav(out));
  console.log(
    `${name}.wav  ${(out.length / RATE).toFixed(2)} s  loudness ${loudness(out).toFixed(1)} LUFS  ` +
      `peak ${(20 * Math.log10(peak(out))).toFixed(1)} dBFS  (limited ${(20 * Math.log10((peak(raw) * gain) / peak(out))).toFixed(1)} dB)`
  );
});
