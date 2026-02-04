/**
 * Puzzle Explorer Helper Functions
 *
 * Types and generation logic for the /puzzle-explorer page that generates
 * puzzles for all 25 prophets and ranks them by mastery.
 */

import { GenerationResult } from './auto-generator';
import {
  PROPHET_KEYWORDS,
  PROPHET_IDS,
  getKeywordsForProphet,
  getProphetDisplayName,
  ProphetKeyword,
} from './prophet-keywords';
import {
  processKeywords,
  findBestGenerationResult,
} from './puzzle-helpers';

export interface ProphetPuzzleResult {
  prophetId: string;
  displayName: string;
  arabicName?: string;
  status: 'pending' | 'generating' | 'success' | 'failed';
  result: GenerationResult | null;
  keywordsUsed: ProphetKeyword[];
  keywordsTotal: number;
  generationTimeMs: number;
}

export interface ExplorerSummary {
  totalProphets: number;
  completed: number;
  failed: number;
  avgThemeWords: number;
  avgIslamicPct: number;
  bestProphet: string | null;
  worstProphet: string | null;
}

/**
 * Create the initial pending result for a prophet.
 */
export function createPendingResult(prophetId: string): ProphetPuzzleResult {
  const data = PROPHET_KEYWORDS[prophetId];
  const keywords = getKeywordsForProphet(prophetId);
  return {
    prophetId,
    displayName: data?.displayName || prophetId,
    arabicName: data?.arabicName,
    status: 'pending',
    result: null,
    keywordsUsed: [],
    keywordsTotal: keywords.length,
    generationTimeMs: 0,
  };
}

/**
 * Generate a puzzle for a single prophet.
 * Reuses processKeywords + findBestGenerationResult from puzzle-helpers.
 */
export function generateForProphet(prophetId: string): ProphetPuzzleResult {
  const data = PROPHET_KEYWORDS[prophetId];
  const keywords = getKeywordsForProphet(prophetId);

  const base: ProphetPuzzleResult = {
    prophetId,
    displayName: data?.displayName || prophetId,
    arabicName: data?.arabicName,
    status: 'generating',
    result: null,
    keywordsUsed: keywords,
    keywordsTotal: keywords.length,
    generationTimeMs: 0,
  };

  if (keywords.length === 0) {
    return { ...base, status: 'failed' };
  }

  const start = performance.now();

  const processed = processKeywords(keywords, false);
  if (!processed) {
    return { ...base, status: 'failed', generationTimeMs: performance.now() - start };
  }

  const { validKeywords, boostedIndex } = processed;

  const result = findBestGenerationResult(
    validKeywords,
    boostedIndex,
    new Set<string>(), // no previous words to avoid
    5, // 5 attempts per prophet
    0 // accept any result
  );

  const elapsed = performance.now() - start;

  if (!result) {
    return { ...base, status: 'failed', generationTimeMs: elapsed };
  }

  // Count how many keywords were placed
  const placedWordSet = new Set(result.placedWords.map(pw => pw.word.toUpperCase()));
  const usedKeywords = keywords.filter(kw => placedWordSet.has(kw.word.toUpperCase()));

  return {
    ...base,
    status: result.success ? 'success' : 'failed',
    result,
    keywordsUsed: usedKeywords,
    generationTimeMs: elapsed,
  };
}

/**
 * Calculate aggregate summary stats from all results.
 */
export function calculateSummary(results: ProphetPuzzleResult[]): ExplorerSummary {
  const completed = results.filter(r => r.status === 'success');
  const failed = results.filter(r => r.status === 'failed');

  if (completed.length === 0) {
    return {
      totalProphets: results.length,
      completed: 0,
      failed: failed.length,
      avgThemeWords: 0,
      avgIslamicPct: 0,
      bestProphet: null,
      worstProphet: null,
    };
  }

  const themeWordCounts = completed.map(r => r.result?.stats.themeWordsPlaced || 0);
  const islamicPcts = completed.map(r => r.result?.stats.islamicPercentage || 0);

  const avgThemeWords = themeWordCounts.reduce((a, b) => a + b, 0) / completed.length;
  const avgIslamicPct = islamicPcts.reduce((a, b) => a + b, 0) / completed.length;

  // Best = most theme words placed
  const sorted = [...completed].sort(
    (a, b) => (b.result?.stats.themeWordsPlaced || 0) - (a.result?.stats.themeWordsPlaced || 0)
  );
  const bestProphet = sorted[0]?.displayName || null;
  const worstProphet = sorted[sorted.length - 1]?.displayName || null;

  return {
    totalProphets: results.length,
    completed: completed.length,
    failed: failed.length,
    avgThemeWords: Math.round(avgThemeWords * 10) / 10,
    avgIslamicPct: Math.round(avgIslamicPct * 10) / 10,
    bestProphet,
    worstProphet,
  };
}

/**
 * Sort results by the given criteria.
 */
export type SortOption = 'theme-words' | 'islamic-pct' | 'grid-fill';

export function sortResults(
  results: ProphetPuzzleResult[],
  sortBy: SortOption
): ProphetPuzzleResult[] {
  return [...results].sort((a, b) => {
    // Always put pending/generating at the end
    if (a.status === 'pending' || a.status === 'generating') return 1;
    if (b.status === 'pending' || b.status === 'generating') return -1;

    // Failed after success
    if (a.status === 'failed' && b.status === 'success') return 1;
    if (a.status === 'success' && b.status === 'failed') return -1;

    const aStats = a.result?.stats;
    const bStats = b.result?.stats;

    switch (sortBy) {
      case 'theme-words':
        return (bStats?.themeWordsPlaced || 0) - (aStats?.themeWordsPlaced || 0);
      case 'islamic-pct':
        return (bStats?.islamicPercentage || 0) - (aStats?.islamicPercentage || 0);
      case 'grid-fill':
        return (bStats?.gridFillPercentage || 0) - (aStats?.gridFillPercentage || 0);
      default:
        return 0;
    }
  });
}

export { PROPHET_IDS, getKeywordsForProphet, getProphetDisplayName };
