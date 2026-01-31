/**
 * Word Index for Fast Pattern Matching
 *
 * Provides O(1) lookup for words matching patterns like "J_M" or "A__AH"
 * Used for perpendicular slot validation in crossword generation.
 *
 * Enhanced with:
 * - Word scoring by category (Islamic keywords, fillers, common English)
 * - Priority-based word selection for CSP filling
 */

import { ALL_WORDS_2_5, ISLAMIC_WORDS_SET } from './word-list-full';

/** Word category scores for fill quality */
export const WORD_SCORE = {
  ISLAMIC_KEYWORD: 100,  // Prophet names, Names of Allah, Quran terms
  ISLAMIC_FILLER: 70,    // PEACE, LIGHT, FAITH, etc.
  COMMON_ENGLISH: 40,    // Standard crossword words
  RARE_ENGLISH: 20,      // Less common but valid
  CROSSWORDESE: 10,      // EEL, QUA, etc. - last resort
} as const;

/** Islamic filler words (themed for Islamic crosswords) */
const ISLAMIC_FILLER_WORDS = new Set([
  'PEACE', 'LIGHT', 'TRUTH', 'FAITH', 'GRACE', 'MERCY', 'HOPE', 'LOVE',
  'WISE', 'JUST', 'PURE', 'SOUL', 'GOOD', 'KIND', 'PRAY', 'FAST', 'GIVE',
  'READ', 'SEEK', 'PATH', 'GUIDE', 'BLESS', 'NOBLE', 'TRUST', 'GLORY',
  'ANGEL', 'EARTH', 'WATER', 'NIGHT', 'DREAM', 'HEART', 'HONOR', 'MORAL',
]);

/** Common crosswordese (valid but less desirable) */
const CROSSWORDESE = new Set([
  'QUA', 'EEL', 'EMU', 'ERE', 'ERR', 'ESS', 'ETA', 'EVE', 'EWE',
  'GNU', 'OAT', 'ODE', 'OLE', 'ORE', 'OWE', 'OWL', 'UNO', 'URN',
  'ALOE', 'ALEE', 'ARIA', 'ASEA', 'EPEE', 'ERNE', 'ESNE', 'OLEO',
]);

export interface WordIndex {
  /** Words grouped by length */
  byLength: Map<number, Set<string>>;
  /** Words grouped by pattern signature (e.g., "J__" → ["JAM", "JAW", ...]) */
  byFirstLetter: Map<string, Map<number, Set<string>>>;
  /** All words in the index */
  allWords: Set<string>;
  /** Word scores for prioritization */
  wordScores: Map<string, number>;
}

/**
 * Calculate the score for a word based on its category.
 */
export function getWordScore(word: string): number {
  const upper = word.toUpperCase();

  if (ISLAMIC_WORDS_SET.has(upper)) {
    return WORD_SCORE.ISLAMIC_KEYWORD;
  }
  if (ISLAMIC_FILLER_WORDS.has(upper)) {
    return WORD_SCORE.ISLAMIC_FILLER;
  }
  if (CROSSWORDESE.has(upper)) {
    return WORD_SCORE.CROSSWORDESE;
  }
  // Common words are everything else
  return WORD_SCORE.COMMON_ENGLISH;
}

/**
 * Build an index from a list of words for fast pattern matching.
 * Call once at startup with your word list.
 */
