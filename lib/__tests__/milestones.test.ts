import { LANDMARKS, lifetimeKg, lifetimeMilestone } from "../milestones";
import { set, workout } from "./fixtures";

describe("lifetimeMilestone", () => {
  test("before the first landmark: nothing passed, working towards the bus", () => {
    const m = lifetimeMilestone(5_000);
    expect(m.passed).toBeNull();
    expect(m.next?.id).toBe("bus");
    expect(m.progress).toBeCloseTo(0.4);
  });

  test("names the heaviest landmark passed and the next one", () => {
    const m = lifetimeMilestone(300_000);
    expect(m.passed?.id).toBe("liberty");
    expect(m.next?.id).toBe("iss");
    expect(m.progress).toBeCloseTo(300 / 420);
  });

  test("exactly reaching a landmark counts as passing it", () => {
    expect(lifetimeMilestone(10_100_000).passed?.id).toBe("eiffel");
  });

  test("past the pyramid there's nothing left to chase", () => {
    const m = lifetimeMilestone(6_000_000_000);
    expect(m.passed?.id).toBe("pyramid");
    expect(m.next).toBeNull();
    expect(m.progress).toBe(1);
  });

  test("landmarks run lightest to heaviest and include the big ones", () => {
    const kgs = LANDMARKS.map((l) => l.kg);
    expect([...kgs].sort((a, b) => a - b)).toEqual(kgs);
    expect(LANDMARKS.map((l) => l.id)).toEqual(expect.arrayContaining(["empire", "burj", "eiffel"]));
  });
});

describe("lifetimeKg", () => {
  test("adds up every workout's volume, converting pounds", () => {
    const kg = workout("A", "2026-09-01", [{ name: "Squat", sets: [set(100, 5)] }]); // 500 kg
    const lb = { ...workout("B", "2026-09-02", [{ name: "Squat", sets: [set(220.462, 5)] }]), unit: "lb" as const }; // ~500 kg
    expect(lifetimeKg([kg, lb])).toBeCloseTo(1000, 0);
  });
});
