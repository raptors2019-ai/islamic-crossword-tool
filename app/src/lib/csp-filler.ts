/**
 * CSP-Based Grid Filler
 *
 * Uses Constraint Satisfaction Problem (CSP) techniques to fill remaining
 * empty slots in the crossword grid with valid words.
 *
 * Key algorithms:
 * - AC-3 (Arc Consistency 3) for domain pruning
 * - Backtracking search with forward checking
 * - MRV (Minimum Remaining Values) heuristic for variable ordering
 *
 * Priority system ensures Islamic words are preferred over common English.
 */

import { EditableCell, GRID_SIZE } from './editable-grid';
import {
  SlotInfo,
  getAllSlots,
  getSlotPattern,
} from './perpendicular-validator';
import {
  WordIndex,
  matchPatternSorted,
  matchPatternByTier,
  hasMatch,
  getDefaultWordIndex,
  getScore,
  WORD_SCORE,
  getIslamicWordIndex,
  getEnglishWordIndex,
  matchPattern,
  isIslamicWord,
} from './word-index';

/**
 * Extended slot info with CSP-specific data
 */
export interface CSPSlot extends SlotInfo {
  /** Unique identifier for this slot */
  id: string;
  /** Current domain of valid words that can fill this slot */
  candidates: string[];
  /** Slots that intersect with this one */
  intersections: SlotIntersection[];
  /** Whether this slot is already filled (all letters known) */
  isFilled: boolean;
}

/**
 * Intersection between two slots
 */
export interface SlotIntersection {
  /** The other slot */
  slotId: string;
  /** Position in this slot where intersection occurs */
  positionInThis: number;
  /** Position in other slot where intersection occurs */
  positionInOther: number;
}

/**
 * Result of CSP filling attempt
 */
export interface CSPFillResult {
  /** Whether filling was successful */
  success: boolean;
  /** The filled grid (or partially filled if unsuccessful) */
  grid: EditableCell[][];
  /** Words that were placed */
  placedWords: { word: string; slot: CSPSlot }[];
  /** Slots that could not be filled */
  unfilledSlots: CSPSlot[];
  /** Statistics about the fill */
  stats: {
    /** Total slots in grid */
    totalSlots: number;
    /** Slots that were already filled */
    alreadyFilled: number;
    /** Slots filled by CSP */
    filledByCSP: number;
    /** Average score of words used */
    avgWordScore: number;
    /** Percentage of Islamic words */
    islamicPercentage: number;
    /** Time taken in ms */
    timeTakenMs: number;
  };
}

/**
 * Generate a unique ID for a slot
 */
function slotId(slot: SlotInfo): string {
  return `${slot.direction}-${slot.start.row}-${slot.start.col}`;
}

/**
 * Get all slots from the grid with CSP metadata
 */
export function getCSPSlots(
  cells: EditableCell[][],
  wordIndex: WordIndex
): CSPSlot[] {
  const rawSlots = getAllSlots(cells);
  const cspSlots: CSPSlot[] = [];

  for (const slot of rawSlots) {
    // Check if slot is already completely filled
    const isFilled = !slot.pattern.includes('_');

    // Get candidates (sorted by tier, then score - Islamic words first)
    const candidates = isFilled
      ? [slot.pattern] // Already filled, only candidate is current word
      : matchPatternByTier(slot.pattern, wordIndex);

    const cspSlot: CSPSlot = {
      ...slot,
      id: slotId(slot),
      candidates,
      intersections: [],
      isFilled,
    };

    cspSlots.push(cspSlot);
  }

  // Build intersection graph
  for (let i = 0; i < cspSlots.length; i++) {
    for (let j = i + 1; j < cspSlots.length; j++) {
      const slotA = cspSlots[i];
      const slotB = cspSlots[j];

      // Only slots in different directions can intersect
      if (slotA.direction === slotB.direction) continue;

      // Find intersection point
      const intersection = findIntersection(slotA, slotB);
      if (intersection) {
        slotA.intersections.push({
          slotId: slotB.id,
          positionInThis: intersection.posA,
          positionInOther: intersection.posB,
        });
        slotB.intersections.push({
          slotId: slotA.id,
          positionInThis: intersection.posB,
          positionInOther: intersection.posA,
        });
      }
    }
  }

  return cspSlots;
}

/**
 * Find the intersection point between two slots (if any)
 */
