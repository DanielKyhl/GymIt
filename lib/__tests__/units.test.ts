import { convertWeight, parseWeight } from "../units";

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
