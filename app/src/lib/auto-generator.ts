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
  addSymmetricBlack,
  wouldBreakWord,
} from './editable-grid';
import {
  findBestKeywordAssignment,
  executePatternCandidate,
  PatternCandidate,
} from './keyword-slot-matcher';
import {
  fillGridWithCSP,
  fillGridWithBiasedCSP,
  canGridBeFilled,
  CSPFillResult,
  CSPSlot,
  getCSPSlots,
} from './csp-filler';
import {
  checkArcConsistency,
  checkRelaxedArcConsistency,
  RelaxedArcOptions,
  getAllSlots,
} from './perpendicular-validator';
import { detectWords } from './word-detector';
import {
  WordIndex,
  getDefaultWordIndex,
  getScore,
  WORD_SCORE,
  ISLAMIC_FILLER_WORDS,
  CONTEXTUALLY_ISLAMIC_WORDS,
  matchPattern,
} from './word-index';
import { ISLAMIC_WORDS_SET } from './word-list-full';

// ============================================================================
// Final Grid Validation
// ============================================================================

/**
 * Validate that ALL words in the grid are valid dictionary words.
 *
 * This is the final gate before returning a successful puzzle.
 * It catches invalid 2-letter combinations (like RT, SY, RU, TF)
 * that can be created when black squares split slots.
 *
 * @param cells The grid to validate
 * @returns Object with valid flag and list of invalid words
 */
export function validateAllWords(cells: EditableCell[][]): {
  valid: boolean;
  invalidWords: { word: string; row: number; col: number; direction: 'across' | 'down' }[];
} {
  const detectedWords = detectWords(cells);
  const invalidWords = detectedWords
    .filter(w => !w.isValid)
    .map(w => ({
      word: w.word,
      row: w.row,
      col: w.col,
      direction: w.direction,
    }));

  return {
    valid: invalidWords.length === 0,
    invalidWords,
  };
}

/**
 * Clear cells that are part of invalid words.
 *
 * When CSP times out or fails, it can leave garbage letters in the grid.
 * This function identifies invalid words and clears their non-theme cells
 * to ensure partial results don't contain invalid word fragments.
 *
 * @param cells The grid with potentially invalid words
 * @param invalidWords List of invalid words to clear
 * @param themeCells Optional set of theme word cells to preserve
 * @returns Grid with invalid word cells cleared
 */
export function clearInvalidCells(
  cells: EditableCell[][],
  invalidWords: { word: string; row: number; col: number; direction: 'across' | 'down' }[],
  themeCells?: Set<string>
): EditableCell[][] {
  const grid = cells.map(row => row.map(cell => ({ ...cell })));

  for (const invalid of invalidWords) {
    for (let i = 0; i < invalid.word.length; i++) {
      const r = invalid.direction === 'down' ? invalid.row + i : invalid.row;
      const c = invalid.direction === 'across' ? invalid.col + i : invalid.col;

      // Skip theme cells - don't clear those
      if (themeCells && themeCells.has(`${r}-${c}`)) continue;

      // Only clear auto-filled cells (not user-placed letters)
      if (grid[r][c].source === 'auto') {
        grid[r][c] = {
          ...grid[r][c],
          letter: '',
          source: 'empty',
        };
      }
    }
  }

  return grid;
}

// ============================================================================
// LEVER 1: Friendliest-First Keyword Scoring
// ============================================================================

/**
 * Letters that are easy to find perpendicular words for.
 * These are the most common letters in English crossword dictionaries.
 */
const FRIENDLY_LETTERS = new Set('AEIOSTRNL'.split(''));

/**
 * Letters that are hard to find perpendicular words for.
 * Words containing these will be placed last or skipped.
 */
const RARE_LETTERS = new Set('QJXZKFYWV'.split(''));

/**
 * Score a keyword by how "friendly" it is for crossword placement.
 * Higher scores = easier to place (should be placed first).
 *
 * Scoring:
 * - Base: length * 5 (slight preference for shorter words)
 * - +10 per friendly letter (A,E,I,O,S,T,R,N,L)
 * - -20 per rare letter (Q,J,X,Z,K,F,Y,W,V)
 *
 * Examples:
 * - DREAM: 5*5 + D(0) + R(+10) + E(+10) + A(+10) + M(0) = 55
 * - MANNA: 5*5 + M(0) + A(+10) + N(+10) + N(+10) + A(+10) = 65
 * - YUSUF: 5*5 + Y(-20) + U(0) + S(+10) + U(0) + F(-20) = -5
 */
export function scoreKeywordFriendliness(word: string): number {
  const upper = word.toUpperCase();
  let score = upper.length * 5; // Base score from length

  for (const letter of upper) {
    if (FRIENDLY_LETTERS.has(letter)) {
      score += 10;
    } else if (RARE_LETTERS.has(letter)) {
      score -= 20;
    }
    // Neutral letters (B, C, D, G, H, M, P, U) add 0
  }

  return score;
}

// ============================================================================
// LEVER 1 CONTINUED: Verify Completability
// ============================================================================

/**
 * Verify that a grid can still be completed (no dead-end slots).
 *
 * After placing a theme word, this function checks unfilled slots
 * to ensure they have valid word candidates. Uses a relaxed approach:
 * - Only fails if slots with 2+ letter constraints have zero candidates
 * - Single-letter constraints (like D____ from placing DREAM) are ignored
 *   since auto-blacks can break them later
 *
 * Progressive thresholds based on how many words are already placed:
 * - First 3 words: Skip verification (let them place freely)
 * - Words 3-5: Use 50% threshold (relaxed)
 * - Words 6+: Use 70% threshold (strict)
 *
 * @param cells The grid state to verify
 * @param wordIndex Word index for pattern matching
 * @param themeCells Set of cell keys (e.g., "2-3") that are part of theme words
 * @param placedCount Number of theme words already placed (for progressive thresholds)
 * @returns true if all significantly-constrained slots have candidates
 */
