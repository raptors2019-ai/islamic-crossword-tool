/**
 * Constraint Suggester
 * Finds words matching letter patterns for live suggestions
 */

import { sampleWords } from './sample-data';

export interface WordSuggestion {
  word: string;
  clue: string;
  score: number;
  category?: string;
  isIslamic: boolean;
}

/**
 * Build a dictionary of words by length for efficient lookup
 */
function buildWordsByLength(): Map<number, WordSuggestion[]> {
  const byLength = new Map<number, WordSuggestion[]>();

  for (const wordData of sampleWords) {
    const length = wordData.word.length;
    if (length < 2 || length > 5) continue; // Only 2-5 letter words for 5x5

    const suggestion: WordSuggestion = {
      word: wordData.word.toUpperCase(),
      clue: wordData.clue,
      score: wordData.score,
      category: wordData.category,
      isIslamic: true, // All words in sampleWords are Islamic
    };

    const existing = byLength.get(length) || [];
    existing.push(suggestion);
    byLength.set(length, existing);
  }

  return byLength;
}

const WORDS_BY_LENGTH = buildWordsByLength();

/**
 * Convert a pattern with _ wildcards to a regex
 * Pattern: "A__AH" -> /^A..AH$/i
 * Pattern with # for black cells: "A#_AH" -> pattern ends at #
 */
function patternToRegex(pattern: string): RegExp | null {
  // Split on # (black cells) and take the longest segment that has letters
  const segments = pattern.split('#');
  let bestSegment = '';

  for (const segment of segments) {
    if (segment.length > bestSegment.length && /[A-Z]/.test(segment)) {
      bestSegment = segment;
    }
  }

  if (bestSegment.length < 2) return null;

  // Convert _ to . for regex
  const regexStr = '^' + bestSegment.replace(/_/g, '.') + '$';
  return new RegExp(regexStr, 'i');
}

/**
 * Find words matching a pattern
 * Pattern uses _ for unknown letters, # for black cells
 * Examples:
 *   "A__AH" matches "ALLAH"
 *   "_U_A" matches "MUSA", "DUNA"
 */
export function findMatchingWords(
  pattern: string,
  limit: number = 10
): WordSuggestion[] {
  if (!pattern || pattern.length < 2) return [];

  // Don't suggest if pattern has no letters at all
  if (!/[A-Z]/i.test(pattern)) return [];

  // Extract the word portion (before any #)
  const wordPart = pattern.split('#')[0];
  if (wordPart.length < 2) return [];

  const regex = patternToRegex(pattern);
  if (!regex) return [];

  const candidates = WORDS_BY_LENGTH.get(wordPart.length) || [];
  const matches: WordSuggestion[] = [];

  for (const word of candidates) {
    if (regex.test(word.word)) {
      matches.push(word);
    }
  }

  // Sort by: Islamic words first, then by score
  matches.sort((a, b) => {
    if (a.isIslamic !== b.isIslamic) {
      return a.isIslamic ? -1 : 1;
    }
    return b.score - a.score;
  });

  return matches.slice(0, limit);
}

/**
 * Find words that can fill a specific slot
 * Considers existing letters and constraints
 */
export function findWordsForSlot(
  existingLetters: (string | null)[],
  slotLength: number,
  limit: number = 10
): WordSuggestion[] {
  if (slotLength < 2 || slotLength > 5) return [];

  // Build pattern from existing letters
  let pattern = '';
  for (let i = 0; i < slotLength; i++) {
    pattern += existingLetters[i] || '_';
  }

  return findMatchingWords(pattern, limit);
}

/**
 * Get suggestions for a row or column pattern
 * Returns empty array if pattern has no constraints or is all filled
 */
export function getSuggestionsForPattern(
  pattern: string,
  limit: number = 10
): WordSuggestion[] {
  // Skip if pattern is all _ (no constraints) or all letters (already complete)
  const hasLetter = /[A-Z]/i.test(pattern);
  const hasUnknown = pattern.includes('_');

  if (!hasLetter || !hasUnknown) {
    return [];
  }

  return findMatchingWords(pattern, limit);
}

/**
 * Score how well a word fits a pattern (for ranking)
 * Higher score = better fit
 */
export function scoreWordFit(word: string, pattern: string): number {
  if (word.length !== pattern.replace(/#/g, '').length) return 0;

  let score = 100;
  const patternChars = pattern.replace(/#.*/, ''); // Take portion before any #

  for (let i = 0; i < patternChars.length; i++) {
    if (patternChars[i] === '_') continue;
    if (patternChars[i].toUpperCase() === word[i]?.toUpperCase()) {
      score += 10; // Bonus for each matching letter
    } else {
      return 0; // Mismatch
    }
  }

  return score;
}

/**
 * Get all available words (for keyword selection)
 */
export function getAllWords(): WordSuggestion[] {
  const all: WordSuggestion[] = [];
  for (const words of WORDS_BY_LENGTH.values()) {
    all.push(...words);
  }
  return all.sort((a, b) => b.score - a.score);
}
