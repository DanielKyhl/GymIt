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

// New accounts get asked their body weight on Home; answer if it's showing.
async function answerBodyWeight(page: Page) {
  await page.waitForTimeout(800);
  const dialog = page.getByRole("dialog").filter({ hasText: "What do you weigh?" });
  if (await dialog.isVisible()) {
    await dialog.locator("input").fill("80");
    await dialog.getByText("Save", { exact: true }).click();
    await expect(dialog).toBeHidden();
  }
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

  await test.step("sign up and skip the setup", async () => {
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
  });

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
    await expect(page).toHaveURL(/\/workout\//);
    await expect.poll(() => page.evaluate(() => (window as unknown as { __wakeLocks: number }).__wakeLocks)).toBeGreaterThan(0);

    await expect(labelled(page, "About Pull-Up")).toBeVisible();
    await labelled(page, "Pull-Up set 1 weight").fill("80");
    await labelled(page, "Pull-Up set 1 reps").fill("8");
    await labelled(page, "Barbell Bent Over Row set 1 weight").fill("60");
    await labelled(page, "Barbell Bent Over Row set 1 reps").fill("8");
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
    const values = await onScreen(page.locator("input")).evaluateAll((els) => els.map((e) => (e as HTMLInputElement).value));
    expect(values).toEqual(expect.arrayContaining(["60", "8"]));
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
    await expect(page).toHaveURL(/\/workout\//);
    // Last time's numbers are filled in: BW × 8 and 60 × 8. Go heavier on the row.
    await labelled(page, "Barbell Bent Over Row set 1 weight").fill("65");
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
});
