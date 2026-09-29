import { expect, Locator, Page, test } from "@playwright/test";

// One walk through the app the way it gets used: sign up, build a template,
// train from it, and come back to it. Along the way it checks the things that
// have broken on iPhone before: back arrows, the "?" sheets, templates
// keeping their numbers, and the screen staying on during a workout. Then a
// heavier second workout: its PR on the summary, in History and the calendar.

const onScreen = (l: Locator) => l.filter({ visible: true });
const text = (page: Page, t: string | RegExp) => onScreen(page.getByText(t, { exact: typeof t === "string" }));
const labelled = (page: Page, label: string) => onScreen(page.getByLabel(label, { exact: true }));

// Tabs you've left stay in the page underneath the one you're on, so a name
// can show up twice. Tap the first copy that's on top, as a finger would.
async function tapOnTop(l: Locator) {
  await expect(async () => {
    for (const match of await onScreen(l).all()) {
      await match.scrollIntoViewIfNeeded({ timeout: 1000 });
      const onTop = await match.evaluate((el) => {
        const r = el.getBoundingClientRect();
        const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
        return !!hit && (el.contains(hit) || hit.contains(el));
      });
      if (onTop) return match.click({ timeout: 2000 });
    }
    throw new Error("nothing matching is on top");
  }).toPass({ timeout: 20_000 });
}
const tap = (page: Page, t: string) => tapOnTop(text(page, t));

// Numbers are typed on the app's own number pad, never the phone's keyboard:
// tap the keys, the way a thumb does. `keys` like "62.5", or ">" for Next.
async function pressKeys(page: Page, keys: string) {
  const pad = onScreen(page.getByTestId("number-pad")).last();
  await expect(pad).toBeVisible();
  for (const key of keys) {
    const name = key === "." ? "Decimal point" : key === ">" ? /^(Next|Done)$/ : key;
    await pad.getByRole("button", { name, exact: true }).click();
  }
}

// Taps a number field, then types into it (replacing what's there).
async function enter(page: Page, label: string, keys: string) {
  await labelled(page, label).click();
  await pressKeys(page, keys);
}

// New accounts get asked their body weight on Home; answer if it's showing.
async function answerBodyWeight(page: Page) {
  await page.waitForTimeout(800);
  const dialog = page.getByRole("dialog").filter({ hasText: "What do you weigh?" });
  if (await dialog.isVisible()) {
    await pressKeys(page, "80"); // the pad opens with the question
    await dialog.getByText("Save", { exact: true }).click();
    await expect(dialog).toBeHidden();
  }
}

// A fresh account, past the first-run setup, on Home.
async function signUp(page: Page) {
  await page.goto("/");
  await tap(page, "Create account");
  await onScreen(page.getByPlaceholder("you@example.com")).fill(`e2e-${Date.now()}@gymit.test`);
  await onScreen(page.getByPlaceholder("Choose a password")).fill("testpass123");
  await tap(page, "Create account");
  await expect(page).toHaveURL(/onboarding/);
  while (/onboarding/.test(page.url())) {
    await tap(page, "Skip");
    await page.waitForTimeout(800);
  }
  await expect(labelled(page, "Settings")).toBeVisible();
  await answerBodyWeight(page);
}

// The back arrow has to be drawn, not a tinted image: iPhone Safari drops the
// tint and the arrow disappears into the header.
async function expectWorkingBackArrow(page: Page, returnsTo: RegExp) {
  const back = labelled(page, "Back");
  await expect(back).toBeVisible();
  await expect(back.locator("img")).toHaveCount(0);
  const stroke = await back.locator("svg").first().evaluate((el) => {
    const drawn = el.querySelector("path, polyline, line") ?? el;
    return getComputedStyle(drawn).stroke || el.getAttribute("stroke") || "";
  });
  expect(stroke).not.toMatch(/^(none|)$|rgb\(0, 0, 0\)|#000/);
  await back.click();
  await expect(page).toHaveURL(returnsTo);
}

// The workout sheet covers the screen, with its handle (tap it to tuck the
// workout away) at the top.
async function expectWorkoutOpen(page: Page) {
  await expect(labelled(page, "Minimize workout")).toBeVisible();
}

// Pulls the workout sheet down, by its handle unless told where, in big jumps,
// the way a quick thumb (or a mouse) does: the pointer gets ahead of the
// sheet, over its text, and the pull has to hold on regardless. Only a pull
// on the handle's strip moves it; from anywhere else, this checks it doesn't.
async function pullWorkoutDown(page: Page, from: Locator = labelled(page, "Minimize workout")) {
  const box = await from.boundingBox();
  if (!box) throw new Error("the workout sheet isn't open");
  const x = page.viewportSize()!.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y + 20);
  await page.mouse.move(x, y + 320, { steps: 2 });
  await page.mouse.up();
}