export function verifyCompletable(
  cells: EditableCell[][],
  wordIndex: WordIndex,
  themeCells: Set<string>,
  placedCount: number = 0
): boolean {
  // Skip verification for first 2 words - let them place freely
  // Early placements on nearly-empty grids often fail verification
  // even when the grid is still highly solvable
  if (placedCount < 2) return true;

  const slots = getAllSlots(cells);

  let slotsChecked = 0;
  let slotsWithCandidates = 0;
  let criticalSlotsFailed = 0;

  for (const slot of slots) {
    // Skip slots that are completely filled (all letters known)
    if (!slot.pattern.includes('_')) continue;

    // Count how many letters are constrained (not wildcards)
    const constrainedLetters = slot.pattern.split('').filter(c => c !== '_').length;

    // Check ALL constrained slots (including 1-letter constraints)
    // Even 1-letter constraints can make grids unsolvable (e.g., Q____ has few options)
    if (constrainedLetters === 0) continue;

    slotsChecked++;
    const candidates = matchPattern(slot.pattern, wordIndex);

    if (candidates.length > 0) {
      slotsWithCandidates++;
    } else {
      // Track critical failures (slots with 2+ constraints and 0 candidates)
      if (constrainedLetters >= 2) {
        criticalSlotsFailed++;
      }
    }
  }

  // If no constrained slots, allow the placement
  if (slotsChecked === 0) return true;

  // Immediately reject if any slot with 2+ constraints has 0 candidates
  // These are almost certainly unsolvable
  if (criticalSlotsFailed > 0) return false;

  // Progressive threshold: 60% for words 2-4, 80% for words 5+
  // Tighter thresholds catch more problems early
  const threshold = placedCount < 5 ? 0.6 : 0.8;
  const percentWithCandidates = slotsWithCandidates / slotsChecked;
  return percentWithCandidates >= threshold;
}

/**
 * Find all valid positions for placing a word in the grid.
 * Returns positions sorted by quality (intersections, centrality).
 */
export function findAllPositions(
  cells: EditableCell[][],
  word: string,
  wordIndex: WordIndex
): { row: number; col: number; direction: 'across' | 'down'; score: number }[] {
  const upperWord = word.toUpperCase();
  const length = upperWord.length;
  const results: { row: number; col: number; direction: 'across' | 'down'; score: number }[] = [];

  if (length > GRID_SIZE) return results;

  // Try all positions for across placement
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c <= GRID_SIZE - length; c++) {
      if (canPlaceWord(cells, upperWord, r, c, 'across')) {
        const score = scorePosition(cells, r, c, 'across', length);
        results.push({ row: r, col: c, direction: 'across', score });
      }
    }
  }

  // Try all positions for down placement
  for (let r = 0; r <= GRID_SIZE - length; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (canPlaceWord(cells, upperWord, r, c, 'down')) {
        const score = scorePosition(cells, r, c, 'down', length);
        results.push({ row: r, col: c, direction: 'down', score });
      }
    }
  }

  // Sort by score (highest first)
  results.sort((a, b) => b.score - a.score);

  return results;
}

// ============================================================================
// LEVER 2: Auto-Blacks for Orphan Slots
// ============================================================================

/**
 * Validate that adding a black square doesn't create invalid word fragments.
 *
 * When a black square is added, it can split existing slots into smaller words.
 * This function checks that any complete words (no empty cells) created by
 * the black square placement are valid dictionary words.
 *
 * @param cells Grid state after adding the black square
 * @param wordIndex Word index for validation
 * @returns true if all complete word fragments are valid
 */
function validateWordFragmentsAfterBlack(
  cells: EditableCell[][],
  wordIndex: WordIndex
): boolean {
  const words = detectWords(cells);

  // Check each complete word (no underscores in pattern)
  for (const word of words) {
    // Only validate complete words (all letters filled)
    // Skip words that still have empty cells - they'll be filled later by CSP
    if (word.word.includes('_')) continue;

    // Check if this word is valid
    if (!word.isValid) {
      return false;
    }
  }

  return true;
}

/**
 * Automatically add black squares to break orphan slots that have no valid candidates.
 *
 * When theme word placement creates slots with rare letters (like F??? from YUSUF),
 * this function adds strategic black squares to split those problematic slots
 * into smaller, fillable ones.
 *
 * Strategy:
 * 1. Find slots with 0 candidates
 * 2. For each orphan slot, find a cell that can be turned black
 * 3. Prefer middle positions to create two smaller valid slots
 * 4. Never black out theme word cells
 *
 * @param cells Current grid state
 * @param wordIndex Word index for validation
 * @param themeCells Cells that are part of theme words (cannot be blacked)
 * @param maxBlacks Maximum black squares to add (default 4)
 * @returns Updated grid with strategic black squares
 */
export function autoAddBlacks(
  cells: EditableCell[][],
  wordIndex: WordIndex,
  themeCells: Set<string>,
  maxBlacks: number = 4
): EditableCell[][] {
  let grid = cells.map(row => row.map(cell => ({ ...cell })));
  let blacksAdded = 0;
  let changed = true;

  while (changed && blacksAdded < maxBlacks) {
    changed = false;
    const slots = getAllSlots(grid);

    for (const slot of slots) {
      // Only process unfilled slots
      if (!slot.pattern.includes('_')) continue;

      const candidates = matchPattern(slot.pattern, wordIndex);

      // Skip slots that have valid words
      if (candidates.length > 0) continue;

      // Slot is orphaned - find a cell to turn black
      // Calculate cell positions for this slot
      const slotCells: { row: number; col: number; index: number }[] = [];
      for (let i = 0; i < slot.length; i++) {
        const r = slot.direction === 'down' ? slot.start.row + i : slot.start.row;
        const c = slot.direction === 'across' ? slot.start.col + i : slot.start.col;
        slotCells.push({ row: r, col: c, index: i });
      }

      // Prefer middle cells to create two smaller slots
      const midIndex = Math.floor(slot.length / 2);
      const cellOrder = [midIndex, midIndex - 1, midIndex + 1, 0, slot.length - 1]
        .filter(i => i >= 0 && i < slot.length);

      for (const i of cellOrder) {
        const cell = slotCells[i];
        const key = `${cell.row}-${cell.col}`;

        // Don't black out theme word cells
        if (themeCells.has(key)) continue;

        // Don't black out cells that already have letters from other words
        if (grid[cell.row][cell.col].letter) continue;

        // Test if adding black here maintains connectivity
        const testGrid = addSymmetricBlack(grid, cell.row, cell.col);
        if (!validateConnectivity(testGrid)) continue;

        // Validate that the black square doesn't create invalid word fragments
        // Check any complete words (no underscores) created by this black placement
        if (!validateWordFragmentsAfterBlack(testGrid, wordIndex)) continue;

        // Add black square (with symmetry)
        grid = testGrid;
        blacksAdded++;
        changed = true;
        break;
      }

      // If we made a change, restart slot scan
      if (changed) break;
    }
  }

  return grid;
}

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
 * Find intersections between a word and existing letters in the grid.
 * Returns multiple positions (top 5) sorted by quality score.
 *
 * This allows trying multiple positions if the first one fails verification,
 * increasing the chance of successfully placing theme words.
 */
