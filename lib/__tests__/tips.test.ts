import { placeTip, TIP_TOURS, TIPS, tipsAfter } from "../tips";

describe("welcome tips", () => {
  test("finishing a set leaves the rest; skipping ends them all", () => {
    expect(tipsAfter(TIP_TOURS, "home")).toEqual(["workout"]);
    expect(tipsAfter(["workout"], "workout")).toEqual([]);
    expect(tipsAfter(TIP_TOURS, "all")).toEqual([]);
    expect(tipsAfter([], "home")).toEqual([]);
  });

  test("every set has tips, each pointing at its own thing", () => {
    for (const tour of TIP_TOURS) {
      expect(TIPS[tour].length).toBeGreaterThan(0);
      expect(new Set(TIPS[tour].map((t) => t.target)).size).toBe(TIPS[tour].length);
    }
  });
});

describe("placing a tip", () => {
  const screen = { width: 393, height: 852 };
  const tip = { height: 180, side: 16, gap: 14, corner: 26 };

  test("below what it points at when there's room", () => {
    const at = placeTip({ x: 20, y: 112, width: 353, height: 176 }, screen, tip);
    expect(at).toEqual({ below: true, top: 112 + 176 + 14, arrowX: 196.5 - 16 });
  });

  test("above it when there isn't, like the tab bar", () => {
    const at = placeTip({ x: 0, y: 763, width: 393, height: 55 }, screen, tip);
    expect(at.below).toBe(false);
    expect(at.top).toBe(763 - 14 - 180);
  });

  test("the arrow stays clear of the tip's corners", () => {
    expect(placeTip({ x: 370, y: 60, width: 20, height: 20 }, screen, tip).arrowX).toBe(393 - 32 - 26);
    expect(placeTip({ x: 0, y: 60, width: 10, height: 10 }, screen, tip).arrowX).toBe(26);
  });
});
