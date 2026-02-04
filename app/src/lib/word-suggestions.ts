/**
 * Word Suggestions for Custom Word Flow
 *
 * Finds Islamic words that share letters with the user's custom words,
 * ranked by connectivity potential (shared letters = better intersection potential).
 */

import { ISLAMIC_WORDS_SET } from './word-list-full';
import { ISLAMIC_FILLER_WORDS } from './word-index';

export interface SuggestedWord {
  word: string;
  sharedLetters: number;
}

/**
 * Find Islamic words that share letters with the given custom words.
 * Results are sorted by shared letter count (descending), then alphabetically.
 *
 * @param customWords Array of user's custom words (uppercase)
 * @param maxResults Maximum number of suggestions to return
 * @returns Array of suggested words with shared letter counts
 */
export function getSuggestedWords(
  customWords: string[],
  maxResults: number = 12
): SuggestedWord[] {
  if (customWords.length === 0) return [];

  // Collect unique letters from all custom words
  const customLetters = new Set<string>();
  for (const word of customWords) {
    for (const letter of word.toUpperCase()) {
      customLetters.add(letter);
    }
  }

  const customWordSet = new Set(customWords.map(w => w.toUpperCase()));
  const candidates: SuggestedWord[] = [];

  // Check both Islamic word sources
  const allIslamicWords = new Set<string>();
  for (const word of ISLAMIC_WORDS_SET) {
    allIslamicWords.add(word.toUpperCase());
  }
  for (const word of ISLAMIC_FILLER_WORDS) {
    allIslamicWords.add(word.toUpperCase());
  }

  for (const word of allIslamicWords) {
    // Skip words already in custom list
    if (customWordSet.has(word)) continue;

    // Only suggest 2-5 letter words (5x5 grid constraint)
    if (word.length < 2 || word.length > 5) continue;

    // Count shared letters
    let sharedLetters = 0;
    const counted = new Set<string>();
    for (const letter of word) {
      if (customLetters.has(letter) && !counted.has(letter)) {
        sharedLetters++;
        counted.add(letter);
      }
    }

    if (sharedLetters > 0) {
      candidates.push({ word, sharedLetters });
    }
  }

  // Sort by shared letters (descending), then alphabetically
  candidates.sort((a, b) => {
    if (b.sharedLetters !== a.sharedLetters) return b.sharedLetters - a.sharedLetters;
    return a.word.localeCompare(b.word);
  });

  return candidates.slice(0, maxResults);
}
