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
  BOOSTED_THEME: 150,    // Prophet-specific keywords (highest priority)
  ISLAMIC_KEYWORD: 100,  // Prophet names, Names of Allah, Quran terms
  ISLAMIC_FILLER: 70,    // PEACE, LIGHT, FAITH, etc.
  COMMON_ENGLISH: 40,    // Standard crossword words
  RARE_ENGLISH: 20,      // Less common but valid
  CROSSWORDESE: 10,      // EEL, QUA, etc. - last resort
} as const;

/**
 * Letter friendliness scores (0-100) based on crossword letter frequency.
 * Higher = easier to find perpendicular words containing this letter.
 */
export const LETTER_FRIENDLINESS: Record<string, number> = {
  // Tier 1: Very friendly (most common in crosswords)
  'E': 100, 'A': 95, 'R': 90, 'I': 88, 'O': 85, 'T': 82, 'N': 80, 'S': 78,
  // Tier 2: Friendly
  'L': 70, 'C': 65, 'U': 62, 'D': 60, 'P': 58, 'M': 55, 'H': 52,
  // Tier 3: Moderate
  'G': 45, 'B': 42, 'F': 40, 'Y': 38, 'W': 35, 'K': 32, 'V': 30,
  // Tier 4: Difficult (rare letters)
  'X': 15, 'Z': 12, 'J': 10, 'Q': 5,
};

/**
 * Calculate word friendliness score (0-100).
 * Higher = easier to find perpendicular words.
 * Middle letters weighted more heavily (they create more constraints).
 */
export function calculateWordFriendliness(word: string): number {
  const upper = word.toUpperCase();
  const len = upper.length;
  if (len === 0) return 0;

  let totalScore = 0;
  let totalWeight = 0;

  for (let i = 0; i < len; i++) {
    const letter = upper[i];
    const letterScore = LETTER_FRIENDLINESS[letter] ?? 30;

    // Weight middle positions higher (0.6 at edges, 1.0 at center)
    const distFromCenter = Math.abs(i - (len - 1) / 2);
    const maxDist = (len - 1) / 2 || 1;
    const weight = 1.0 - (distFromCenter / maxDist) * 0.4;

    totalScore += letterScore * weight;
    totalWeight += weight;
  }

  return totalScore / totalWeight;
}

/** Islamic filler words (themed for Islamic crosswords) */
export const ISLAMIC_FILLER_WORDS = new Set([
  // Original set
  'PEACE', 'LIGHT', 'TRUTH', 'FAITH', 'GRACE', 'MERCY', 'HOPE', 'LOVE',
  'WISE', 'JUST', 'PURE', 'SOUL', 'GOOD', 'KIND', 'PRAY', 'FAST', 'GIVE',
  'READ', 'SEEK', 'PATH', 'GUIDE', 'BLESS', 'NOBLE', 'TRUST', 'GLORY',
  'ANGEL', 'EARTH', 'WATER', 'NIGHT', 'DREAM', 'HEART', 'HONOR', 'MORAL',
  // Expanded set - thematically appropriate words
  'GIFT', 'KING', 'PALM', 'STAR', 'DAWN', 'MOON', 'CALM', 'REST',
  'SAFE', 'HEAL', 'HELP', 'CARE', 'WARM', 'DEAR', 'BEST', 'LIFE',
  'HOME', 'FREE', 'RISE', 'GROW', 'LEAD', 'CALL', 'WALK', 'KEEP',
  'HOLD', 'FIRM', 'TRUE', 'WILL', 'DUTY', 'OBEY', 'SAVE', 'STAY',
  'OPEN', 'SIGN', 'WORD', 'BOOK', 'LAND', 'EAST', 'WEST', 'RAIN',
  'TREE', 'SEED', 'FOOD', 'GOLD', 'RICH', 'POOR', 'LAMB', 'BIRD',
  'LORD', 'CITY', 'GATE', 'WORK', 'MADE', 'SENT', 'TOLD', 'KNEW',
  'CAME', 'WENT', 'SAID', 'HEAR', 'SEEN', 'KNOW', 'FEEL', 'BORN',
  // 2-letter acceptable fillers
  'GO', 'BE', 'DO', 'SO', 'AS', 'AT', 'BY', 'IF', 'IN', 'IS', 'IT',
  'MY', 'OF', 'ON', 'OR', 'TO', 'UP', 'WE', 'AN', 'AM', 'HE', 'ME',
  // 3-letter acceptable fillers
  'ALL', 'AND', 'ARE', 'BUT', 'CAN', 'DAY', 'DID', 'FOR', 'GOD', 'GOT',
  'HAS', 'HAD', 'HIM', 'HIS', 'HOW', 'ITS', 'LET', 'MAN', 'MEN', 'NEW',
  'NOT', 'NOW', 'OLD', 'ONE', 'OUR', 'OUT', 'OWN', 'SAW', 'SAY', 'SHE',
  'SUN', 'THE', 'TWO', 'WAY', 'WHO', 'WHY', 'YET', 'YOU', 'SEA', 'SKY',
  'JOY', 'SON', 'END', 'SET', 'RUN', 'TEN', 'SIX', 'BOW', 'VOW', 'ROW',
]);

