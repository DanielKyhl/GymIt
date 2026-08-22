// "1 set", "2 sets" — correct singular/plural.
export function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}
