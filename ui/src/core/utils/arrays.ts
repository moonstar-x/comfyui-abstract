/**
 * Splits the items into consecutive chunks of at most the given size.
 */
export const chunk = <T>(items: readonly T[], size: number): T[][] => Array.from(
  { length: Math.ceil(items.length / size) },
  (_, index) => items.slice(index * size, (index + 1) * size)
);
