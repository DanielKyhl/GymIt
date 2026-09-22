// Ranks: a new one roughly every 15 levels, each with its own frame, worked
// out from the level alone.

export type RankId =
  | "rookie"
  | "iron"
  | "bronze"
  | "silver"
  | "gold"
  | "platinum"
  | "emerald"
  | "ruby"
  | "sapphire"
  | "diamond"
  | "legend";

export type Rank = { id: RankId; name: string; minLevel: number };

export const RANKS: Rank[] = [
  { id: "rookie", name: "Rookie", minLevel: 1 },
  { id: "iron", name: "Iron", minLevel: 10 },
  { id: "bronze", name: "Bronze", minLevel: 25 },
  { id: "silver", name: "Silver", minLevel: 40 },
  { id: "gold", name: "Gold", minLevel: 55 },
  { id: "platinum", name: "Platinum", minLevel: 70 },
  { id: "emerald", name: "Emerald", minLevel: 85 },
  { id: "ruby", name: "Ruby", minLevel: 100 },
  { id: "sapphire", name: "Sapphire", minLevel: 115 },
  { id: "diamond", name: "Diamond", minLevel: 130 },
  { id: "legend", name: "Legend", minLevel: 150 },
];

export function rankFor(level: number): Rank {
  return [...RANKS].reverse().find((r) => level >= r.minLevel) ?? RANKS[0];
}
