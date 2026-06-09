export const DEFAULT_GENERATED_FLASHCARD_COUNT = 10;
export const MIN_GENERATED_FLASHCARD_COUNT = 1;
export const MAX_GENERATED_FLASHCARD_COUNT = 30;

export function normalizeGeneratedFlashcardCount(value: unknown) {
  const numericValue =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;

  if (!Number.isInteger(numericValue)) {
    return null;
  }

  if (
    numericValue < MIN_GENERATED_FLASHCARD_COUNT ||
    numericValue > MAX_GENERATED_FLASHCARD_COUNT
  ) {
    return null;
  }

  return numericValue;
}
