/**
 * Calculates typing accuracy as a percentage.
 * Formula: (correctChars / totalCharsTyped) * 100
 * 
 * @param correctChars Number of correct characters
 * @param totalCharsTyped Total characters typed (including corrected mistakes)
 * @returns Accuracy percentage rounded to 2 decimal places (between 0 and 100)
 */
export function calculateAccuracy(correctChars: number, totalCharsTyped: number): number {
  if (totalCharsTyped <= 0) return 100;
  const accuracy = (correctChars / totalCharsTyped) * 100;
  // Ensure we don't exceed 100% and don't go below 0%
  const clampedAccuracy = Math.max(0, Math.min(100, accuracy));
  return Math.round(clampedAccuracy * 100) / 100;
}