function findIntersection(
  cells: EditableCell[][],
  word: string,
  wordIndex: WordIndex,
  relaxedOptions?: RelaxedArcOptions
): { row: number; col: number; direction: 'across' | 'down'; score: number }[] {
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
            // Check arc consistency (relaxed or strict)
            const arcCheck = relaxedOptions
              ? checkRelaxedArcConsistency(cells, upperWord, { row: r, col: acrossCol }, 'across', wordIndex, relaxedOptions)
              : checkArcConsistency(cells, upperWord, { row: r, col: acrossCol }, 'across', wordIndex);
            if (arcCheck) {
              const score = scorePosition(cells, r, acrossCol, 'across', upperWord.length);
              results.push({ row: r, col: acrossCol, direction: 'across', score });
            }
          }
        }

        // Try down placement
        const downRow = r - wi;
        if (downRow >= 0 && downRow + upperWord.length <= GRID_SIZE) {
          if (canPlaceWord(cells, upperWord, downRow, c, 'down')) {
            const arcCheck = relaxedOptions
              ? checkRelaxedArcConsistency(cells, upperWord, { row: downRow, col: c }, 'down', wordIndex, relaxedOptions)
              : checkArcConsistency(cells, upperWord, { row: downRow, col: c }, 'down', wordIndex);
            if (arcCheck) {
              const score = scorePosition(cells, downRow, c, 'down', upperWord.length);
              results.push({ row: downRow, col: c, direction: 'down', score });
            }
          }
        }
      }
    }
  }

  // Sort by score (best first) and return top 5 positions
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, 5);
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

  // BONUS: Intersection at center (2,2) specifically
  for (let i = 0; i < length; i++) {
    const r = direction === 'down' ? row + i : row;
    const c = direction === 'across' ? col + i : col;
    if (r === 2 && c === 2) {
      score += 50; // Big bonus for covering center
      break;
    }
  }

  // BONUS: Being on center row (2) or center col (2)
  if (direction === 'across' && row === 2) {
    score += 30; // On center row
  } else if (direction === 'down' && col === 2) {
    score += 30; // On center col
  }

  return score;
}

// ============================================================================
// KEYWORD OVERLAP ANALYSIS
// ============================================================================

/**
 * Find common letters between two words.
 * Returns a set of letters that appear in both words.
 */
function findCommonLetters(word1: string, word2: string): Set<string> {
  const letters1 = new Set(word1.toUpperCase());
  const letters2 = new Set(word2.toUpperCase());
  const common = new Set<string>();

  for (const letter of letters1) {
    if (letters2.has(letter)) {
      common.add(letter);
    }
  }

  return common;
}

/**
 * Calculate connectivity score for a word relative to other keywords.
 *
 * A word with high connectivity has many common letters with other keywords,
 * making it more likely to form intersections.
 *
 * @param word The word to score
 * @param otherWords Other keywords to compare against
 * @returns Connectivity score (higher = more connectable)
 */
function calculateConnectivity(word: string, otherWords: string[]): number {
  let totalConnections = 0;

  for (const other of otherWords) {
    if (other.toUpperCase() === word.toUpperCase()) continue;

    const common = findCommonLetters(word, other);
    // Each common letter is a potential intersection point
    totalConnections += common.size;
  }

  return totalConnections;
}

/**
 * Sort theme words for optimal placement order.
 *
 * Strategy:
 * 1. Primary: Friendliness score (easy letters for CSP fill)
 * 2. Tie-breaker: Connectivity (shared letters with other keywords)
 *
 * Friendliness is primary because:
 * - Easy letters (A,E,I,O,S,T,R,N,L) make CSP fill much more likely to succeed
 * - Hard letters (Q,J,X,Z,K,F,Y,W,V) can create unsolvable grids
 *
 * Connectivity as tie-breaker because:
 * - When friendliness is equal, prefer words that can intersect with more keywords
 * - This helps maximize keyword count without sacrificing success rate
 *
 * IMPORTANT: Uses scoreKeywordFriendliness (not calculateWordFriendliness from word-index.ts)
 * These are different algorithms and using the wrong one breaks certain prophet themes.
 *
 * @param themeWords Keywords to sort
 * @returns Sorted keywords (best first)
 */
export function sortByIntersectionPotential(themeWords: ThemeWord[]): ThemeWord[] {
  const words = themeWords.map(tw => tw.word.toUpperCase());

  return [...themeWords].sort((a, b) => {
    const wordA = a.word.toUpperCase();
    const wordB = b.word.toUpperCase();

    // Calculate friendliness using scoreKeywordFriendliness (same as original sorting)
    const friendA = scoreKeywordFriendliness(wordA);
    const friendB = scoreKeywordFriendliness(wordB);

    // Friendliness is the primary sort criterion
    if (friendA !== friendB) {
      return friendB - friendA; // Higher friendliness first
    }

    // Only use connectivity as tie-breaker when friendliness is EQUAL
    const connectA = calculateConnectivity(wordA, words);
    const connectB = calculateConnectivity(wordB, words);

    return connectB - connectA; // Higher connectivity first
  });
}

