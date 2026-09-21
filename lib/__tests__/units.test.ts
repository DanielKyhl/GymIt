import { convertWeight, normalizeUnits, parseNumber, parseWeight } from "../units";
import { set, workout } from "./fixtures";

describe("parseNumber while typing", () => {
  // The set inputs keep the typed text and report this parsed value, so a
  // half-typed decimal must not throw away what's been entered so far.
  test("half-typed decimals keep the whole-number part", () => {
    expect(parseNumber("32,")).toBe(32);
    expect(parseNumber("32.")).toBe(32);
    expect(parseNumber("32,5")).toBe(32.5);
  });

  test("a lone separator or empty field is no number", () => {
    expect(parseNumber(",")).toBeNull();
    expect(parseNumber("")).toBeNull();
  });
});

describe("normalizeUnits", () => {
  const kgDay = workout("Push", "2026-09-07T08:00:00.000Z", [
    { name: "Bench", sets: [set(100, 5)] },
  ]);
  const lbDay = { ...workout("Push", "2026-09-09T16:00:00.000Z", [
    { name: "Bench", sets: [set(225, 5)] },
  ]), unit: "lb" as const };

  test("converts workouts logged in the other unit", () => {
    const [a, b] = normalizeUnits([kgDay, lbDay], "kg");
    expect(a.exercises[0].sets[0].weight).toBe(100);
    expect(b.exercises[0].sets[0].weight).toBe(102.1);
    expect(b.unit).toBe("kg");
  });

  test("leaves workouts already in that unit untouched", () => {
    expect(normalizeUnits([kgDay], "kg")[0]).toBe(kgDay);
  });

  test("does not change the stored workout", () => {
    normalizeUnits([lbDay], "kg");
    expect(lbDay.exercises[0].sets[0].weight).toBe(225);
  });
});

describe("convertWeight", () => {
  test("leaves the same unit alone", () => {
    expect(convertWeight(80, "kg", "kg")).toBe(80);
  });

  test("converts both ways, to one decimal", () => {
    expect(convertWeight(80, "kg", "lb")).toBe(176.4);
    expect(convertWeight(176.4, "lb", "kg")).toBe(80);
  });
});

describe("parseWeight", () => {
  test("accepts dot and comma decimals", () => {
    expect(parseWeight("80.5")).toBe(80.5);
    expect(parseWeight("80,5")).toBe(80.5);
    expect(parseWeight(" 72 ")).toBe(72);
  });

  test("rejects empty, zero, negative and non-numbers", () => {
    expect(parseWeight("")).toBeNull();
    expect(parseWeight("0")).toBeNull();
    expect(parseWeight("-5")).toBeNull();
    expect(parseWeight("abc")).toBeNull();
  });
});
