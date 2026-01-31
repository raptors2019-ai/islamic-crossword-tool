/**
 * Word Index for Fast Pattern Matching
 *
 * Provides O(1) lookup for words matching patterns like "J_M" or "A__AH"
 * Used for perpendicular slot validation in crossword generation.
 */

export interface WordIndex {
  /** Words grouped by length */
  byLength: Map<number, Set<string>>;
  /** Words grouped by pattern signature (e.g., "J__" → ["JAM", "JAW", ...]) */
  byFirstLetter: Map<string, Map<number, Set<string>>>;
  /** All words in the index */
  allWords: Set<string>;
}

/**
 * Build an index from a list of words for fast pattern matching.
 * Call once at startup with your word list.
 */
export function buildWordIndex(words: string[]): WordIndex {
  const byLength = new Map<number, Set<string>>();
  const byFirstLetter = new Map<string, Map<number, Set<string>>>();
  const allWords = new Set<string>();

  for (const word of words) {
    const upper = word.toUpperCase().trim();
    if (upper.length < 2 || upper.length > 5) continue; // 5x5 grid constraint

    allWords.add(upper);

    // Index by length
    if (!byLength.has(upper.length)) {
      byLength.set(upper.length, new Set());
    }
    byLength.get(upper.length)!.add(upper);

    // Index by first letter + length for faster lookup
    const firstLetter = upper[0];
    if (!byFirstLetter.has(firstLetter)) {
      byFirstLetter.set(firstLetter, new Map());
    }
    const letterMap = byFirstLetter.get(firstLetter)!;
    if (!letterMap.has(upper.length)) {
      letterMap.set(upper.length, new Set());
    }
    letterMap.get(upper.length)!.add(upper);
  }

  return { byLength, byFirstLetter, allWords };
}

/**
 * Check if a word exists in the index.
 */
export function hasWord(word: string, index: WordIndex): boolean {
  return index.allWords.has(word.toUpperCase());
}

/**
 * Find all words matching a pattern.
 * Pattern uses '_' for unknown letters, e.g., "J_M" matches "JAM", "JIM"
 *
 * @param pattern Pattern like "J_M" or "A__AH"
 * @param index The word index
 * @returns Array of matching words
 */
export function matchPattern(pattern: string, index: WordIndex): string[] {
  const upperPattern = pattern.toUpperCase();
  const length = upperPattern.length;

  // Get candidate words by length
  const candidates = index.byLength.get(length);
  if (!candidates) return [];

  // If we know the first letter, narrow down candidates
  const firstChar = upperPattern[0];
  let wordPool: Set<string>;

  if (firstChar !== '_') {
    const letterMap = index.byFirstLetter.get(firstChar);
    if (!letterMap) return [];
    const poolByLength = letterMap.get(length);
    if (!poolByLength) return [];
    wordPool = poolByLength;
  } else {
    wordPool = candidates;
  }

  // Filter by pattern match
  const results: string[] = [];
  for (const word of wordPool) {
    if (matchesPattern(word, upperPattern)) {
      results.push(word);
    }
  }

  return results;
}

/**
 * Check if ANY word exists for a pattern (faster than getting all matches).
 * Use this for validation where you only need to know if a solution exists.
 */
export function hasMatch(pattern: string, index: WordIndex): boolean {
  const upperPattern = pattern.toUpperCase();
  const length = upperPattern.length;

  // Quick rejection: pattern too short or too long
  if (length < 2 || length > 5) return false;

  // If pattern is all known letters, check if it's a valid word
  if (!upperPattern.includes('_')) {
    return index.allWords.has(upperPattern);
  }

  // Get candidate words by length
  const candidates = index.byLength.get(length);
  if (!candidates) return false;

  // If we know the first letter, narrow down candidates
  const firstChar = upperPattern[0];
  let wordPool: Set<string>;

  if (firstChar !== '_') {
    const letterMap = index.byFirstLetter.get(firstChar);
    if (!letterMap) return false;
    const poolByLength = letterMap.get(length);
    if (!poolByLength) return false;
    wordPool = poolByLength;
  } else {
    wordPool = candidates;
  }

  // Check if any word matches the pattern
  for (const word of wordPool) {
    if (matchesPattern(word, upperPattern)) {
      return true;
    }
  }

  return false;
}

/**
 * Check if a word matches a pattern.
 * Pattern uses '_' for unknown letters.
 */
function matchesPattern(word: string, pattern: string): boolean {
  if (word.length !== pattern.length) return false;

  for (let i = 0; i < pattern.length; i++) {
    if (pattern[i] !== '_' && pattern[i] !== word[i]) {
      return false;
    }
  }

  return true;
}

/**
 * Get all words of a specific length.
 */
export function getWordsByLength(length: number, index: WordIndex): string[] {
  const words = index.byLength.get(length);
  return words ? Array.from(words) : [];
}

/**
 * Count candidates for a pattern (for debugging/stats).
 */
export function countCandidates(pattern: string, index: WordIndex): number {
  return matchPattern(pattern, index).length;
}