function findIntersection(
  slotA: SlotInfo,
  slotB: SlotInfo
): { posA: number; posB: number } | null {
  // Get all cells in each slot
  const cellsA: { row: number; col: number }[] = [];
  const cellsB: { row: number; col: number }[] = [];

  for (let i = 0; i < slotA.length; i++) {
    const r = slotA.direction === 'down' ? slotA.start.row + i : slotA.start.row;
    const c = slotA.direction === 'across' ? slotA.start.col + i : slotA.start.col;
    cellsA.push({ row: r, col: c });
  }

  for (let i = 0; i < slotB.length; i++) {
    const r = slotB.direction === 'down' ? slotB.start.row + i : slotB.start.row;
    const c = slotB.direction === 'across' ? slotB.start.col + i : slotB.start.col;
    cellsB.push({ row: r, col: c });
  }

  // Find common cell
  for (let posA = 0; posA < cellsA.length; posA++) {
    for (let posB = 0; posB < cellsB.length; posB++) {
      if (cellsA[posA].row === cellsB[posB].row && cellsA[posA].col === cellsB[posB].col) {
        return { posA, posB };
      }
    }
  }

  return null;
}

/**
 * Apply AC-3 (Arc Consistency) algorithm to prune domains
 *
 * Returns false if any slot has no valid candidates (unsatisfiable)
 */
export function enforceArcConsistency(
  slots: CSPSlot[],
  slotMap: Map<string, CSPSlot>
): boolean {
  // Build work queue with all arcs
  const queue: { slotId: string; neighborId: string }[] = [];

  for (const slot of slots) {
    for (const intersection of slot.intersections) {
      queue.push({ slotId: slot.id, neighborId: intersection.slotId });
    }
  }

  while (queue.length > 0) {
    const { slotId: currentId, neighborId } = queue.shift()!;
    const currentSlot = slotMap.get(currentId)!;
    const neighborSlot = slotMap.get(neighborId)!;

    // Find the intersection details
    const intersection = currentSlot.intersections.find(
      (i) => i.slotId === neighborId
    )!;

    // Try to make arc consistent
    const revised = revise(currentSlot, neighborSlot, intersection);

    if (revised) {
      // If domain became empty, problem is unsatisfiable
      if (currentSlot.candidates.length === 0) {
        return false;
      }

      // Add all other neighbors to queue
      for (const otherIntersection of currentSlot.intersections) {
        if (otherIntersection.slotId !== neighborId) {
          queue.push({ slotId: otherIntersection.slotId, neighborId: currentId });
        }
      }
    }
  }

  return true;
}

/**
 * Revise the domain of slotA based on constraint with slotB
 * Returns true if domain was changed
 */
function revise(
  slotA: CSPSlot,
  slotB: CSPSlot,
  intersection: SlotIntersection
): boolean {
  let revised = false;
  const newCandidates: string[] = [];

  for (const wordA of slotA.candidates) {
    // Check if there exists a consistent value in slotB's domain
    const charA = wordA[intersection.positionInThis];

    const hasSupport = slotB.candidates.some((wordB) => {
      const charB = wordB[intersection.positionInOther];
      return charA === charB;
    });

    if (hasSupport) {
      newCandidates.push(wordA);
    } else {
      revised = true;
    }
  }

  if (revised) {
    slotA.candidates = newCandidates;
  }

  return revised;
}

/**
 * Select the next slot to fill using MRV (Minimum Remaining Values) heuristic
 * Also uses degree heuristic as tiebreaker (most constraints = higher priority)
 */
function selectMRVSlot(slots: CSPSlot[]): CSPSlot | null {
  const unfilled = slots.filter((s) => !s.isFilled && s.candidates.length > 0);

  if (unfilled.length === 0) return null;

  // Sort by: 1) fewer candidates (MRV), 2) more intersections (degree)
  unfilled.sort((a, b) => {
    if (a.candidates.length !== b.candidates.length) {
      return a.candidates.length - b.candidates.length;
    }
    return b.intersections.length - a.intersections.length;
  });

  return unfilled[0];
}

/**
 * Forward check: after assigning a value, prune inconsistent values from neighbors
 * Returns false if any neighbor becomes empty (assignment leads to failure)
 */