/**
 * Find open positions for placing a word - CENTERED in the grid.
 * Returns multiple positions (top 5) sorted by distance from center.
 *
 * Centering the first word maximizes intersection opportunities because:
 * - Words can connect from above, below, left, and right
 * - More flexibility for placing subsequent theme words
 *
 * Returning multiple positions allows trying alternatives if the first
 * one fails verification.
 */
function findOpenPosition(
  cells: EditableCell[][],
  word: string,
  wordIndex: WordIndex,
  preferredDirection: 'across' | 'down' = 'across',
  relaxedOptions?: RelaxedArcOptions
): { row: number; col: number; direction: 'across' | 'down'; score: number }[] {
  const upperWord = word.toUpperCase();
  const length = upperWord.length;

  if (length > GRID_SIZE) return [];

  // Calculate centered position
  // For a 5x5 grid, center is (2, 2)
  const centerRow = Math.floor(GRID_SIZE / 2);
  const centerCol = Math.floor(GRID_SIZE / 2);

  // Helper function for arc consistency check (relaxed or strict)
  const checkArc = (row: number, col: number, dir: 'across' | 'down') =>
    relaxedOptions
      ? checkRelaxedArcConsistency(cells, upperWord, { row, col }, dir, wordIndex, relaxedOptions)
      : checkArcConsistency(cells, upperWord, { row, col }, dir, wordIndex);

  // Collect all valid positions with distance from center
  const positions: { row: number; col: number; direction: 'across' | 'down'; dist: number }[] = [];

  for (let r = 0; r <= GRID_SIZE - length; r++) {
    for (let c = 0; c <= GRID_SIZE - length; c++) {
      // Calculate distance from center for this position
      const acrossDist = Math.abs(r - centerRow) + Math.abs(c + length / 2 - centerCol);
      const downDist = Math.abs(r + length / 2 - centerRow) + Math.abs(c - centerCol);

      if (canPlaceWord(cells, upperWord, r, c, 'across')) {
        if (checkArc(r, c, 'across')) {
          positions.push({ row: r, col: c, direction: 'across', dist: acrossDist });
        }
      }
      if (canPlaceWord(cells, upperWord, r, c, 'down')) {
        if (checkArc(r, c, 'down')) {
          positions.push({ row: r, col: c, direction: 'down', dist: downDist });
        }
      }
    }
  }

  if (positions.length === 0) return [];

  // Sort by distance from center (closest first), with preferred direction as tiebreaker
  positions.sort((a, b) => {
    if (a.dist !== b.dist) return a.dist - b.dist;
    // Prefer the preferred direction when distances are equal
    if (a.direction === preferredDirection && b.direction !== preferredDirection) return -1;
    if (b.direction === preferredDirection && a.direction !== preferredDirection) return 1;
    return 0;
  });

  // Convert to score-based format (higher score = closer to center)
  // Max dist in 5x5 is about 6, so score = 100 - dist * 10
  return positions.slice(0, 5).map(p => ({
    row: p.row,
    col: p.col,
    direction: p.direction,
    score: 100 - p.dist * 10,
  }));
}

/**
 * Find strategic black square positions to help resolve problematic slots.
 *
 * When CSP fails due to slots with 0 candidates, adding black squares
 * at specific positions can shorten or eliminate those problematic slots,
 * making the grid solvable.
 *
 * Returns positions that:
 * 1. Would not break existing placed words
 * 2. Would maintain grid connectivity
 * 3. Would help bound problematic slot ends
 */
function findStrategicBlackPositions(
  cells: EditableCell[][],
  problematicSlots: CSPSlot[]
): { row: number; col: number; reason: string }[] {
  const suggestions: { row: number; col: number; reason: string; priority: number }[] = [];
  const seen = new Set<string>();

  for (const slot of problematicSlots) {
    // Try adding black at the position after the slot ends
    const endR = slot.direction === 'down'
      ? slot.start.row + slot.length
      : slot.start.row;
    const endC = slot.direction === 'across'
      ? slot.start.col + slot.length
      : slot.start.col;

    // Position after slot end
    if (endR < GRID_SIZE && endC < GRID_SIZE) {
      const key = `${endR},${endC}`;
      if (!seen.has(key) && !wouldBreakWord(cells, endR, endC)) {
        const testCells = addSymmetricBlack(cells, endR, endC);
        if (validateConnectivity(testCells)) {
          seen.add(key);
          suggestions.push({
            row: endR,
            col: endC,
            reason: `Bound end of ${slot.direction} slot at (${slot.start.row + 1},${slot.start.col + 1})`,
            priority: 10, // High priority - directly addresses the problem
          });
        }
      }
    }

    // Try adding black at the position before the slot starts
    const beforeR = slot.direction === 'down'
      ? slot.start.row - 1
      : slot.start.row;
    const beforeC = slot.direction === 'across'
      ? slot.start.col - 1
      : slot.start.col;

    if (beforeR >= 0 && beforeC >= 0) {
      const key = `${beforeR},${beforeC}`;
      if (!seen.has(key) && !wouldBreakWord(cells, beforeR, beforeC)) {
        const testCells = addSymmetricBlack(cells, beforeR, beforeC);
        if (validateConnectivity(testCells)) {
          seen.add(key);
          suggestions.push({
            row: beforeR,
            col: beforeC,
            reason: `Bound start of ${slot.direction} slot at (${slot.start.row + 1},${slot.start.col + 1})`,
            priority: 8,
          });
        }
      }
    }

    // Try adding black at positions along the slot to split it
    // (useful for long slots that have no valid words)
    if (slot.length >= 4) {
      for (let i = 1; i < slot.length - 1; i++) {
        const midR = slot.direction === 'down'
          ? slot.start.row + i
          : slot.start.row;
        const midC = slot.direction === 'across'
          ? slot.start.col + i
          : slot.start.col;

        const key = `${midR},${midC}`;
        if (!seen.has(key) && !wouldBreakWord(cells, midR, midC)) {
          const testCells = addSymmetricBlack(cells, midR, midC);
          if (validateConnectivity(testCells)) {
            seen.add(key);
            suggestions.push({
              row: midR,
              col: midC,
              reason: `Split ${slot.direction} slot at (${slot.start.row + 1},${slot.start.col + 1})`,
              priority: 5, // Lower priority - more disruptive
            });
          }
        }
      }
    }
  }

  // Sort by priority (highest first)
  suggestions.sort((a, b) => b.priority - a.priority);

  return suggestions.map(({ row, col, reason }) => ({ row, col, reason }));
}

