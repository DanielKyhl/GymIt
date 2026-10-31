import { LANDMARKS, lifetimeKg, lifetimeMilestone } from "../milestones";
import { set, workout } from "./fixtures";

describe("the landmark ladder", () => {
  test("runs lightest to heaviest", () => {
    const kgs = LANDMARKS.map((l) => l.kg);
    expect([...kgs].sort((a, b) => a - b)).toEqual(kgs);
  });

  test("never jumps: after the first two, each is at most twice the one before", () => {
    for (let i = 2; i < LANDMARKS.length; i++) {
      expect(LANDMARKS[i].kg / LANDMARKS[i - 1].kg).toBeLessThanOrEqual(2);
    }
  });

  test("tops out within reach: the Saturn V, 2.8 million kg", () => {
    expect(LANDMARKS[LANDMARKS.length - 1]).toMatchObject({ id: "saturn", kg: 2_800_000 });
  });

  test("keeps the landmarks the achievements are named after, at the same weights", () => {
    const kg = (id: string) => LANDMARKS.find((l) => l.id === id)?.kg;
    expect([kg("bus"), kg("liberty"), kg("iss"), kg("saturn")]).toEqual([12_500, 204_000, 420_000, 2_800_000]);
  });
});

describe("lifetimeMilestone", () => {
  test("before the first landmark: nothing passed, working towards the car", () => {
    const m = lifetimeMilestone(750);
    expect(m.passed).toBeNull();
    expect(m.next.id).toBe("car");
    expect(m.progress).toBeCloseTo(0.5);
  });

  test("the bar fills from the landmark just passed to the next one", () => {
    const m = lifetimeMilestone(300_000);
    expect(m.passed?.id).toBe("liberty");
    expect(m.next.id).toBe("b777");
    expect(m.progress).toBeCloseTo((300_000 - 204_000) / (351_000 - 204_000));
    // Empty right after passing one.
    expect(lifetimeMilestone(204_000).progress).toBe(0);
  });

  test("exactly reaching a landmark counts as passing it", () => {
    expect(lifetimeMilestone(420_000).passed?.id).toBe("iss");
  });

  test("past the Saturn V: a goal every half million kilograms", () => {
    const just = lifetimeMilestone(2_900_000);
    expect(just.passed?.id).toBe("saturn");
    expect(just.next).toMatchObject({ id: "kg-3000000", name: "3 million kg", kg: 3_000_000 });
    expect(just.progress).toBeCloseTo(0.5);

    const later = lifetimeMilestone(3_700_000);
    expect(later.passed?.name).toBe("3.5 million kg");
    expect(later.next.name).toBe("4 million kg");
    expect(later.progress).toBeCloseTo(0.4);
  });

  test("in pounds: the same ladder, and round goals every million pounds", () => {
    // The landmarks are the same things whatever the unit.
    expect(lifetimeMilestone(300_000, "lb").passed?.id).toBe("liberty");

    // 2.8 million kg is about 6.17 million lb, so the first round goal is 7 million lb.
    const just = lifetimeMilestone(2_900_000, "lb");
    expect(just.passed?.id).toBe("saturn");
    expect(just.next).toMatchObject({ id: "lb-7000000", name: "7 million lb" });
    expect(just.next.kg).toBeCloseTo(3_175_147, -1);

    const later = lifetimeMilestone(4_000_000, "lb"); // about 8.8 million lb
    expect(later.passed?.name).toBe("8 million lb");
    expect(later.next.name).toBe("9 million lb");
  });

  test("there's always a next goal, however much you've lifted", () => {
    const m = lifetimeMilestone(50_000_000);
    expect(m.next.kg).toBeGreaterThan(50_000_000);
    expect(m.next.kg - (m.passed?.kg ?? 0)).toBe(500_000);
    expect(m.progress).toBeLessThan(1);
  });
});

describe("lifetimeKg", () => {
  test("adds up every workout's volume, converting pounds", () => {
    const kg = workout("A", "2026-09-01", [{ name: "Squat", sets: [set(100, 5)] }]); // 500 kg
    const lb = { ...workout("B", "2026-09-02", [{ name: "Squat", sets: [set(220.462, 5)] }]), unit: "lb" as const }; // ~500 kg
    expect(lifetimeKg([kg, lb])).toBeCloseTo(1000, 0);
  });
});