/** Common crosswordese (valid but less desirable) */
const CROSSWORDESE = new Set([
  'QUA', 'EEL', 'EMU', 'ERE', 'ERR', 'ESS', 'ETA', 'EVE', 'EWE',
  'GNU', 'OAT', 'ODE', 'OLE', 'ORE', 'OWE', 'OWL', 'UNO', 'URN',
  'ALOE', 'ALEE', 'ARIA', 'ASEA', 'EPEE', 'ERNE', 'ESNE', 'OLEO',
]);

/**
 * BLOCKED WORDS - Haram/inappropriate words that should NEVER appear
 * in an Islamic crossword puzzle. These are filtered out during index building.
 */
const BLOCKED_WORDS = new Set([
  // Alcohol-related
  'BEER', 'BEERS', 'WINE', 'WINES', 'VODKA', 'RUM', 'GIN', 'ALE', 'ALES',
  'BREW', 'BREWS', 'DRUNK', 'BOOZE', 'BAR', 'BARS', 'PUB', 'PUBS',
  'LIQUOR', 'WHISKY', 'BRANDY', 'CIDER', 'MEAD', 'LAGER', 'STOUT',
  'TIPSY', 'WINO', 'WINOS', 'SOT', 'SOTS', 'GROG',

  // Pork-related
  'PORK', 'HAM', 'HAMS', 'BACON', 'PIG', 'PIGS', 'SWINE', 'HOG', 'HOGS',
  'PIGGY', 'BOAR', 'BOARS', 'SOW', 'SOWS', 'LARD',

  // Gambling-related
  'BET', 'BETS', 'WAGER', 'GAMBLE', 'CASINO', 'POKER', 'SLOTS', 'SLOT',
  'ROULETTE', 'BINGO', 'LOTTO', 'CRAPS',

  // Idolatry
  'IDOL', 'IDOLS',

  // Profanity/vulgar (common crossword traps)
  'DAMN', 'DAMNS', 'CRAP', 'HELL', 'ASS', 'ASSES',

  // Other inappropriate for Islamic context
  'NUDE', 'NUDES', 'NAKED', 'SEXY', 'STRIPPER',
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
 * Check if a word is blocked (haram/inappropriate for Islamic crosswords).
 */
export function isBlockedWord(word: string): boolean {
  return BLOCKED_WORDS.has(word.toUpperCase().trim());
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
    if (BLOCKED_WORDS.has(upper)) continue; // Skip haram/inappropriate words

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
 * Get the tier for a word based on its score.
 * Tier 0 = Boosted theme words (highest priority)
 * Tier 1 = Islamic keywords
 * Tier 2 = Islamic filler words
 * Tier 3 = Common English (lowest priority)
 */
export function getWordTier(word: string, index: WordIndex): number {
  const score = index.wordScores.get(word.toUpperCase()) ?? WORD_SCORE.COMMON_ENGLISH;
  if (score >= WORD_SCORE.BOOSTED_THEME) return 0;
  if (score >= WORD_SCORE.ISLAMIC_KEYWORD) return 1;
  if (score >= WORD_SCORE.ISLAMIC_FILLER) return 2;
  return 3;
}

/**
 * Find all words matching a pattern, sorted by tier then score.
 * This ensures we exhaust all Islamic options before trying English words.
 *
 * Returns words in priority order:
 * 1. All boosted theme words (sorted by score)
 * 2. All Islamic keywords (sorted by score)
 * 3. All Islamic filler words (sorted by score)
 * 4. All common English words (sorted by score)
 */
export function matchPatternByTier(pattern: string, index: WordIndex): string[] {
  const matches = matchPattern(pattern, index);

  // Group by tier
  const tier0: string[] = []; // Boosted theme
  const tier1: string[] = []; // Islamic keywords
  const tier2: string[] = []; // Islamic filler
  const tier3: string[] = []; // Common English

  for (const word of matches) {
    const tier = getWordTier(word, index);
    if (tier === 0) tier0.push(word);
    else if (tier === 1) tier1.push(word);
    else if (tier === 2) tier2.push(word);
    else tier3.push(word);
  }

  // Sort each tier by score (descending), then alphabetically
  const sortByScore = (a: string, b: string) => {
    const scoreA = index.wordScores.get(a) ?? WORD_SCORE.COMMON_ENGLISH;
    const scoreB = index.wordScores.get(b) ?? WORD_SCORE.COMMON_ENGLISH;
    if (scoreB !== scoreA) return scoreB - scoreA;
    return a.localeCompare(b);
  };

  tier0.sort(sortByScore);
  tier1.sort(sortByScore);
  tier2.sort(sortByScore);
  tier3.sort(sortByScore);

  // Concatenate in tier order
  return [...tier0, ...tier1, ...tier2, ...tier3];
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

  // Add boosted words with maximum priority (skip blocked words)
  for (const word of boostedWords) {
    const upper = word.toUpperCase().trim();
    if (upper.length >= 2 && upper.length <= 5 && !BLOCKED_WORDS.has(upper)) {
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
