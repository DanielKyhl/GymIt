export type Unit = "kg" | "lb";

const LB_PER_KG = 2.20462;

// Convert a weight between units, rounded to one decimal.
export function convertWeight(value: number, from: Unit, to: Unit): number {
  if (from === to) return value;
  const converted = from === "kg" ? value * LB_PER_KG : value / LB_PER_KG;
  return Math.round(converted * 10) / 10;
}

// Read a typed weight. Accepts "80.5" and "80,5" (comma decimals on Danish
// keyboards). Returns null for anything that isn't a positive number.
export function parseWeight(text: string): number | null {
  const value = Number(text.trim().replace(",", "."));
  return text.trim() !== "" && Number.isFinite(value) && value > 0 ? value : null;
}