function forwardCheck(
  slot: CSPSlot,
  word: string,
  slots: CSPSlot[],
  slotMap: Map<string, CSPSlot>
): { success: boolean; prunedValues: Map<string, string[]> } {
  const prunedValues = new Map<string, string[]>();

  for (const intersection of slot.intersections) {
    const neighbor = slotMap.get(intersection.slotId)!;
    if (neighbor.isFilled) continue;

    const charAtIntersection = word[intersection.positionInThis];
    const pruned: string[] = [];
    const remaining: string[] = [];

    for (const candidate of neighbor.candidates) {
      if (candidate[intersection.positionInOther] === charAtIntersection) {
        remaining.push(candidate);
      } else {
        pruned.push(candidate);
      }
    }

    if (remaining.length === 0) {
      // Restore pruned values before returning failure
      return { success: false, prunedValues };
    }

    if (pruned.length > 0) {
      prunedValues.set(neighbor.id, pruned);
      neighbor.candidates = remaining;
    }
  }

  return { success: true, prunedValues };
}

/**
 * Restore pruned values (for backtracking)
 */
function restorePrunedValues(
  prunedValues: Map<string, string[]>,
  slotMap: Map<string, CSPSlot>
): void {
  for (const [slotId, values] of prunedValues) {
    const slot = slotMap.get(slotId)!;
    slot.candidates = [...slot.candidates, ...values];
  }
}

/**
 * Place a word in the grid and return cells that were already filled (intersections).
 *
 * @returns Set of cell keys that already had letters (should be preserved during backtrack)
 */
function placeWordInGrid(
  grid: EditableCell[][],
  slot: CSPSlot,
  word: string
): Set<string> {
  const preservedCells = new Set<string>();

  for (let i = 0; i < word.length; i++) {
    const r = slot.direction === 'down' ? slot.start.row + i : slot.start.row;
    const c = slot.direction === 'across' ? slot.start.col + i : slot.start.col;
    const key = `${r}-${c}`;

    // Track cells that already have letters (intersections with other words)
    if (grid[r][c].letter) {
      preservedCells.add(key);
    }

    grid[r][c] = {
      ...grid[r][c],
      letter: word[i],
      source: 'auto',
    };
  }

  return preservedCells;
}

/**
 * Clear a word from the grid during backtracking.
 *
 * We track which cells were newly placed (vs already had letters from intersections)
 * and only clear the newly placed ones. This prevents corrupting cross-words.
 *
 * @param grid The grid to modify
 * @param slot The slot whose word is being cleared
 * @param cellsToPreserve Positions of cells that already had letters before this word
 */
function clearWordFromGrid(
  grid: EditableCell[][],
  slot: CSPSlot,
  cellsToPreserve: Set<string>
): void {
  for (let i = 0; i < slot.length; i++) {
    const r = slot.direction === 'down' ? slot.start.row + i : slot.start.row;
    const c = slot.direction === 'across' ? slot.start.col + i : slot.start.col;
    const key = `${r}-${c}`;

    // Only clear if this cell was newly placed by this word (not an intersection)
    if (!cellsToPreserve.has(key)) {
      grid[r][c] = {
        ...grid[r][c],
        letter: '',
        source: undefined,
      };
    }
  }
}

/**
 * Backtracking search with forward checking
 * Tracks used words to prevent duplicates in the same puzzle
 */
function backtrackSearch(
  slots: CSPSlot[],
  slotMap: Map<string, CSPSlot>,
  grid: EditableCell[][],
  placedWords: { word: string; slot: CSPSlot }[],
  usedWords: Set<string>,
  maxTime: number,
  startTime: number
): boolean {
  // Check timeout
  if (Date.now() - startTime > maxTime) {
    return false;
  }

  // Select next slot to fill
  const slot = selectMRVSlot(slots);

  // If no unfilled slots, we're done!
  if (!slot) {
    return true;
  }

  // Try each candidate word (already sorted by priority)
  // Filter out words that are already used in this puzzle
  const availableCandidates = slot.candidates.filter(w => !usedWords.has(w));

  for (const word of availableCandidates) {
    // Assign the word
    slot.isFilled = true;
    const originalCandidates = slot.candidates;
    slot.candidates = [word];
    usedWords.add(word);

    // Forward check
    const { success, prunedValues } = forwardCheck(slot, word, slots, slotMap);

    if (success) {
      // Place word in grid, get cells that were already filled (intersections)
      const preservedCells = placeWordInGrid(grid, slot, word);
      placedWords.push({ word, slot });

      // Recurse
      if (backtrackSearch(slots, slotMap, grid, placedWords, usedWords, maxTime, startTime)) {
        return true;
      }

      // Backtrack: remove word from grid AND from tracking array
      // Preserve intersection cells that had letters from other words
      placedWords.pop();
      clearWordFromGrid(grid, slot, preservedCells);
    }

    // Restore state
    slot.isFilled = false;
    slot.candidates = originalCandidates;
    usedWords.delete(word);
    restorePrunedValues(prunedValues, slotMap);
  }

  return false;
}

