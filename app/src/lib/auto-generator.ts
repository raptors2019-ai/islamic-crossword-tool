/**
 * Automated Crossword Puzzle Generator
 *
 * Combines theme word placement with CSP-based gap filling to generate
 * complete, solvable 5x5 Islamic crossword puzzles.
 *
 * Flow:
 * 1. Place longest theme words first (seed placement)
 * 2. Place remaining theme words via intersection
 * 3. Optimize black square placement
 * 4. Fill remaining slots using CSP backtracking
 * 5. Validate and retry with different patterns if needed
 */

import {
  EditableCell,
  GRID_SIZE,
  createEmptyGrid,
  placeWord,
  applyBlackPattern,
  validateConnectivity,
  BLACK_SQUARE_PATTERNS,
  getGridStats,
} from './editable-grid';
import {
  fillGridWithCSP,
  canGridBeFilled,
  CSPFillResult,
} from './csp-filler';
import {
  checkArcConsistency,
  getAllSlots,
} from './perpendicular-validator';
import {
  WordIndex,
  getDefaultWordIndex,
  getScore,
  WORD_SCORE,
  ISLAMIC_FILLER_WORDS,
} from './word-index';
import { ISLAMIC_WORDS_SET } from './word-list-full';

/** Minimum Islamic percentage to consider "good enough" for early exit */
const EXCELLENT_ISLAMIC_PERCENTAGE = 70;

/** Number of candidate puzzles to generate before picking the best */
const MAX_CANDIDATES = 5;

/**
 * Theme word input
 */
export interface ThemeWord {
  word: string;
  clue: string;
  id?: string;
}

/**
 * Placed word result
 */
export interface PlacedWord {
  word: string;
  clue: string;
  row: number;
  col: number;
  direction: 'across' | 'down';
  isThemeWord: boolean;
}

/**
 * Generation result
 */
export interface GenerationResult {
  success: boolean;
  grid: EditableCell[][];
  placedWords: PlacedWord[];
  unplacedThemeWords: ThemeWord[];
  stats: {
    totalSlots: number;
    themeWordsPlaced: number;
    fillerWordsPlaced: number;
    islamicPercentage: number;
    avgWordScore: number;
    gridFillPercentage: number;
    timeTakenMs: number;
    attemptsUsed: number;
    patternUsed: string;
  };
}

/**
 * Generator options
 */
export interface GeneratorOptions {
  /** Maximum time in ms for the entire generation (default: 15000) */
  maxTimeMs?: number;
  /** Maximum attempts to try different patterns (default: 8) */
  maxAttempts?: number;
  /** Preferred black square pattern index (optional) */
  preferredPattern?: number;
  /** Word index to use (default: full dictionary) */
  wordIndex?: WordIndex;
}

/**
 * Find intersection between a word and existing letters in the grid
 */
function findIntersection(
  cells: EditableCell[][],
  word: string,
  wordIndex: WordIndex
): { row: number; col: number; direction: 'across' | 'down' } | null {
  const upperWord = word.toUpperCase();
  const results: {
    row: number;
    col: number;
    direction: 'across' | 'down';
    score: number;
  }[] = [];

  // For each letter in the word, look for matching letters in the grid
  for (let wi = 0; wi < upperWord.length; wi++) {
    const letter = upperWord[wi];

    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (cells[r][c].letter !== letter) continue;

        // Try across placement
        const acrossCol = c - wi;
        if (acrossCol >= 0 && acrossCol + upperWord.length <= GRID_SIZE) {
          if (canPlaceWord(cells, upperWord, r, acrossCol, 'across')) {
            // Check arc consistency
            if (checkArcConsistency(cells, upperWord, { row: r, col: acrossCol }, 'across', wordIndex)) {
              const score = scorePosition(cells, r, acrossCol, 'across', upperWord.length);
              results.push({ row: r, col: acrossCol, direction: 'across', score });
            }
          }
        }

        // Try down placement
        const downRow = r - wi;
        if (downRow >= 0 && downRow + upperWord.length <= GRID_SIZE) {
          if (canPlaceWord(cells, upperWord, downRow, c, 'down')) {
            if (checkArcConsistency(cells, upperWord, { row: downRow, col: c }, 'down', wordIndex)) {
              const score = scorePosition(cells, downRow, c, 'down', upperWord.length);
              results.push({ row: downRow, col: c, direction: 'down', score });
            }
          }
        }
      }
    }
  }

  if (results.length === 0) return null;

  // Return best position
  results.sort((a, b) => b.score - a.score);
  return results[0];
}

