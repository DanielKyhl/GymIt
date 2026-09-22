import type { SilhouetteName } from "../components/animalSilhouettes";
import { formatNumber } from "./format";
import { convertWeight, Unit } from "./units";

// "Lifted what is equal to 10 tigers": the comparison on the workout summary,
// shown under a big silhouette of the animal. Only big animals, so the number
// means something. Weights are typical adults, rounded. Heaviest first.

export type Animal = {
  id: string;
  one: string; // "a tiger"
  many: string; // "tigers"
  kg: number;
  icon: SilhouetteName;
};

export const ANIMALS: Animal[] = [
  { id: "humpback", one: "a humpback whale", many: "humpback whales", kg: 30000, icon: "humpback" },
  { id: "trex", one: "a T. rex", many: "T. rexes", kg: 8000, icon: "trex" },
  { id: "minke", one: "a minke whale", many: "minke whales", kg: 7000, icon: "minke" },
  { id: "elephant", one: "an African elephant", many: "African elephants", kg: 6000, icon: "elephant" },
  { id: "mammoth", one: "a woolly mammoth", many: "woolly mammoths", kg: 5500, icon: "mammoth" },
  { id: "orca", one: "a killer whale", many: "killer whales", kg: 4500, icon: "orca" },
  { id: "rhino", one: "a white rhino", many: "white rhinos", kg: 2300, icon: "rhino" },
  { id: "hippo", one: "a hippo", many: "hippos", kg: 1500, icon: "hippo" },
  { id: "shark", one: "a great white shark", many: "great white sharks", kg: 1100, icon: "shark" },
  { id: "bison", one: "an American bison", many: "American bison", kg: 900, icon: "bison" },
  { id: "camel", one: "a camel", many: "camels", kg: 550, icon: "camel" },
  { id: "moose", one: "a moose", many: "moose", kg: 500, icon: "moose" },
  { id: "crocodile", one: "a saltwater crocodile", many: "saltwater crocodiles", kg: 500, icon: "crocodile" },
  { id: "polar", one: "a polar bear", many: "polar bears", kg: 450, icon: "polar" },
  { id: "grizzly", one: "a grizzly bear", many: "grizzly bears", kg: 300, icon: "grizzly" },
  { id: "tiger", one: "a tiger", many: "tigers", kg: 220, icon: "tiger" },
  { id: "lion", one: "a lion", many: "lions", kg: 190, icon: "lion" },
  { id: "gorilla", one: "a gorilla", many: "gorillas", kg: 160, icon: "gorilla" },
];

export type Comparison = {
  animal: Animal;
  count: number; // one decimal under 10, whole numbers above
  text: string; // "Lifted what is equal to 10 tigers"
};

// Counts between these read well: "2.5 hippos", "40 lions".
const MIN_COUNT = 1.5;
const MAX_COUNT = 99;

const roundCount = (n: number) => (n < 10 ? Math.round(n * 10) / 10 : Math.round(n));

// Picks an animal for a workout's total volume. Several animals usually fit;
// `seed` (how many workouts came before this one) rotates through them, so
// repeating a workout at nearly the same volume still gives a new one.
export function compareVolume(volume: number, unit: Unit, seed: number): Comparison | null {
  const kg = convertWeight(volume, unit, "kg");
  if (kg <= 0) return null;
  let options = ANIMALS.filter((a) => kg / a.kg >= MIN_COUNT && kg / a.kg <= MAX_COUNT);
  if (options.length === 0) {
    // Lighter than one gorilla: nothing impressive to compare with yet.
    if (kg < ANIMALS[ANIMALS.length - 1].kg) return null;
    // Between animals, or beyond 99 whales: the nearest one still reads fine.
    options = [kg / ANIMALS[0].kg > MAX_COUNT ? ANIMALS[0] : ANIMALS[ANIMALS.length - 1]];
  }
  const animal = options[seed % options.length];
  const count = roundCount(kg / animal.kg);
  return {
    animal,
    count,
    text: `Lifted what is equal to ${count === 1 ? animal.one : `${formatNumber(count)} ${animal.many}`}`,
  };
}
