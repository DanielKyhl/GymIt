import { applyKey, draftFor, draftValue, formatStep, PadDraft, PadKey } from "../numberPad";

const kg = { decimals: true, step: 2.5 };
const reps = { decimals: false, step: 1 };

// Presses keys one after another, starting from a field holding `value`.
function press(value: number, keys: PadKey[], rules = kg): PadDraft {
  return keys.reduce((draft, key) => applyKey(draft, key, rules), draftFor(value));
}

describe("the number pad", () => {
  test("starting on a field selects its value, so the first digit replaces it", () => {
    expect(draftFor(60)).toEqual({ text: "60", fresh: true });
    expect(draftFor(0)).toEqual({ text: "", fresh: true });
    expect(press(60, ["6", "2", ".", "5"]).text).toBe("62.5");
  });

  test("delete removes the last digit; on a fresh value it clears it", () => {
    expect(press(60, ["back"]).text).toBe("");
    expect(press(0, ["1", "0", "0", "back"]).text).toBe("10");
  });

  test("minus and plus step the number, never below nothing", () => {
    expect(press(60, ["plus"]).text).toBe("62.5");
    expect(press(60, ["minus", "minus"]).text).toBe("55");
    expect(press(2.5, ["minus", "minus"]).text).toBe("");
    expect(press(8, ["plus"], reps).text).toBe("9");
  });

  test("after a step, typing starts over rather than tacking digits on", () => {
    expect(press(60, ["plus", "7", "0"]).text).toBe("70");
  });

  test("one decimal point, two decimal places, and none at all for reps", () => {
    expect(press(0, [".", "5"]).text).toBe("0.5");
    expect(press(0, ["2", ".", ".", "5"]).text).toBe("2.5");
    expect(press(0, ["1", ".", "2", "5", "5"]).text).toBe("1.25");
    expect(press(0, ["8", "."], reps).text).toBe("8");
  });

  test("no leading zeros, and no absurdly long numbers", () => {
    expect(press(0, ["0", "5"]).text).toBe("5");
    expect(press(0, ["1", "2", "3", "4", "5", "6", "7"]).text).toBe("123456");
  });

  test("reads back as a number, halfway-typed or not", () => {
    expect(draftValue({ text: "62.", fresh: false })).toBe(62);
    expect(draftValue({ text: "0.", fresh: false })).toBe(0);
    expect(draftValue({ text: "", fresh: false })).toBe(0);
  });

  test("steps read as they'd be said", () => {
    expect(formatStep(2.5)).toBe("2.5");
    expect(formatStep(5)).toBe("5");
  });
});