export function buildWordIndex(words: string[]): WordIndex {
  const byLength = new Map<number, Set<string>>();
  const byFirstLetter = new Map<string, Map<number, Set<string>>>();
  const allWords = new Set<string>();
  const wordScores = new Map<string, number>();

  for (const word of words) {
    const upper = word.toUpperCase().trim();
    if (upper.length < 2 || upper.length > 5) continue; // 5x5 grid constraint

    allWords.add(upper);
    wordScores.set(upper, getWordScore(upper));

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

  return { byLength, byFirstLetter, allWords, wordScores };
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

/**
 * Get the score for a word from the index.
 */
export function getScore(word: string, index: WordIndex): number {
  return index.wordScores.get(word.toUpperCase()) ?? WORD_SCORE.COMMON_ENGLISH;
}

/**
 * Find all words matching a pattern, sorted by score (highest first).
 * Use this when you need prioritized candidates for CSP filling.
 */
export function matchPatternSorted(pattern: string, index: WordIndex): string[] {
  const matches = matchPattern(pattern, index);
  // Sort by score (highest first), then alphabetically for stability
  return matches.sort((a, b) => {
    const scoreA = index.wordScores.get(a) ?? WORD_SCORE.COMMON_ENGLISH;
    const scoreB = index.wordScores.get(b) ?? WORD_SCORE.COMMON_ENGLISH;
    if (scoreB !== scoreA) return scoreB - scoreA;
    return a.localeCompare(b);
  });
}

/**
 * Build the default word index using the full word list.
 * This is a convenience function for creating an index with all words.
 */
export function buildDefaultWordIndex(): WordIndex {
  return buildWordIndex(ALL_WORDS_2_5);
}

/**
 * Singleton instance of the default word index.
 * Use this for most operations to avoid rebuilding the index.
 */
let _defaultIndex: WordIndex | null = null;

export function getDefaultWordIndex(): WordIndex {
  if (!_defaultIndex) {
    _defaultIndex = buildDefaultWordIndex();
  }
  return _defaultIndex;
}

/**
 * Build a word index with boosted priority for specific keywords.
 * Used for prophet-specific puzzle generation to maximize theme words.
 *
 * @param boostedWords Words to give highest priority (e.g., prophet keywords)
 * @param baseIndex Optional base index to extend (defaults to the full word list)
 * @returns New word index with boosted scores
 */
export function buildBoostedWordIndex(
  boostedWords: string[],
  baseIndex?: WordIndex
): WordIndex {
  const base = baseIndex ?? getDefaultWordIndex();

  // Create a new word scores map with boosted words
  const newScores = new Map(base.wordScores);
  const boostedSet = new Set<string>();

  // Add boosted words with maximum priority
  for (const word of boostedWords) {
    const upper = word.toUpperCase().trim();
    if (upper.length >= 2 && upper.length <= 5) {
      newScores.set(upper, WORD_SCORE.ISLAMIC_KEYWORD + 50); // Higher than any other
      boostedSet.add(upper);
    }
  }

  // Ensure boosted words are in the index (they might not be in the base dictionary)
  const newAllWords = new Set(base.allWords);
  const newByLength = new Map<number, Set<string>>();
  const newByFirstLetter = new Map<string, Map<number, Set<string>>>();

  // Copy existing data
  for (const [len, words] of base.byLength) {
    newByLength.set(len, new Set(words));
  }
  for (const [letter, lenMap] of base.byFirstLetter) {
    newByFirstLetter.set(letter, new Map());
    for (const [len, words] of lenMap) {
      newByFirstLetter.get(letter)!.set(len, new Set(words));
    }
  }

  // Add boosted words that might not be in the index
  for (const word of boostedSet) {
    if (!newAllWords.has(word)) {
      newAllWords.add(word);

      // Add to byLength
      if (!newByLength.has(word.length)) {
        newByLength.set(word.length, new Set());
      }
      newByLength.get(word.length)!.add(word);

      // Add to byFirstLetter
      const firstLetter = word[0];
      if (!newByFirstLetter.has(firstLetter)) {
        newByFirstLetter.set(firstLetter, new Map());
      }
      const letterMap = newByFirstLetter.get(firstLetter)!;
      if (!letterMap.has(word.length)) {
        letterMap.set(word.length, new Set());
      }
      letterMap.get(word.length)!.add(word);
    }
  }

  return {
    byLength: newByLength,
    byFirstLetter: newByFirstLetter,
    allWords: newAllWords,
    wordScores: newScores,
  };
}