/**
 * Check if a word can be placed at a position
 */
function canPlaceWord(
  cells: EditableCell[][],
  word: string,
  row: number,
  col: number,
  direction: 'across' | 'down'
): boolean {
  for (let i = 0; i < word.length; i++) {
    const r = direction === 'down' ? row + i : row;
    const c = direction === 'across' ? col + i : col;

    if (r >= GRID_SIZE || c >= GRID_SIZE) return false;

    const cell = cells[r][c];
    if (cell.isBlack) return false;
    if (cell.letter && cell.letter !== word[i]) return false;
  }

  return true;
}

/**
 * Score a position for word placement
 */
function scorePosition(
  cells: EditableCell[][],
  row: number,
  col: number,
  direction: 'across' | 'down',
  length: number
): number {
  let score = 0;
  let intersections = 0;

  for (let i = 0; i < length; i++) {
    const r = direction === 'down' ? row + i : row;
    const c = direction === 'across' ? col + i : col;

    if (cells[r][c].letter) {
      intersections++;
    }
  }

  // Heavily reward intersections
  score += intersections * 100;

  // Reward central positions
  const centerR = direction === 'down' ? row + length / 2 : row;
  const centerC = direction === 'across' ? col + length / 2 : col;
  const distFromCenter = Math.abs(centerR - 2) + Math.abs(centerC - 2);
  score += (4 - distFromCenter) * 10;

  return score;
}

/**
 * Find an open position for the first word - CENTERED in the grid
 *
 * Centering the first word maximizes intersection opportunities because:
 * - Words can connect from above, below, left, and right
 * - More flexibility for placing subsequent theme words
 */
function findOpenPosition(
  cells: EditableCell[][],
  word: string,
  wordIndex: WordIndex,
  preferredDirection: 'across' | 'down' = 'across'
): { row: number; col: number; direction: 'across' | 'down' } | null {
  const upperWord = word.toUpperCase();
  const length = upperWord.length;

  if (length > GRID_SIZE) return null;

  // Calculate centered position
  // For a 5x5 grid, center is (2, 2)
  const centerRow = Math.floor(GRID_SIZE / 2);
  const centerCol = Math.floor(GRID_SIZE / 2);

  // Calculate starting position to center the word
  // For across: center the word horizontally on the middle row
  // For down: center the word vertically on the middle column
  const acrossStartCol = Math.max(0, Math.min(centerCol - Math.floor(length / 2), GRID_SIZE - length));
  const downStartRow = Math.max(0, Math.min(centerRow - Math.floor(length / 2), GRID_SIZE - length));

  // Try preferred direction first, centered
  if (preferredDirection === 'across') {
    // Try centered across first
    if (canPlaceWord(cells, upperWord, centerRow, acrossStartCol, 'across')) {
      if (checkArcConsistency(cells, upperWord, { row: centerRow, col: acrossStartCol }, 'across', wordIndex)) {
        return { row: centerRow, col: acrossStartCol, direction: 'across' };
      }
    }
    // Try centered down
    if (canPlaceWord(cells, upperWord, downStartRow, centerCol, 'down')) {
      if (checkArcConsistency(cells, upperWord, { row: downStartRow, col: centerCol }, 'down', wordIndex)) {
        return { row: downStartRow, col: centerCol, direction: 'down' };
      }
    }
  } else {
    // Try centered down first
    if (canPlaceWord(cells, upperWord, downStartRow, centerCol, 'down')) {
      if (checkArcConsistency(cells, upperWord, { row: downStartRow, col: centerCol }, 'down', wordIndex)) {
        return { row: downStartRow, col: centerCol, direction: 'down' };
      }
    }
    // Try centered across
    if (canPlaceWord(cells, upperWord, centerRow, acrossStartCol, 'across')) {
      if (checkArcConsistency(cells, upperWord, { row: centerRow, col: acrossStartCol }, 'across', wordIndex)) {
        return { row: centerRow, col: acrossStartCol, direction: 'across' };
      }
    }
  }

  // If centered positions don't work, try positions radiating outward from center
  // This keeps words as central as possible
  const positions: { row: number; col: number; direction: 'across' | 'down'; dist: number }[] = [];

  for (let r = 0; r <= GRID_SIZE - length; r++) {
    for (let c = 0; c <= GRID_SIZE - length; c++) {
      // Calculate distance from center for this position
      const acrossDist = Math.abs(r - centerRow) + Math.abs(c + length / 2 - centerCol);
      const downDist = Math.abs(r + length / 2 - centerRow) + Math.abs(c - centerCol);

      if (canPlaceWord(cells, upperWord, r, c, 'across')) {
        if (checkArcConsistency(cells, upperWord, { row: r, col: c }, 'across', wordIndex)) {
          positions.push({ row: r, col: c, direction: 'across', dist: acrossDist });
        }
      }
      if (canPlaceWord(cells, upperWord, r, c, 'down')) {
        if (checkArcConsistency(cells, upperWord, { row: r, col: c }, 'down', wordIndex)) {
          positions.push({ row: r, col: c, direction: 'down', dist: downDist });
        }
      }
    }
  }

  if (positions.length === 0) return null;

  // Sort by distance from center (closest first)
  positions.sort((a, b) => a.dist - b.dist);
  return positions[0];
}

