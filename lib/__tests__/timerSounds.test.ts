import { DEFAULT_TIMER_SOUND, TIMER_SOUNDS, timerSoundOrDefault } from "../timerSounds";

// Node's own modules, declared here rather than pulling @types/node into the
// whole project (see serviceWorker.test.ts).
declare const require: (id: string) => any;
declare const __dirname: string;
const fs = require("fs") as { existsSync: (p: string) => boolean };
const path = require("path") as { join: (...parts: string[]) => string };

describe("timer sounds", () => {
  test("a saved choice is kept", () => {
    expect(timerSoundOrDefault("whistle")).toBe("whistle");
    expect(timerSoundOrDefault("gong")).toBe("gong");
  });

  test("nothing saved, or a sound this version doesn't have, gets the default", () => {
    expect(timerSoundOrDefault(undefined)).toBe(DEFAULT_TIMER_SOUND);
    expect(timerSoundOrDefault("air-horn")).toBe(DEFAULT_TIMER_SOUND);
  });

  test("every sound's file exists, named after it (as scripts/make-sounds.cjs writes them)", () => {
    TIMER_SOUNDS.forEach((s) => {
      expect(fs.existsSync(path.join(__dirname, "..", "..", "assets", "sounds", `${s.id}.wav`))).toBe(true);
    });
  });
});
