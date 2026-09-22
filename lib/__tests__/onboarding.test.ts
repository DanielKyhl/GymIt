import { needsOnboarding, restForGoal, starterPlan, suggestedWeeklyGoal } from "../onboarding";
import { PREMADE_TEMPLATES } from "../premadeTemplates";

describe("needsOnboarding", () => {
  test("a brand-new account gets it", () => {
    expect(needsOnboarding({}, 0)).toBe(true);
  });

  test("not after finishing or skipping it", () => {
    expect(needsOnboarding({ onboarded: true }, 0)).toBe(false);
  });

  test("existing accounts are skipped", () => {
    expect(needsOnboarding({}, 3)).toBe(false); // has workouts
    expect(needsOnboarding({ bodyWeightAsked: true }, 0)).toBe(false); // used Home before
  });
});

describe("starterPlan", () => {
  test("up to 3 days is full body, whatever the experience", () => {
    expect(starterPlan("experienced", 3).templateId).toBe("premade-fullbody");
    expect(starterPlan("new", 2).templateId).toBe("premade-fullbody");
  });

  test("4 days is upper/lower", () => {
    expect(starterPlan("some", 4).templateId).toBe("premade-upper");
  });

  test("5+ days is push/pull/legs, except for beginners", () => {
    expect(starterPlan("experienced", 5).templateId).toBe("premade-push");
    expect(starterPlan("some", 6).templateId).toBe("premade-push");
    expect(starterPlan("new", 6).templateId).toBe("premade-upper");
  });

  test("every plan points at real example templates, starting with the first", () => {
    const ids = new Set(PREMADE_TEMPLATES.map((t) => t.id));
    for (const exp of ["new", "some", "experienced"] as const) {
      for (const days of [2, 3, 4, 5, 6]) {
        const plan = starterPlan(exp, days);
        expect(plan.rotation[0]).toBe(plan.templateId);
        expect(plan.rotation.every((id) => ids.has(id))).toBe(true);
      }
    }
  });

  test("the rotation is the whole split", () => {
    expect(starterPlan("some", 4).rotation).toEqual(["premade-upper", "premade-lower"]);
    expect(starterPlan("experienced", 5).rotation).toEqual(["premade-push", "premade-pull", "premade-legs"]);
  });
});

describe("defaults from the answers", () => {
  test("rest suits the goal", () => {
    expect(restForGoal("strength")).toBe(180);
    expect(restForGoal("muscle")).toBe(90);
    expect(restForGoal("fitness")).toBe(60);
  });

  test("suggested weekly goal", () => {
    expect(suggestedWeeklyGoal("new")).toBe(3);
    expect(suggestedWeeklyGoal("experienced")).toBe(4);
  });
});