/**
 * Place theme words in the grid with improved strategy:
 * 1. First word is centered (across or down based on length)
 * 2. Subsequent words alternate directions when possible
 * 3. Prioritize placements that leave room for more intersections
 */
function placeThemeWords(
  cells: EditableCell[][],
  themeWords: ThemeWord[],
  wordIndex: WordIndex
): { grid: EditableCell[][]; placed: PlacedWord[]; unplaced: ThemeWord[] } {
  // Sort by length (longest first) - longer words are harder to place
  const sortedWords = [...themeWords].sort(
    (a, b) => b.word.length - a.word.length
  );

  let grid = cells.map((row) => row.map((cell) => ({ ...cell })));
  const placed: PlacedWord[] = [];
  const unplaced: ThemeWord[] = [];

  // Track direction balance
  let acrossCount = 0;
  let downCount = 0;

  for (const themeWord of sortedWords) {
    const word = themeWord.word.toUpperCase();

    // Skip words that are too long
    if (word.length > GRID_SIZE) {
      unplaced.push(themeWord);
      continue;
    }

    let position: { row: number; col: number; direction: 'across' | 'down' } | null = null;

    // Determine preferred direction (alternate to maximize intersections)
    const preferDirection: 'across' | 'down' = acrossCount <= downCount ? 'across' : 'down';

    // First word: find centered open position
    if (placed.length === 0) {
      // For first word, prefer across if it's a 5-letter word (spans full row)
      // Otherwise prefer down to leave horizontal space for intersections
      const firstWordPrefer = word.length === 5 ? 'across' : preferDirection;
      position = findOpenPosition(grid, word, wordIndex, firstWordPrefer);
    } else {
      // Try to find intersection with existing words
      // findIntersection already scores by intersections and centrality
      position = findIntersection(grid, word, wordIndex);

      // If no intersection found, try placing near the center anyway
      // This can still connect via CSP filling later
      if (!position) {
        position = findOpenPosition(grid, word, wordIndex, preferDirection);
      }
    }

    if (position) {
      const newGrid = placeWord(
        grid,
        word,
        position.row,
        position.col,
        position.direction,
        'auto',
        true
      );

      if (newGrid) {
        grid = newGrid;
        placed.push({
          word,
          clue: themeWord.clue,
          row: position.row,
          col: position.col,
          direction: position.direction,
          isThemeWord: true,
        });
        // Update direction counts
        if (position.direction === 'across') acrossCount++;
        else downCount++;
      } else {
        unplaced.push(themeWord);
      }
    } else {
      unplaced.push(themeWord);
    }
  }

  return { grid, placed, unplaced };
}

