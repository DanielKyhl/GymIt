import { parseNumber } from "./units";

// The app's own number pad (components/NumberPad.tsx), used instead of the
// phone's keyboard for every number: what each key does to the number being
// typed. Pure, so it can be tested on its own.

export type PadKey = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "." | "back" | "minus" | "plus";

// What's typed so far, and whether it's "fresh": just picked, so the next digit
// replaces it (like typing over a selection) rather than adding to it.
export type PadDraft = { text: string; fresh: boolean };

export type PadRules = { decimals: boolean; step: number };

const MAX_LENGTH = 6; // 999.75, 12345
const MAX_DECIMALS = 2;

// Starting to edit a field: its value, all of it selected.
export function draftFor(value: number): PadDraft {
  return { text: value ? String(value) : "", fresh: true };
}

export function applyKey(draft: PadDraft, key: PadKey, rules: PadRules): PadDraft {
  const text = draft.fresh ? "" : draft.text;

  if (key === "back") return { text: draft.fresh ? "" : draft.text.slice(0, -1), fresh: false };

  if (key === "minus" || key === "plus") {
    const current = parseNumber(draft.text) ?? 0;
    const next = Math.max(0, current + (key === "plus" ? rules.step : -rules.step));
    return { text: next ? String(Math.round(next * 100) / 100) : "", fresh: true };
  }

  if (key === ".") {
    if (!rules.decimals || text.includes(".")) return draft;
    return { text: text === "" ? "0." : `${text}.`, fresh: false };
  }

  // A digit.
  const decimals = text.includes(".") ? text.length - text.indexOf(".") - 1 : 0;
  if (text.length >= MAX_LENGTH || decimals >= MAX_DECIMALS) return { text, fresh: false };
  return { text: text === "0" ? key : text + key, fresh: false };
}

// The number a draft stands for (0 when there's nothing to read).
export function draftValue(draft: PadDraft): number {
  return parseNumber(draft.text) ?? 0;
}

// How a step reads on its keys: 2.5, 5, 1.
export function formatStep(step: number): string {
  return String(Math.round(step * 100) / 100);
}