/**
 * Main entry point: Fill remaining slots in the grid using CSP
 *
 * @param cells Current grid state
 * @param wordIndex Word index for pattern matching (uses default if not provided)
 * @param maxTimeMs Maximum time to spend (default 15000ms = 15 seconds)
 * @param existingWords Words already placed in the grid (to prevent duplicates)
 * @returns Fill result with success status and updated grid
 */
export function fillGridWithCSP(
  cells: EditableCell[][],
  wordIndex?: WordIndex,
  maxTimeMs: number = 15000,
  existingWords?: Set<string>
): CSPFillResult {
  const startTime = Date.now();
  const index = wordIndex ?? getDefaultWordIndex();

  // Deep copy the grid
  const grid = cells.map((row) => row.map((cell) => ({ ...cell })));

  // Get all slots with CSP metadata
  const slots = getCSPSlots(grid, index);
  const slotMap = new Map(slots.map((s) => [s.id, s]));

  // Count initial state
  const alreadyFilled = slots.filter((s) => s.isFilled).length;
  const totalSlots = slots.length;

  // Collect words already in the grid (from filled slots)
  const usedWords = new Set<string>(existingWords ?? []);
  for (const slot of slots) {
    if (slot.isFilled && !slot.pattern.includes('_')) {
      usedWords.add(slot.pattern.toUpperCase());
    }
  }

  // Apply AC-3 to prune domains
  const acResult = enforceArcConsistency(slots, slotMap);

  if (!acResult) {
    // Grid is unsatisfiable
    return {
      success: false,
      grid,
      placedWords: [],
      unfilledSlots: slots.filter((s) => !s.isFilled),
      stats: {
        totalSlots,
        alreadyFilled,
        filledByCSP: 0,
        avgWordScore: 0,
        islamicPercentage: 0,
        timeTakenMs: Date.now() - startTime,
      },
    };
  }

  // Run backtracking search
  const placedWords: { word: string; slot: CSPSlot }[] = [];
  const success = backtrackSearch(
    slots,
    slotMap,
    grid,
    placedWords,
    usedWords,
    maxTimeMs,
    startTime
  );

  // Calculate statistics
  const filledByCSP = placedWords.length;
  const unfilledSlots = slots.filter((s) => !s.isFilled);

  let totalScore = 0;
  let islamicCount = 0;

  for (const { word } of placedWords) {
    const score = getScore(word, index);
    totalScore += score;
    if (score === WORD_SCORE.ISLAMIC_KEYWORD) {
      islamicCount++;
    }
  }

  const avgWordScore = filledByCSP > 0 ? totalScore / filledByCSP : 0;
  const islamicPercentage = filledByCSP > 0 ? (islamicCount / filledByCSP) * 100 : 0;

  return {
    success,
    grid,
    placedWords,
    unfilledSlots,
    stats: {
      totalSlots,
      alreadyFilled,
      filledByCSP,
      avgWordScore,
      islamicPercentage,
      timeTakenMs: Date.now() - startTime,
    },
  };
}

/**
 * Try to fill a single slot with the best available word
 * Useful for suggesting fills one at a time
 */
export function suggestWordForSlot(
  cells: EditableCell[][],
  row: number,
  col: number,
  direction: 'across' | 'down',
  wordIndex?: WordIndex,
  maxSuggestions: number = 5
): string[] {
  const index = wordIndex ?? getDefaultWordIndex();

  // Get the slot pattern
  const slot = getSlotPattern(cells, row, col, direction);
  if (!slot) return [];

  // Get candidates sorted by score
  const candidates = matchPatternSorted(slot.pattern, index);

  return candidates.slice(0, maxSuggestions);
}

/**
 * Check if the grid can potentially be filled completely
 * Runs AC-3 to see if all slots have at least one candidate
 */