/**
 * Try to complete the grid by adding strategic black squares
 * when the initial CSP fill fails.
 *
 * Strategy:
 * 1. Identify slots with 0 candidates (problematic slots)
 * 2. Find positions where adding symmetric black squares would help
 * 3. Add black squares one at a time (maintaining symmetry)
 * 4. Re-run CSP after each addition
 * 5. Stop after maxIterations or when successful
 */
function tryWithStrategicBlacks(
  grid: EditableCell[][],
  wordIndex: WordIndex,
  maxTimeMs: number,
  placedThemeWordSet: Set<string>,
  maxIterations: number = 3
): CSPFillResult | null {
  let currentGrid = grid.map(row => row.map(cell => ({ ...cell })));
  let bestResult: CSPFillResult | null = null;

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    // Check which slots are problematic
    const checkResult = canGridBeFilled(currentGrid, wordIndex);

    if (checkResult.canFill) {
      // Grid can be filled, try CSP
      const cspResult = fillGridWithCSP(currentGrid, wordIndex, maxTimeMs, placedThemeWordSet);
      if (cspResult.success) {
        return cspResult;
      }
      // CSP failed but grid was fillable - might be timeout
      if (!bestResult || cspResult.placedWords.length > bestResult.placedWords.length) {
        bestResult = cspResult;
      }
      break;
    }

    // Get strategic positions for black squares
    const blackPositions = findStrategicBlackPositions(currentGrid, checkResult.problematicSlots);

    if (blackPositions.length === 0) {
      // No valid positions to add blacks
      break;
    }

    // Add the highest priority black square position (symmetric)
    const pos = blackPositions[0];
    currentGrid = addSymmetricBlack(currentGrid, pos.row, pos.col);

    // Try CSP with the new grid configuration
    const cspResult = fillGridWithCSP(currentGrid, wordIndex, maxTimeMs, placedThemeWordSet);

    if (cspResult.success) {
      return cspResult;
    }

    // Track best partial result
    if (!bestResult || cspResult.placedWords.length > bestResult.placedWords.length) {
      bestResult = cspResult;
    }
  }

  return bestResult;
}

/**
 * Place theme words in the grid using the "Intersection-Optimized" strategy:
 *
 * 1. INTERSECTION-FIRST: Sort keywords by connectivity (shared letters with other keywords)
 *    - Words that share many letters with other keywords are placed first
 *    - This maximizes opportunities for keywords to cross each other
 *    - Also factors in letter friendliness for CSP fill success
 *
 * 2. VERIFY BEFORE COMMIT: Before committing each placement, verify the grid
 *    is still completable (all slots have valid candidates)
 *
 * 3. TRACK THEME CELLS: Keep track of which cells are part of theme words
 *    (these cannot be turned into black squares later)
 *
 * This strategy maximizes keyword count by:
 * - Analyzing letter overlap between keywords to find natural intersection points
 * - Placing highly-connectable words first to create a foundation for others
 * - Only committing placements that don't create unsolvable slots
 */
function placeThemeWords(
  cells: EditableCell[][],
  themeWords: ThemeWord[],
  wordIndex: WordIndex
): { grid: EditableCell[][]; placed: PlacedWord[]; unplaced: ThemeWord[]; themeCells: Set<string> } {
  // Relaxed arc consistency options for theme words
  const relaxedOptions: RelaxedArcOptions = {
    minValidPercent: 0.5,
    allowEmptySlotsUnderLength: 2,
  };

  // Sort by friendliness (primary) with intersection potential as tie-breaker
  // This maximizes success rate while preferring words that can cross
  // Take top 12 candidates to avoid trying too many
  const filteredWords = themeWords.filter(tw => tw.word.length <= GRID_SIZE);
  const sortedWords = sortByIntersectionPotential(filteredWords).slice(0, 12);

  let grid = cells.map((row) => row.map((cell) => ({ ...cell })));
  const placed: PlacedWord[] = [];
  const unplaced: ThemeWord[] = [];
  const themeCells = new Set<string>();

  // Track direction balance for alternating
  let acrossCount = 0;
  let downCount = 0;

  for (const themeWord of sortedWords) {
    const word = themeWord.word.toUpperCase();
    const preferDirection: 'across' | 'down' = acrossCount <= downCount ? 'across' : 'down';

    // Get all valid positions for this word
    let positions: { row: number; col: number; direction: 'across' | 'down'; score: number }[] = [];

    if (placed.length === 0) {
      // First word: find centered open positions (returns multiple)
      const firstWordPrefer = word.length === 5 ? 'across' : preferDirection;
      positions = findOpenPosition(grid, word, wordIndex, firstWordPrefer, relaxedOptions);
    } else {
      // Subsequent words: combine intersection and open positions
      // findIntersection now returns multiple positions with scores
      const intersectionPositions = findIntersection(grid, word, wordIndex, relaxedOptions);
      // Boost intersection scores since they're preferred
      for (const pos of intersectionPositions) {
        positions.push({ ...pos, score: pos.score + 100 });
      }

      // Also get open positions as fallback
      const openPositions = findOpenPosition(grid, word, wordIndex, preferDirection, relaxedOptions);
      for (const pos of openPositions) {
        // Check if this position is already in the list (from intersections)
        const isDuplicate = positions.some(
          p => p.row === pos.row && p.col === pos.col && p.direction === pos.direction
        );
        if (!isDuplicate) {
          positions.push(pos);
        }
      }
    }

    // Sort positions by score (best first)
    positions.sort((a, b) => b.score - a.score);

    // VERIFY BEFORE COMMIT: Try each position until we find one that's completable
    let wordPlaced = false;

    for (const position of positions) {
      const testGrid = placeWord(
        grid,
        word,
        position.row,
        position.col,
        position.direction,
        'auto',
        true
      );

      if (!testGrid) continue;

      // Calculate theme cells for this placement
      const testThemeCells = new Set(themeCells);
      for (let i = 0; i < word.length; i++) {
        const r = position.direction === 'down' ? position.row + i : position.row;
        const c = position.direction === 'across' ? position.col + i : position.col;
        testThemeCells.add(`${r}-${c}`);
      }

      // Verify the grid is still completable (pass placed count for progressive threshold)
      if (verifyCompletable(testGrid, wordIndex, testThemeCells, placed.length)) {
        // Commit this placement
        grid = testGrid;
        placed.push({
          word,
          clue: themeWord.clue,
          row: position.row,
          col: position.col,
          direction: position.direction,
          isThemeWord: true,
        });

        // Update theme cells tracking
        for (let i = 0; i < word.length; i++) {
          const r = position.direction === 'down' ? position.row + i : position.row;
          const c = position.direction === 'across' ? position.col + i : position.col;
          themeCells.add(`${r}-${c}`);
        }

        // Update direction counts
        if (position.direction === 'across') acrossCount++;
        else downCount++;

        wordPlaced = true;
        break;
      }
    }

    // If no valid position found, mark as unplaced
    if (!wordPlaced) {
      unplaced.push(themeWord);
    }
  }

  // Add any words we didn't try to unplaced
  for (const tw of themeWords) {
    if (!placed.some(p => p.word === tw.word.toUpperCase()) &&
        !unplaced.includes(tw)) {
      unplaced.push(tw);
    }
  }

  return { grid, placed, unplaced, themeCells };
}

