/**
 * Calculates Words Per Minute (WPM).
 * Formula: (correctCharacters / 5) / (durationMs / 60000)
 * 
 * @param correctChars Number of correct characters typed
 * @param durationMs Duration in milliseconds
 * @returns WPM value rounded to 2 decimal places
 */
export function calculateWpm(correctChars: number, durationMs: number): number {
  if (durationMs <= 0) return 0;
  const minutes = durationMs / 60000;
  const words = correctChars / 5;
  const wpm = words / minutes;
  return Math.round(wpm * 100) / 100;
}