export function canGridBeFilled(
  cells: EditableCell[][],
  wordIndex?: WordIndex
): { canFill: boolean; problematicSlots: CSPSlot[] } {
  const index = wordIndex ?? getDefaultWordIndex();
  const slots = getCSPSlots(cells, index);
  const slotMap = new Map(slots.map((s) => [s.id, s]));

  // Check for slots with no candidates before AC-3
  const emptyDomainSlots = slots.filter(
    (s) => !s.isFilled && s.candidates.length === 0
  );
  if (emptyDomainSlots.length > 0) {
    return { canFill: false, problematicSlots: emptyDomainSlots };
  }

  // Run AC-3
  const success = enforceArcConsistency(slots, slotMap);

  if (!success) {
    const problematic = slots.filter(
      (s) => !s.isFilled && s.candidates.length === 0
    );
    return { canFill: false, problematicSlots: problematic };
  }

  return { canFill: true, problematicSlots: [] };
}

/**
 * Get unfilled slots sorted by difficulty (fewest candidates first)
 */
export function getUnfilledSlotsByDifficulty(
  cells: EditableCell[][],
  wordIndex?: WordIndex
): CSPSlot[] {
  const index = wordIndex ?? getDefaultWordIndex();
  const slots = getCSPSlots(cells, index);

  return slots
    .filter((s) => !s.isFilled)
    .sort((a, b) => a.candidates.length - b.candidates.length);
}

// ============================================================================
// LEVER 3: Islamic-Biased CSP Fill
// ============================================================================

/**
 * Get candidates for a pattern with Islamic words prioritized.
 * Returns Islamic matches first, then English matches (deduplicated).
 */
export function getIslamicBiasedCandidates(
  pattern: string,
  islamicIndex: WordIndex,
  englishIndex: WordIndex
): string[] {
  // Get matches from Islamic index first
  const islamicMatches = matchPattern(pattern, islamicIndex);

  // Get matches from English index
  const englishMatches = matchPattern(pattern, englishIndex);

  // Dedupe (Islamic takes priority)
  const islamicSet = new Set(islamicMatches);
  const filteredEnglish = englishMatches.filter(w => !islamicSet.has(w));

  return [...islamicMatches, ...filteredEnglish];
}

/**
 * Result of biased CSP fill
 */
export interface BiasedCSPFillResult extends CSPFillResult {
  /** Actual Islamic percentage achieved */
  islamicPercent: number;
}

/**
 * Fill the grid with Islamic-biased CSP.
 *
 * This version of CSP fill prioritizes Islamic words:
 * 1. Try Islamic words first for every slot
 * 2. Force Islamic-only fills when below target percentage
 * 3. Fall back to English only when necessary
 *
 * @param cells Current grid state
 * @param targetIslamicPercent Target Islamic word percentage (0-1, default 0.5)
 * @param maxTimeMs Maximum time in milliseconds
 * @param existingWords Words already placed (to prevent duplicates)
 * @returns Fill result with Islamic percentage achieved
 */