/**
 * Try to generate a puzzle using the smart keyword-slot matcher.
 *
 * This approach pre-computes keyword compatibility with black square patterns
 * to find valid keyword combinations BEFORE placement, avoiding dead ends.
 *
 * Steps:
 * 1. Find best pattern + keyword assignment via compatibility graph
 * 2. Execute the pre-validated assignment
 * 3. Fill remaining slots with Islamic-biased CSP
 */
function tryGenerateWithSmartMatcher(
  themeWords: ThemeWord[],
  wordIndex: WordIndex,
  maxTimeMs: number
): GenerationResult | null {
  const startTime = Date.now();

  // Extract keywords
  const keywords = themeWords.map(tw => tw.word.toUpperCase());

  // Find best pattern + keyword assignment
  const bestCandidate = findBestKeywordAssignment(keywords, wordIndex);

  if (!bestCandidate || !bestCandidate.isFillable) {
    return null;
  }

  // Execute the pre-validated plan
  const { grid: themedGrid, placedKeywords, themeCells } = executePatternCandidate(bestCandidate);

  // Convert placed keywords to PlacedWord format
  const themeWordsPlaced: PlacedWord[] = placedKeywords.map(pk => {
    const themeWord = themeWords.find(tw => tw.word.toUpperCase() === pk.word);
    return {
      word: pk.word,
      clue: themeWord?.clue || '',
      row: pk.row,
      col: pk.col,
      direction: pk.direction,
      isThemeWord: true,
    };
  });

  // Find unplaced theme words
  const placedKeywordSet = new Set(placedKeywords.map(pk => pk.word.toUpperCase()));
  const unplaced = themeWords.filter(tw => !placedKeywordSet.has(tw.word.toUpperCase()));

  // Check time
  let remainingTime = maxTimeMs - (Date.now() - startTime);
  if (remainingTime <= 0) {
    return null;
  }

  // Auto-add black squares for orphan slots (may still be needed)
  const gridWithBlacks = autoAddBlacks(themedGrid, wordIndex, themeCells, 4);

  // Fill with Islamic-biased CSP
  remainingTime = maxTimeMs - (Date.now() - startTime);
  if (remainingTime <= 0) {
    return null;
  }

  const placedThemeWordSet = new Set(themeWordsPlaced.map(pw => pw.word.toUpperCase()));
  let cspResult: CSPFillResult = fillGridWithBiasedCSP(gridWithBlacks, 0.5, remainingTime, placedThemeWordSet);
  let finalGrid = cspResult.grid;

  // If biased CSP failed, try regular CSP as fallback
  if (!cspResult.success) {
    remainingTime = maxTimeMs - (Date.now() - startTime);
    if (remainingTime > 1000) {
      const fallbackResult = fillGridWithCSP(gridWithBlacks, wordIndex, remainingTime, placedThemeWordSet);
      if (fallbackResult.success || fallbackResult.placedWords.length > cspResult.placedWords.length) {
        cspResult = fallbackResult;
        finalGrid = fallbackResult.grid;
      }
    }
  }

  // Build result
  const fillerWords: PlacedWord[] = cspResult.placedWords.map((pw) => ({
    word: pw.word,
    clue: '',
    row: pw.slot.start.row,
    col: pw.slot.start.col,
    direction: pw.slot.direction,
    isThemeWord: false,
  }));

  const allWords = [...themeWordsPlaced, ...fillerWords];

  // If CSP failed, validate and clean up partial result before returning
  if (!cspResult.success) {
    if (themeWordsPlaced.length > 0) {
      // Validate partial result and clear any invalid cells
      const partialValidation = validateAllWords(finalGrid);
      if (!partialValidation.valid) {
        finalGrid = clearInvalidCells(finalGrid, partialValidation.invalidWords, themeCells);
      }

      const gridStats = getGridStats(finalGrid);
      return {
        success: false,
        grid: finalGrid,
        placedWords: themeWordsPlaced,
        unplacedThemeWords: unplaced,
        stats: {
          totalSlots: getAllSlots(finalGrid).length,
          themeWordsPlaced: themeWordsPlaced.length,
          fillerWordsPlaced: 0,
          islamicPercentage: 100,
          avgWordScore: 100,
          gridFillPercentage: gridStats.whiteCells > 0
            ? (gridStats.filledCells / gridStats.whiteCells) * 100
            : 0,
          timeTakenMs: Date.now() - startTime,
          attemptsUsed: 1,
          patternUsed: `smart:${bestCandidate.patternName}`,
        },
      };
    }
    return null;
  }

  // FINAL VALIDATION: Ensure ALL words in the grid are valid dictionary words
  // This catches invalid 2-letter combinations created by black square placement
  const validation = validateAllWords(finalGrid);
  if (!validation.valid) {
    console.log('Smart matcher: Grid contains invalid words:', validation.invalidWords.map(w => w.word));
    // Return null to try another approach - grid is not valid
    return null;
  }

  // Calculate stats
  let islamicCount = 0;
  let totalScore = 0;

  for (const pw of allWords) {
    const upperWord = pw.word.toUpperCase();
    const score = getScore(upperWord, wordIndex);
    totalScore += score;
    // Count Islamic keywords, Islamic fillers, and contextually Islamic words
    if (ISLAMIC_WORDS_SET.has(upperWord) || ISLAMIC_FILLER_WORDS.has(upperWord) || CONTEXTUALLY_ISLAMIC_WORDS.has(upperWord)) {
      islamicCount++;
    }
  }

  const gridStats = getGridStats(finalGrid);

  return {
    success: true,
    grid: finalGrid,
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
      patternUsed: `smart:${bestCandidate.patternName}`,
    },
  };
}