// Holds an exercise's name until the exercise lifts, then drags it `by` px
// (up is negative) and lets go.
async function holdAndDrag(page: Page, name: Locator, by: number) {
  // The list may have scrolled the name just out of sight (under the title
  // row), where it still counts as visible but a press lands on the title.
  await name.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  const box = await name.boundingBox();
  if (!box) throw new Error("the exercise isn't showing");
  const x = box.x + 20;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.waitForTimeout(700); // held long enough to lift it
  for (let moved = 0; Math.abs(moved) < Math.abs(by); moved += Math.sign(by) * 10) {
    await page.mouse.move(x, y + moved);
    await page.waitForTimeout(20);
  }
  await page.mouse.move(x, y + by);
  await page.mouse.up();
}

// Pulls the tucked-away workout's bar up, slowly: 5 px every 40 ms, well
// under a flick, so only the distance decides whether it opens.
async function pullBarUp(page: Page, by: number) {
  const box = await onScreen(page.getByLabel(/^Open workout/)).boundingBox();
  if (!box) throw new Error("the workout bar isn't showing");
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let moved = 5; moved <= by; moved += 5) {
    await page.mouse.move(x, y - moved);
    await page.waitForTimeout(40);
  }
  await page.mouse.up();
}

test("sign up, build a template, train from it, come back to it", async ({ page }) => {
  page.on("dialog", (d) => d.accept()); // "Finish workout?" and friends

  // Count screen wake-lock requests; WebKit here has no real screen to keep on.
  await page.addInitScript(() => {
    const w = window as unknown as { __wakeLocks: number };
    w.__wakeLocks = 0;
    Object.defineProperty(navigator, "wakeLock", {
      configurable: true,
      value: {
        request: async () => {
          w.__wakeLocks++;
          return { release: async () => undefined };
        },
      },
    });
  });

  await test.step("sign up and skip the setup", () => signUp(page));

  await test.step("back arrows are drawn and work", async () => {
    await labelled(page, "Settings").click();
    await expect(page).toHaveURL(/\/settings$/);
    await expectWorkingBackArrow(page, /\/$/);

    await tap(page, "Achievements");
    await expect(page).toHaveURL(/\/achievements$/);
    await expectWorkingBackArrow(page, /\/$/);
  });

  await test.step("build a template, finding exercises by search", async () => {
    await tap(page, "+ Create template");
    await expect(page).toHaveURL(/create-template/);
    await onScreen(page.getByPlaceholder("Template name")).fill("E2E Pull");
    for (const [query, name] of [
      ["pull up", "Pull-Up"],
      ["bent over row", "Barbell Bent Over Row"],
    ]) {
      await tap(page, "+ Add exercise");
      await onScreen(page.getByPlaceholder(/^Search/)).fill(query);
      // The exact name comes first, above the alphabet.
      await expect(text(page, "BEST MATCHES")).toBeVisible();
      await tap(page, name);
      await expect(page.getByRole("dialog").filter({ hasText: "BEST MATCHES" })).toBeHidden();
      await expect(labelled(page, `About ${name}`)).toBeVisible();
    }
    await tap(page, "Save template");
    await expect(labelled(page, "Settings")).toBeVisible();
  });

  await test.step("the template before any workout is blank", async () => {
    await answerBodyWeight(page);
    await tap(page, "E2E Pull");
    await expect(page).toHaveURL(/\/template\//);
    await expect(text(page, "BW×0")).toBeVisible();
    await expect(text(page, "0×0")).toBeVisible();
  });

  await test.step("the '?' opens the exercise's sheet", async () => {
    await labelled(page, "About Barbell Bent Over Row").click();
    const sheet = page.getByRole("dialog").filter({ hasText: /Muscles worked/i });
    await expect(sheet).toBeVisible();
    await expect(sheet.locator('img[src*="exercisedb"]')).toBeVisible();
    await expect(sheet.getByText("Add exercise", { exact: true })).toHaveCount(0);
    await sheet.getByLabel("Close").click();
    await expect(sheet).toBeHidden();
  });

  await test.step("a workout from it keeps the screen on and logs sets", async () => {
    await tap(page, "Start workout");
    await expectWorkoutOpen(page);
    await expect.poll(() => page.evaluate(() => (window as unknown as { __wakeLocks: number }).__wakeLocks)).toBeGreaterThan(0);

    await expect(labelled(page, "About Pull-Up")).toBeVisible();
    await enter(page, "Pull-Up set 1 weight", "80>8"); // Next goes from kg to reps
    await expect(labelled(page, "Pull-Up set 1 reps")).toHaveText("8");
    await enter(page, "Barbell Bent Over Row set 1 weight", "60>8");
    await expect(labelled(page, "Barbell Bent Over Row set 1 weight")).toHaveText("60");
    const markDone = onScreen(page.getByLabel("Mark set done", { exact: true }));
    await markDone.first().click();
    await markDone.first().click();
    await expect(onScreen(page.getByLabel("Mark set not done", { exact: true }))).toHaveCount(2);

    await tap(page, "Finish workout");
    await expect(text(page, "Workout complete!")).toBeVisible();
    await tap(page, "Done");
    await expect(labelled(page, "Settings")).toBeVisible();
  });

  await test.step("the template now shows those numbers, in view and edit", async () => {
    await answerBodyWeight(page);
    await tap(page, "E2E Pull");
    await expect(page).toHaveURL(/\/template\//);
    await expect(text(page, "BW×8")).toBeVisible();
    await expect(text(page, "60×8")).toBeVisible();

    await tap(page, "Edit");
    await expect(page).toHaveURL(/create-template/);
    await expect(labelled(page, "Barbell Bent Over Row set 1 weight")).toHaveText("60");
    await expect(labelled(page, "Barbell Bent Over Row set 1 reps")).toHaveText("8");
    await expectWorkingBackArrow(page, /\/template\//);
    await expectWorkingBackArrow(page, /\/$/);
  });

  await test.step("History shows each exercise's sets, and the workout opens", async () => {
    // One tab bar: finishing a workout goes back to Home rather than stacking a new one.
    await expect(page.getByRole("tab", { name: "History" })).toHaveCount(1);
    await page.getByRole("tab", { name: "History" }).click();
    await expect(page).toHaveURL(/\/history$/);
    await expect(text(page, "BW × 8")).toBeVisible();
    await expect(text(page, "60 kg × 8")).toBeVisible();
    await tap(page, "E2E Pull");
    await expect(page).toHaveURL(/\/workout-log\//);
    await expect(labelled(page, "About Pull-Up")).toBeVisible();
    await expectWorkingBackArrow(page, /\/history$/);
  });

  await test.step("a bigger total on the row is a PR, and 65 kg a first", async () => {
    await page.getByRole("tab", { name: "Home" }).click();
    await tap(page, "E2E Pull");
    await expect(page).toHaveURL(/\/template\//);
    await tap(page, "Start workout");
    await expectWorkoutOpen(page);
    // Last time's numbers are filled in: BW × 8 and 60 × 8. Go heavier on the row.
    await enter(page, "Barbell Bent Over Row set 1 weight", "65");
    const markDone = onScreen(page.getByLabel("Mark set done", { exact: true }));
    await markDone.first().click();
    await markDone.first().click();
    await expect(text(page, "PR")).toHaveCount(1); // the row, not the same-reps pull-ups
    await expect(text(page, "↑ 1st")).toBeVisible();

    await tap(page, "Finish workout");
    await expect(text(page, "New PR!")).toBeVisible();
    await expect(text(page, "520 kg (+40 kg)")).toBeVisible();
    await expect(text(page, /First time at 65 kg/)).toBeVisible();
    await tap(page, "Done");
    await expect(labelled(page, "Settings")).toBeVisible();
  });

  await test.step("History counts the PR", async () => {
    await page.getByRole("tab", { name: "History" }).click();
    await expect(page).toHaveURL(/\/history$/);
    await expect(text(page, "1 PR")).toBeVisible();
    await expect(text(page, /^2 workouts · 1 PR$/)).toBeVisible();
    await expect(text(page, /^65 kg × 8 · \+40 kg · ↑ first 65 kg$/)).toBeVisible();
  });

  await test.step("the calendar marks today and opens its workouts", async () => {
    await labelled(page, "Calendar").click();
    await expect(page).toHaveURL(/\/calendar$/);
    const today = onScreen(page.getByLabel(/: 2 workouts, PR$/));
    await expect(today).toHaveCount(1);
    await today.click();
    await expect(text(page, "Which workout?")).toBeVisible();
    await tap(page, "E2E Pull");
    await expect(page).toHaveURL(/\/workout-log\//);
    await expectWorkingBackArrow(page, /\/calendar$/);
    await expectWorkingBackArrow(page, /\/history$/);
  });

  await test.step("Progress keeps the exercises on a screen of their own", async () => {
    await page.getByRole("tab", { name: "Progress" }).click();
    await expect(page).toHaveURL(/\/progress$/);
    await expect(text(page, "2 exercises")).toBeVisible();
    await tap(page, "Exercises");
    await expect(page).toHaveURL(/\/exercises$/);
    await expect(text(page, "Pull-Up")).toBeVisible();
    await tap(page, "Barbell Bent Over Row");
    await expect(page).toHaveURL(/\/exercise-progress\//);
    await expectWorkingBackArrow(page, /\/exercises$/);
    await expectWorkingBackArrow(page, /\/progress$/);
  });
});

test("rest timer: type your own time, change it mid-rest, and ring without pausing music", async ({ page }) => {
  page.on("dialog", (d) => d.accept());

  // Count how sound gets played. On an iPhone, an <audio> element takes over
  // the phone's audio and pauses Spotify; Web Audio in an "ambient" audio
  // session plays over it. The test browser may lack the Audio Session API,
  // so stand one in.
  await page.addInitScript(() => {
    const w = window as unknown as { __sound: { webAudio: number; media: number } };
    w.__sound = { webAudio: 0, media: 0 };
    // WebKit on Windows has no Web Audio at all. Stand in the little the app
    // uses, so the test still checks it plays through Web Audio, not <audio>.
    if (typeof AudioContext === "undefined") {
      class Source {
        buffer: unknown = null;
        connect() {}
        start() {}
      }
      class Context {
        state = "suspended";
        destination = {};
        resume() {
          this.state = "running";
          return Promise.resolve();
        }
        suspend() {
          this.state = "suspended";
          return Promise.resolve();
        }
        decodeAudioData() {
          return Promise.resolve({ duration: 1 });
        }
        createBufferSource() {
          return new Source();
        }
      }
      Object.assign(window, { AudioContext: Context, AudioBufferSourceNode: Source });
    }
    const start = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (this: AudioBufferSourceNode, ...args: [number?, number?, number?]) {
      w.__sound.webAudio++;
      return start.apply(this, args);
    };
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function (this: HTMLMediaElement) {
      w.__sound.media++;
      return play.call(this);
    };
    Object.defineProperty(navigator, "audioSession", { configurable: true, value: { type: "auto" } });
  });
  const sound = () => page.evaluate(() => (window as unknown as { __sound: { webAudio: number; media: number } }).__sound);
  const audioSession = () => page.evaluate(() => (navigator as unknown as { audioSession: { type: string } }).audioSession.type);

  await test.step("sign up", () => signUp(page));

  await test.step("pick the rest timer's sound in Settings, and hear it", async () => {
    await labelled(page, "Settings").click();
    await expect(onScreen(page.getByRole("radio", { name: /Boxing bell/ }))).toHaveAttribute("aria-checked", "true");
    await tap(page, "Whistle");
    await expect(onScreen(page.getByRole("radio", { name: /Whistle/ }))).toHaveAttribute("aria-checked", "true");
    await expect.poll(async () => (await sound()).webAudio).toBe(1);
    expect(await audioSession()).toBe("ambient");
    await expectWorkingBackArrow(page, /\/$/);
  });

  await test.step("type your own rest; the last set has one too", async () => {
    await tap(page, "Start empty workout");
    await expectWorkoutOpen(page);
    await tap(page, "Add exercise");
    await onScreen(page.getByPlaceholder(/^Search/)).fill("pull up");
    await expect(text(page, "BEST MATCHES")).toBeVisible();
    await tap(page, "Pull-Up");
    // Three sets, and a rest after each, the last included.
    await expect(labelled(page, "Rest 2:00. Change rest time")).toHaveCount(3);

    await labelled(page, "Rest 2:00. Change rest time").last().click();
    await pressKeys(page, "1>45"); // it opens on the minutes; Next to the seconds
    await tap(page, "Set 1:45 rest");
    await expect(labelled(page, "Rest 1:45. Change rest time")).toHaveCount(3);
  });

  await test.step("change a running rest without ending it; it rings through Web Audio", async () => {
    await onScreen(page.getByLabel("Mark set done", { exact: true })).last().click();
    const running = onScreen(page.getByLabel(/^Resting /));
    await expect(running).toHaveCount(1);
    await running.getByLabel("Rest 1:45. Change rest time").click();
    // Shorter, but still ahead of the clock (a rest cut to less than you've
    // already rested is over at once, and doesn't ring).
    await pressKeys(page, "0>10");
    await tap(page, "Set 0:10 rest");
    await expect(running).toHaveCount(1); // still resting
    await expect(running.getByLabel("Rest 0:10. Change rest time")).toBeVisible();

    await expect(text(page, "Rest's up")).toBeVisible({ timeout: 20_000 });
    await expect.poll(async () => (await sound()).webAudio).toBe(2);
    expect((await sound()).media).toBe(0);
  });

  await test.step("pull the workout down mid-rest: Home behind it, and the rest still rings", async () => {
    await enter(page, "Pull-Up set 1 reps", "8");
    await onScreen(page.getByLabel("Mark set done", { exact: true })).first().click(); // another 0:10 rest
    await pullWorkoutDown(page);
    await expect(labelled(page, "Minimize workout")).toBeHidden();
    const bar = onScreen(page.getByLabel(/^Open workout/));
    await expect(bar).toBeVisible();
    await expect(bar.getByText(/^Rest \d:\d\d$/)).toBeVisible();
    await tapOnTop(onScreen(page.getByRole("tab", { name: "History" }))); // the app is usable behind it
    await expect(page).toHaveURL(/\/history$/);

    await expect(bar.getByText("Rest's up", { exact: true })).toBeVisible({ timeout: 20_000 });
    await expect.poll(async () => (await sound()).webAudio).toBe(3);
  });

  await test.step("pull the bar up to bring it back; a short pull drops back into the bar", async () => {
    const bar = onScreen(page.getByLabel(/^Open workout/));
    await pullBarUp(page, 30);
    await expect(labelled(page, "Minimize workout")).toBeHidden();
    await expect(bar).toBeVisible();

    await pullBarUp(page, 120);
    await expectWorkoutOpen(page);
    await expect(labelled(page, "Pull-Up set 1 reps")).toHaveText("8"); // as it was left
  });

  await test.step("tapping the handle tucks it away; only the handle's strip pulls it down", async () => {
    await labelled(page, "Minimize workout").click();
    await expect(labelled(page, "Minimize workout")).toBeHidden();
    await tapOnTop(onScreen(page.getByLabel(/^Open workout/)));
    await expectWorkoutOpen(page);

    // Pulling on the title row, or on the sets, leaves it where it is.
    const handle = labelled(page, "Minimize workout");
    await page.waitForTimeout(600); // done sliding up
    const before = await handle.boundingBox();
    await pullWorkoutDown(page, onScreen(page.getByText(/sets done$/)));
    await pullWorkoutDown(page, labelled(page, "Pull-Up set 2 reps"));
    await page.waitForTimeout(500);
    expect(await handle.boundingBox()).toEqual(before);

    await pullWorkoutDown(page);
    await expect(labelled(page, "Minimize workout")).toBeHidden();
    await expect(onScreen(page.getByLabel(/^Open workout/))).toBeVisible();
  });

  await test.step("hold an exercise's name and drag it to move the exercise", async () => {
    await tapOnTop(onScreen(page.getByLabel(/^Open workout/)));
    await expectWorkoutOpen(page);
    await tap(page, "Add exercise");
    await onScreen(page.getByPlaceholder(/^Search/)).fill("barbell curl");
    await tap(page, "Barbell Curl");
    const order = () => onScreen(page.getByLabel(/ options$/)).evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")));
    await expect.poll(order).toEqual(["Pull-Up options", "Barbell Curl options"]);

    await expect(onScreen(page.getByPlaceholder(/^Search/))).toHaveCount(0); // the picker's gone
    await holdAndDrag(page, onScreen(page.locator("#root").getByText("Barbell Curl", { exact: true })), -120);
    await expect.poll(order).toEqual(["Barbell Curl options", "Pull-Up options"]);
    await expect(text(page, "Drag an exercise to move it")).toHaveCount(0); // back to the sets
    await expect(labelled(page, "Pull-Up set 1 reps")).toHaveText("8"); // its sets went with it
  });

  await test.step("a rest that runs out while the phone's locked doesn't ring late after", async () => {
    // Time runs as normal until it's made to jump: the way an iPhone stops the
    // app while the phone's locked, and it catches up when it's back.
    await page.clock.install();
    const rung = (await sound()).webAudio;
    await onScreen(page.getByLabel("Mark set done", { exact: true })).first().click(); // Barbell Curl: a 2:00 rest
    const running = onScreen(page.getByLabel(/^Resting /));
    await expect(running).toHaveCount(1);
    await page.clock.fastForward("05:00");
    await expect(running.getByText("Rest's up", { exact: true })).toBeVisible();
    await page.waitForTimeout(1500); // long enough to have rung
    expect((await sound()).webAudio).toBe(rung);
  });
});