/**
 * Try to generate a complete puzzle with a specific black square pattern
 */
function tryGenerateWithPattern(
  themeWords: ThemeWord[],
  patternIndex: number,
  wordIndex: WordIndex,
  maxTimeMs: number
): GenerationResult | null {
  const startTime = Date.now();

  // Create grid with pattern
  let grid = createEmptyGrid();
  grid = applyBlackPattern(grid, patternIndex);

  // Check connectivity
  if (!validateConnectivity(grid)) {
    return null;
  }

  // Place theme words
  const { grid: themedGrid, placed: themeWordsPlaced, unplaced } = placeThemeWords(
    grid,
    themeWords,
    wordIndex
  );

  // Fill remaining slots with CSP
  const remainingTime = maxTimeMs - (Date.now() - startTime);
  if (remainingTime <= 0) {
    return null;
  }

  // Collect theme words that were placed to prevent duplicates
  const placedThemeWordSet = new Set(themeWordsPlaced.map(pw => pw.word.toUpperCase()));

  const cspResult = fillGridWithCSP(themedGrid, wordIndex, remainingTime, placedThemeWordSet);

  if (!cspResult.success) {
    return null;
  }

  // Combine placed words
  const fillerWords: PlacedWord[] = cspResult.placedWords.map((pw) => ({
    word: pw.word,
    clue: '', // Filler words don't have clues yet
    row: pw.slot.start.row,
    col: pw.slot.start.col,
    direction: pw.slot.direction,
    isThemeWord: false,
  }));

  // Calculate stats
  const allWords = [...themeWordsPlaced, ...fillerWords];
  let islamicCount = 0;
  let totalScore = 0;

  for (const pw of allWords) {
    const upperWord = pw.word.toUpperCase();
    const score = getScore(upperWord, wordIndex);
    totalScore += score;
    // Count both core Islamic words and Islamic filler words as "Islamic"
    if (ISLAMIC_WORDS_SET.has(upperWord) || ISLAMIC_FILLER_WORDS.has(upperWord)) {
      islamicCount++;
    }
  }

  const gridStats = getGridStats(cspResult.grid);

  return {
    success: true,
    grid: cspResult.grid,
    placedWords: allWords,
    unplacedThemeWords: unplaced,
    stats: {
      totalSlots: cspResult.stats.totalSlots,
      themeWordsPlaced: themeWordsPlaced.length,
      fillerWordsPlaced: fillerWords.length,
      islamicPercentage: allWords.length > 0 ? (islamicCount / allWords.length) * 100 : 0,
      avgWordScore: allWords.length > 0 ? totalScore / allWords.length : 0,
      gridFillPercentage: gridStats.whiteCells > 0
        ? (gridStats.filledCells / gridStats.whiteCells) * 100
        : 0,
      timeTakenMs: Date.now() - startTime,
      attemptsUsed: 1,
      patternUsed: BLACK_SQUARE_PATTERNS[patternIndex].name,
    },
  };
}

/**
 * Main entry point: Generate a complete crossword puzzle
 *
 * Uses multi-candidate selection to maximize Islamic word percentage:
 * 1. Generate up to MAX_CANDIDATES successful puzzles using different patterns
 * 2. Score each by Islamic word percentage
 * 3. Return the candidate with highest Islamic %
 * 4. Early-exit if we hit EXCELLENT_ISLAMIC_PERCENTAGE (70%+)
 *
 * @param themeWords The Islamic theme words to place
 * @param options Generation options
 * @returns Generation result with complete grid or best partial result
 */