/**
 * Try to generate a complete puzzle with a specific black square pattern.
 *
 * Uses the "Verify-Greedy + Bias + Blacks" strategy:
 * 1. FRIENDLIEST-FIRST: Place theme words sorted by letter friendliness
 * 2. VERIFY BEFORE COMMIT: Only commit placements that don't create dead ends
 * 3. AUTO-BLACKS: Add strategic black squares to break orphan slots
 * 4. ISLAMIC-BIASED CSP: Fill remaining slots prioritizing Islamic words
 */
function tryGenerateWithPattern(
  themeWords: ThemeWord[],
  patternIndex: number,
  wordIndex: WordIndex,
  maxTimeMs: number
): GenerationResult | null {
  const startTime = Date.now();
  const patternName = BLACK_SQUARE_PATTERNS[patternIndex]?.name || `pattern-${patternIndex}`;

  // Create grid with pattern
  let grid = createEmptyGrid();
  grid = applyBlackPattern(grid, patternIndex);

  // Check connectivity
  if (!validateConnectivity(grid)) {
    return null;
  }

  // LEVER 1: Place theme words with friendliest-first ordering + verification
  const { grid: themedGrid, placed: themeWordsPlaced, unplaced, themeCells } = placeThemeWords(
    grid,
    themeWords,
    wordIndex
  );

  // Check time
  let remainingTime = maxTimeMs - (Date.now() - startTime);
  if (remainingTime <= 0) {
    return null;
  }

  // LEVER 2: Auto-add black squares for orphan slots
  const gridWithBlacks = autoAddBlacks(themedGrid, wordIndex, themeCells, 4);

  // Collect theme words that were placed to prevent duplicates
  const placedThemeWordSet = new Set(themeWordsPlaced.map(pw => pw.word.toUpperCase()));

  // LEVER 3: Fill with Islamic-biased CSP
  remainingTime = maxTimeMs - (Date.now() - startTime);
  if (remainingTime <= 0) {
    return null;
  }

  // Use CSPFillResult as the common type (BiasedCSPFillResult extends it)
  let cspResult: CSPFillResult = fillGridWithBiasedCSP(gridWithBlacks, 0.5, remainingTime, placedThemeWordSet);
  let finalGrid = cspResult.grid;

  // If biased CSP failed, try regular CSP as fallback
  if (!cspResult.success) {
    remainingTime = maxTimeMs - (Date.now() - startTime);
    if (remainingTime > 1000) {
      const fallbackResult = fillGridWithCSP(gridWithBlacks, wordIndex, remainingTime, placedThemeWordSet);
      if (fallbackResult.success || fallbackResult.placedWords.length > cspResult.placedWords.length) {
        cspResult = fallbackResult;
        finalGrid = fallbackResult.grid;
      }
    }
  }

  // If still failed, try with strategic blacks (legacy fallback)
  if (!cspResult.success && themeWordsPlaced.length > 0) {
    remainingTime = maxTimeMs - (Date.now() - startTime);
    if (remainingTime > 1000) {
      const blackSquareResult = tryWithStrategicBlacks(
        gridWithBlacks,
        wordIndex,
        remainingTime,
        placedThemeWordSet,
        3
      );

      if (blackSquareResult && blackSquareResult.success) {
        cspResult = blackSquareResult;
        finalGrid = blackSquareResult.grid;
      } else if (blackSquareResult && blackSquareResult.placedWords.length > cspResult.placedWords.length) {
        cspResult = blackSquareResult;
        finalGrid = blackSquareResult.grid;
      }
    }
  }

  // Combine placed words (even for partial results)
  const fillerWords: PlacedWord[] = cspResult.placedWords.map((pw) => ({
    word: pw.word,
    clue: '',
    row: pw.slot.start.row,
    col: pw.slot.start.col,
    direction: pw.slot.direction,
    isThemeWord: false,
  }));

  // Calculate stats
  const allWords = [...themeWordsPlaced, ...fillerWords];

  // If CSP failed but we have theme words placed, return a partial result
  if (!cspResult.success) {
    if (themeWordsPlaced.length > 0) {
      // Validate partial result and clear any invalid cells
      const partialValidation = validateAllWords(finalGrid);
      if (!partialValidation.valid) {
        finalGrid = clearInvalidCells(finalGrid, partialValidation.invalidWords, themeCells);
      }

      const gridStats = getGridStats(finalGrid);
      return {
        success: false,
        grid: finalGrid,
        placedWords: themeWordsPlaced,
        unplacedThemeWords: unplaced,
        stats: {
          totalSlots: getAllSlots(finalGrid).length,
          themeWordsPlaced: themeWordsPlaced.length,
          fillerWordsPlaced: 0,
          islamicPercentage: 100,
          avgWordScore: 100,
          gridFillPercentage: gridStats.whiteCells > 0
            ? (gridStats.filledCells / gridStats.whiteCells) * 100
            : 0,
          timeTakenMs: Date.now() - startTime,
          attemptsUsed: 1,
          patternUsed: patternName,
        },
      };
    }
    return null;
  }

  // FINAL VALIDATION: Ensure ALL words in the grid are valid dictionary words
  // This catches invalid 2-letter combinations created by black square placement
  const validation = validateAllWords(finalGrid);
  if (!validation.valid) {
    console.log(`Pattern ${patternName}: Grid contains invalid words:`, validation.invalidWords.map(w => w.word));
    // Return null to try another pattern - grid is not valid
    return null;
  }

  let islamicCount = 0;
  let totalScore = 0;

  for (const pw of allWords) {
    const upperWord = pw.word.toUpperCase();
    const score = getScore(upperWord, wordIndex);
    totalScore += score;
    // Count Islamic keywords, Islamic fillers, and contextually Islamic words
    if (ISLAMIC_WORDS_SET.has(upperWord) || ISLAMIC_FILLER_WORDS.has(upperWord) || CONTEXTUALLY_ISLAMIC_WORDS.has(upperWord)) {
      islamicCount++;
    }
  }

  const gridStats = getGridStats(finalGrid);

  return {
    success: true,
    grid: finalGrid,
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
 * Internal puzzle generation with specific theme words.
 * Called by the main generatePuzzle function which handles recovery.
 */
function generatePuzzleInternal(
  themeWords: ThemeWord[],
  wordIndex: WordIndex,
  maxTimeMs: number,
  maxAttempts: number,
  preferredPattern?: number
): GenerationResult {
  const startTime = Date.now();

  // Collect successful candidates to pick the best one
  const successfulCandidates: GenerationResult[] = [];
  let bestPartialResult: GenerationResult | null = null;
  let attempts = 0;

  // =========================================================================
  // STEP 1: Try smart keyword-slot matcher first
  // This pre-computes keyword compatibility to avoid dead ends
  // =========================================================================
  const smartTimeLimit = Math.min(maxTimeMs * 0.4, 5000); // Use up to 40% of time, max 5s
  const smartResult = tryGenerateWithSmartMatcher(themeWords, wordIndex, smartTimeLimit);

  if (smartResult) {
    attempts++;

    if (smartResult.success) {
      // Early exit if smart matcher found an excellent result
      if (smartResult.stats.islamicPercentage >= EXCELLENT_ISLAMIC_PERCENTAGE) {
        smartResult.stats.timeTakenMs = Date.now() - startTime;
        return smartResult;
      }
      successfulCandidates.push(smartResult);
    } else if (smartResult.stats.themeWordsPlaced > 0) {
      bestPartialResult = smartResult;
    }
  }

  // =========================================================================
  // STEP 2: Fallback to pattern loop if smart matcher didn't produce
  //         an excellent result or we want more candidates
  // =========================================================================

  // If preferred pattern specified, try it first
  const patternsToTry = preferredPattern !== undefined
    ? [
        preferredPattern,
        ...Array.from({ length: BLACK_SQUARE_PATTERNS.length }, (_, i) => i).filter(
          (i) => i !== preferredPattern
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
        // Prioritize: theme words placed > grid fill percentage
        const isBetter = !bestPartialResult ||
          result.stats.themeWordsPlaced > bestPartialResult.stats.themeWordsPlaced ||
          (result.stats.themeWordsPlaced === bestPartialResult.stats.themeWordsPlaced &&
           result.stats.gridFillPercentage > bestPartialResult.stats.gridFillPercentage);
        if (isBetter) {
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
 * Main entry point: Generate a complete crossword puzzle
 *
 * Strategy (in order of attempt):
 * 1. SMART MATCHER: Pre-compute keyword compatibility with patterns,
 *    find valid combinations BEFORE placement to avoid dead ends
 * 2. FALLBACK: Try patterns in order with greedy placement + verification
 * 3. RECOVERY: If all fails, retry with fewer theme words or shuffled order
 * 4. Multi-candidate selection to maximize Islamic word percentage
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

  // Recovery loop: try up to 3 times with different strategies
  const maxRecoveryAttempts = 3;
  let bestResult: GenerationResult | null = null;

  for (let recovery = 0; recovery < maxRecoveryAttempts; recovery++) {
    // Check if we've exceeded total time budget
    const elapsed = Date.now() - startTime;
    if (elapsed >= maxTimeMs) break;

    const remainingTime = maxTimeMs - elapsed;
    // Allocate time for this recovery attempt
    const attemptTime = Math.max(remainingTime / (maxRecoveryAttempts - recovery), 2000);

    // Determine theme words for this attempt
    let attemptThemeWords = themeWords;

    if (recovery === 1 && themeWords.length > 3) {
      // Second attempt: try with shuffled theme word order
      // This can help find different valid combinations
      attemptThemeWords = [...themeWords].sort(() => Math.random() - 0.5);
    } else if (recovery === 2 && themeWords.length > 2) {
      // Third attempt: try with fewer theme words (drop the hardest one)
      // Sort by friendliness and drop the least friendly word
      attemptThemeWords = [...themeWords]
        .sort((a, b) => scoreKeywordFriendliness(b.word) - scoreKeywordFriendliness(a.word))
        .slice(0, Math.max(2, themeWords.length - 1));
    }

    const result = generatePuzzleInternal(
      attemptThemeWords,
      wordIndex,
      attemptTime,
      maxAttempts,
      options.preferredPattern
    );

    // Track best result across all recovery attempts
    if (!bestResult ||
        (result.success && !bestResult.success) ||
        (result.success && bestResult.success && result.stats.islamicPercentage > bestResult.stats.islamicPercentage) ||
        (!result.success && !bestResult.success && result.stats.themeWordsPlaced > bestResult.stats.themeWordsPlaced)) {
      bestResult = result;
    }

    // If we got a successful result, we're done
    if (result.success) {
      result.stats.timeTakenMs = Date.now() - startTime;
      result.stats.attemptsUsed += recovery; // Include recovery attempts
      return result;
    }
  }

  // Return best result from all attempts
  if (bestResult) {
    bestResult.stats.timeTakenMs = Date.now() - startTime;
    return bestResult;
  }

  // Complete failure (shouldn't reach here normally)
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
      attemptsUsed: maxRecoveryAttempts,
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
