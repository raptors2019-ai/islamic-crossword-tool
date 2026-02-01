/**
 * Puzzle Generation Helper Functions
 *
 * Extracted from page.tsx to reduce duplication and improve maintainability.
 */

import { ThemeWord } from './types';
import { ProphetKeyword } from './prophet-keywords';
import { buildBoostedWordIndex, WordIndex } from './word-index';
import { GenerationResult, generatePuzzle as generateAutoPuzzle } from './auto-generator';

/**
 * Fisher-Yates shuffle algorithm for arrays.
 * Moved outside component to avoid recreation on each render.
 */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Result of processing keywords for puzzle generation
 */
export interface KeywordProcessingResult {
  validKeywords: ProphetKeyword[];
  keywordWords: string[];
  boostedIndex: WordIndex;
  clueMap: Map<string, string>;
}

/**
 * Process keywords for puzzle generation.
 * Filters to valid lengths, optionally shuffles or sorts, and builds index.
 *
 * @param keywords Raw keywords from prophet data
 * @param shuffle Whether to shuffle (for regeneration) or sort by relevance
 * @returns Processed keywords or null if no valid keywords
 */
export function processKeywords(
  keywords: ProphetKeyword[],
  shuffle: boolean = false
): KeywordProcessingResult | null {
  let validKeywords = keywords.filter(
    kw => kw.word.length >= 2 && kw.word.length <= 5
  );

  if (validKeywords.length === 0) return null;

  if (shuffle) {
    validKeywords = shuffleArray(validKeywords);
  } else {
    validKeywords = validKeywords.sort((a, b) => b.relevance - a.relevance);
  }

  const keywordWords = validKeywords.map(kw => kw.word.toUpperCase());
  const boostedIndex = buildBoostedWordIndex(keywordWords);
  const clueMap = new Map(
    validKeywords.map(kw => [kw.word.toUpperCase(), kw.clue])
  );

  return { validKeywords, keywordWords, boostedIndex, clueMap };
}

/**
 * Result of processing placed words into theme words
 */
export interface ProcessedPlacedWords {
  themeWords: ThemeWord[];
  clues: Record<string, string>;
  placedIds: Set<string>;
}

/**
 * Convert placed words from generation result into theme words for state.
 *
 * @param placedWords Words placed by the generator
 * @param keywordSet Set of valid keyword strings (uppercase)
 * @param clueMap Map from word to clue
 * @param prophetId ID of the current prophet for unique IDs
 * @returns Processed theme words, clues, and placed IDs
 */
export function processPlacedWords(
  placedWords: GenerationResult['placedWords'],
  keywordSet: Set<string>,
  clueMap: Map<string, string>,
  prophetId: string
): ProcessedPlacedWords {
  const themeWords: ThemeWord[] = [];
  const clues: Record<string, string> = {};
  const placedIds = new Set<string>();
  const addedWords = new Set<string>();

  for (const placed of placedWords) {
    const isKeyword = keywordSet.has(placed.word);
    if (isKeyword && !addedWords.has(placed.word)) {
      addedWords.add(placed.word);
      const clue = clueMap.get(placed.word) || placed.clue || '';
      const id = `prophet-${prophetId}-${placed.word}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      themeWords.push({
        id,
        word: placed.word,
        clue,
        activeSpelling: placed.word,
        category: 'prophets',
      });
      clues[id] = clue;
      placedIds.add(id);
    }
  }

  return { themeWords, clues, placedIds };
}

/**
 * Score a generation result for comparison.
 * Higher scores are better.
 *
 * Priority: completeness (1000 points) > difference (0-100) > fill percentage (0-99)
 *
 * @param result Generation result to score
 * @param differencePercent How different this result is from previous (0-1)
 * @returns Numeric score for comparison
 */
export function scoreGenerationResult(
  result: GenerationResult,
  differencePercent: number
): number {
  const isComplete = result.success && result.stats.gridFillPercentage >= 99;
  const completenessScore = isComplete ? 1000 : 0;
  const differenceScore = differencePercent * 100;
  const fillScore = result.stats.gridFillPercentage;

  return completenessScore + differenceScore + fillScore;
}

/**
 * Calculate what percentage of words are different between two sets.
 *
 * @param newWords Set of words in new result
 * @param oldWords Set of words from previous result
 * @returns Percentage (0-1) of words that are different
 */
export function calculateDifferencePercent(
  newWords: Set<string>,
  oldWords: Set<string>
): number {
  if (oldWords.size === 0) return 1; // First generation is always "different"
  let differentCount = 0;
  for (const word of newWords) {
    if (!oldWords.has(word)) differentCount++;
  }
  return newWords.size > 0 ? differentCount / newWords.size : 0;
}

/**
 * Find the best generation result across multiple attempts.
 *
 * @param validKeywords Keywords to use for generation
 * @param boostedIndex Word index with boosted keywords
 * @param previousPuzzleWords Words from previous puzzle (for difference calculation)
 * @param maxAttempts Maximum number of attempts
 * @param minDifferentPercent Minimum difference to accept as "perfect"
 * @returns Best result found, or null if all attempts failed
 */
export function findBestGenerationResult(
  validKeywords: ProphetKeyword[],
  boostedIndex: WordIndex,
  previousPuzzleWords: Set<string>,
  maxAttempts: number,
  minDifferentPercent: number
): GenerationResult | null {
  let bestResult: GenerationResult | null = null;
  let bestScore = -1;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Shuffle keywords for variety
    const shuffledKeywords = shuffleArray(validKeywords);
    const themeWordsInput = shuffledKeywords.map(kw => ({
      word: kw.word.toUpperCase(),
      clue: kw.clue,
    }));

    // Random pattern for variety
    const generatorOptions = {
      maxTimeMs: 8000,
      wordIndex: boostedIndex,
      preferredPattern: Math.floor(Math.random() * 8),
    };

    const result = generateAutoPuzzle(themeWordsInput, generatorOptions);

    // Calculate metrics
    const resultWords = new Set(result.placedWords.map(pw => pw.word.toUpperCase()));
    const differencePercent = calculateDifferencePercent(resultWords, previousPuzzleWords);
    const isComplete = result.success && result.stats.gridFillPercentage >= 99;

    // Perfect result: complete grid with enough different words
    if (isComplete && differencePercent >= minDifferentPercent) {
      return result;
    }

    // Track best result by score
    const score = scoreGenerationResult(result, differencePercent);
    if (score > bestScore) {
      bestResult = result;
      bestScore = score;
    }
  }

  return bestResult;
}