export function fillGridWithBiasedCSP(
  cells: EditableCell[][],
  targetIslamicPercent: number = 0.5,
  maxTimeMs: number = 15000,
  existingWords?: Set<string>
): BiasedCSPFillResult {
  const startTime = Date.now();
  const islamicIndex = getIslamicWordIndex();
  const englishIndex = getEnglishWordIndex();
  const fullIndex = getDefaultWordIndex();

  // Deep copy the grid
  const grid = cells.map((row) => row.map((cell) => ({ ...cell })));

  // Get all slots
  const slots = getCSPSlots(grid, fullIndex);
  const slotMap = new Map(slots.map((s) => [s.id, s]));

  // Count initial state
  const alreadyFilled = slots.filter((s) => s.isFilled).length;
  const totalSlots = slots.length;

  // Track used words
  const usedWords = new Set<string>(existingWords ?? []);
  for (const slot of slots) {
    if (slot.isFilled && !slot.pattern.includes('_')) {
      usedWords.add(slot.pattern.toUpperCase());
    }
  }

  // Override candidates with Islamic-biased ordering
  for (const slot of slots) {
    if (!slot.isFilled) {
      slot.candidates = getIslamicBiasedCandidates(slot.pattern, islamicIndex, englishIndex);
    }
  }

  // Apply AC-3 to prune domains
  const acResult = enforceArcConsistency(slots, slotMap);

  if (!acResult) {
    return {
      success: false,
      grid,
      placedWords: [],
      unfilledSlots: slots.filter((s) => !s.isFilled),
      stats: {
        totalSlots,
        alreadyFilled,
        filledByCSP: 0,
        avgWordScore: 0,
        islamicPercentage: 0,
        timeTakenMs: Date.now() - startTime,
      },
      islamicPercent: 0,
    };
  }

  // Run biased backtracking search
  const placedWords: { word: string; slot: CSPSlot }[] = [];
  const success = biasedBacktrackSearch(
    slots,
    slotMap,
    grid,
    placedWords,
    usedWords,
    islamicIndex,
    targetIslamicPercent,
    maxTimeMs,
    startTime
  );

  // Calculate statistics
  const filledByCSP = placedWords.length;
  const unfilledSlots = slots.filter((s) => !s.isFilled);

  let totalScore = 0;
  let islamicCount = 0;

  for (const { word } of placedWords) {
    const score = getScore(word, fullIndex);
    totalScore += score;
    if (isIslamicWord(word)) {
      islamicCount++;
    }
  }

  const avgWordScore = filledByCSP > 0 ? totalScore / filledByCSP : 0;
  const islamicPercentage = filledByCSP > 0 ? (islamicCount / filledByCSP) * 100 : 0;
  const islamicPercent = filledByCSP > 0 ? islamicCount / filledByCSP : 0;

  return {
    success,
    grid,
    placedWords,
    unfilledSlots,
    stats: {
      totalSlots,
      alreadyFilled,
      filledByCSP,
      avgWordScore,
      islamicPercentage,
      timeTakenMs: Date.now() - startTime,
    },
    islamicPercent,
  };
}

/**
 * Biased backtracking search that prioritizes Islamic words
 * and forces Islamic selections when below target percentage.
 */
function biasedBacktrackSearch(
  slots: CSPSlot[],
  slotMap: Map<string, CSPSlot>,
  grid: EditableCell[][],
  placedWords: { word: string; slot: CSPSlot }[],
  usedWords: Set<string>,
  islamicIndex: WordIndex,
  targetIslamicPercent: number,
  maxTime: number,
  startTime: number
): boolean {
  // Check timeout
  if (Date.now() - startTime > maxTime) {
    return false;
  }

  // Select next slot to fill (MRV heuristic)
  const slot = selectMRVSlot(slots);

  // If no unfilled slots, we're done!
  if (!slot) {
    return true;
  }

  // Calculate current Islamic percentage
  const islamicCount = placedWords.filter(pw => isIslamicWord(pw.word)).length;
  const currentPercent = placedWords.length > 0 ? islamicCount / placedWords.length : 1;

  // Filter out used words
  let availableCandidates = slot.candidates.filter(w => !usedWords.has(w));

  // If we're below target, force Islamic-only candidates
  if (currentPercent < targetIslamicPercent && placedWords.length > 2) {
    const islamicOnly = availableCandidates.filter(w => isIslamicWord(w));
    if (islamicOnly.length > 0) {
      availableCandidates = islamicOnly;
    }
    // If no Islamic options, fall back to all candidates
  }

  for (const word of availableCandidates) {
    // Assign the word
    slot.isFilled = true;
    const originalCandidates = slot.candidates;
    slot.candidates = [word];
    usedWords.add(word);

    // Forward check
    const { success, prunedValues } = forwardCheck(slot, word, slots, slotMap);

    if (success) {
      // Place word in grid, get cells that were already filled (intersections)
      const preservedCells = placeWordInGrid(grid, slot, word);
      placedWords.push({ word, slot });

      // Recurse
      if (biasedBacktrackSearch(
        slots,
        slotMap,
        grid,
        placedWords,
        usedWords,
        islamicIndex,
        targetIslamicPercent,
        maxTime,
        startTime
      )) {
        return true;
      }

      // Backtrack: remove word from grid
      // Preserve intersection cells that had letters from other words
      placedWords.pop();
      clearWordFromGrid(grid, slot, preservedCells);
    }

    // Restore state
    slot.isFilled = false;
    slot.candidates = originalCandidates;
    usedWords.delete(word);
    restorePrunedValues(prunedValues, slotMap);
  }

  return false;
}