export function generatePuzzle(
  themeWords: ThemeWord[],
  options: GeneratorOptions = {}
): GenerationResult {
  const startTime = Date.now();
  const maxTimeMs = options.maxTimeMs ?? 15000;
  const maxAttempts = options.maxAttempts ?? BLACK_SQUARE_PATTERNS.length;
  const wordIndex = options.wordIndex ?? getDefaultWordIndex();

  // Collect successful candidates to pick the best one
  const successfulCandidates: GenerationResult[] = [];
  let bestPartialResult: GenerationResult | null = null;
  let attempts = 0;

  // If preferred pattern specified, try it first
  const patternsToTry = options.preferredPattern !== undefined
    ? [
        options.preferredPattern,
        ...Array.from({ length: BLACK_SQUARE_PATTERNS.length }, (_, i) => i).filter(
          (i) => i !== options.preferredPattern
        ),
      ]
    : Array.from({ length: BLACK_SQUARE_PATTERNS.length }, (_, i) => i);

  for (const patternIndex of patternsToTry) {
    if (attempts >= maxAttempts) break;
    if (Date.now() - startTime > maxTimeMs) break;

    // Stop collecting if we have enough good candidates
    if (successfulCandidates.length >= MAX_CANDIDATES) break;

    attempts++;

    const remainingTime = maxTimeMs - (Date.now() - startTime);
    // Divide time more evenly across attempts to allow for multiple candidates
    const timePerAttempt = Math.max(remainingTime / (MAX_CANDIDATES - successfulCandidates.length + 1), 1000);

    const result = tryGenerateWithPattern(
      themeWords,
      patternIndex,
      wordIndex,
      timePerAttempt
    );

    if (result) {
      result.stats.attemptsUsed = attempts;

      if (result.success) {
        successfulCandidates.push(result);

        // Early exit if we found an excellent result
        if (result.stats.islamicPercentage >= EXCELLENT_ISLAMIC_PERCENTAGE) {
          result.stats.timeTakenMs = Date.now() - startTime;
          return result;
        }
      } else {
        // Track best partial result as fallback
        if (!bestPartialResult || result.stats.gridFillPercentage > bestPartialResult.stats.gridFillPercentage) {
          bestPartialResult = result;
        }
      }
    }
  }

  // Pick the best successful candidate by Islamic percentage
  if (successfulCandidates.length > 0) {
    // Sort by Islamic percentage (highest first), then by word score
    successfulCandidates.sort((a, b) => {
      if (b.stats.islamicPercentage !== a.stats.islamicPercentage) {
        return b.stats.islamicPercentage - a.stats.islamicPercentage;
      }
      return b.stats.avgWordScore - a.stats.avgWordScore;
    });

    const best = successfulCandidates[0];
    best.stats.attemptsUsed = attempts;
    best.stats.timeTakenMs = Date.now() - startTime;
    return best;
  }

  // Return best partial result or failure
  if (bestPartialResult) {
    bestPartialResult.stats.attemptsUsed = attempts;
    bestPartialResult.stats.timeTakenMs = Date.now() - startTime;
    return bestPartialResult;
  }

  // Complete failure
  return {
    success: false,
    grid: createEmptyGrid(),
    placedWords: [],
    unplacedThemeWords: themeWords,
    stats: {
      totalSlots: 0,
      themeWordsPlaced: 0,
      fillerWordsPlaced: 0,
      islamicPercentage: 0,
      avgWordScore: 0,
      gridFillPercentage: 0,
      timeTakenMs: Date.now() - startTime,
      attemptsUsed: attempts,
      patternUsed: 'none',
    },
  };
}

/**
 * Auto-complete the current grid by filling remaining slots
 *
 * @param cells Current grid state with some words already placed
 * @param options Generation options
 * @returns CSP fill result
 */
export function autoCompleteGrid(
  cells: EditableCell[][],
  options: GeneratorOptions = {}
): CSPFillResult {
  const wordIndex = options.wordIndex ?? getDefaultWordIndex();
  const maxTimeMs = options.maxTimeMs ?? 15000;

  return fillGridWithCSP(cells, wordIndex, maxTimeMs);
}

/**
 * Check if the current grid can be completed
 */
export function canCompleteGrid(
  cells: EditableCell[][],
  wordIndex?: WordIndex
): { canComplete: boolean; problematicSlots: string[] } {
  const index = wordIndex ?? getDefaultWordIndex();
  const result = canGridBeFilled(cells, index);

  return {
    canComplete: result.canFill,
    problematicSlots: result.problematicSlots.map(
      (s) => `${s.direction} at (${s.start.row + 1}, ${s.start.col + 1}): ${s.pattern}`
    ),
  };
}
