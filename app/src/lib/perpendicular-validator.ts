/**
 * Perpendicular Slot Validator
 *
 * Core validation logic for checking that perpendicular slots can be filled
 * with valid words. Used by both the editable grid (manual typing) and the
 * auto-generator for arc consistency checking.
 *
 * Key concepts:
 * - SlotInfo: Information about a word slot (position, direction, pattern)
 * - SlotValidation: Result of validating a slot (candidates, validity, suggestions)
 * - Arc consistency: Ensuring every slot has at least one valid word candidate
 */

import { EditableCell, GRID_SIZE } from './editable-grid';
import { WordIndex, hasMatch, matchPattern } from './word-index';

/**
 * Information about a word slot in the grid.
 */
export interface SlotInfo {
  /** Starting position */
  start: { row: number; col: number };
  /** Direction of the slot */
  direction: 'across' | 'down';
  /** Length of the slot */
  length: number;
  /** Pattern with known letters and blanks, e.g., "J_M" */
  pattern: string;
  /** Indices of positions with fixed letters */
  fixedPositions: number[];
}

/**
 * Result of validating a perpendicular slot.
 */
export interface SlotValidation {
  /** The slot being validated */
  slot: SlotInfo;
  /** Valid words that could fill this slot */
  candidates: string[];
  /** Whether at least one candidate exists */
  isValid: boolean;
  /** Suggested black box position to fix invalid slot */
  suggestedBlackBox?: { row: number; col: number };
  /** Reason for invalidity */
  reason?: 'no_candidates' | 'pattern_too_short' | 'blocked_by_black';
}

/**
 * Extract the pattern for a slot starting at a given position.
 * Returns the pattern string like "J_M" where _ represents blank cells.
 */
export function getSlotPattern(
  cells: EditableCell[][],
  startRow: number,
  startCol: number,
  direction: 'across' | 'down'
): SlotInfo | null {
  let pattern = '';
  const fixedPositions: number[] = [];
  let r = startRow;
  let c = startCol;
  let index = 0;

  // Walk along the slot until we hit a black cell or edge
  while (r < GRID_SIZE && c < GRID_SIZE) {
    const cell = cells[r][c];

    if (cell.isBlack) break;

    if (cell.letter) {
      pattern += cell.letter;
      fixedPositions.push(index);
    } else {
      pattern += '_';
    }

    index++;
    if (direction === 'across') {
      c++;
    } else {
      r++;
    }
  }

  // Slots must be at least 2 letters
  if (pattern.length < 2) {
    return null;
  }

  return {
    start: { row: startRow, col: startCol },
    direction,
    length: pattern.length,
    pattern,
    fixedPositions,
  };
}

/**
 * Get all perpendicular slots that would be affected by placing a word.
 *
 * When placing an ACROSS word, this returns all DOWN slots that intersect.
 * When placing a DOWN word, this returns all ACROSS slots that intersect.
 */
export function getPerpendicularSlots(
  cells: EditableCell[][],
  wordStart: { row: number; col: number },
  wordLength: number,
  direction: 'across' | 'down'
): SlotInfo[] {
  const slots: SlotInfo[] = [];
  const perpDirection = direction === 'across' ? 'down' : 'across';

  for (let i = 0; i < wordLength; i++) {
    const r = direction === 'down' ? wordStart.row + i : wordStart.row;
    const c = direction === 'across' ? wordStart.col + i : wordStart.col;

    // Bounds check before accessing cells
    if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) continue;
    if (!cells[r] || !cells[r][c]) continue;

    // Find the start of the perpendicular slot
    let startR = r;
    let startC = c;

    if (perpDirection === 'down') {
      // Walk up to find the start of the down slot
      while (startR > 0 && cells[startR - 1] && cells[startR - 1][c] && !cells[startR - 1][c].isBlack) {
        startR--;
      }
    } else {
      // Walk left to find the start of the across slot
      while (startC > 0 && cells[r] && cells[r][startC - 1] && !cells[r][startC - 1].isBlack) {
        startC--;
      }
    }

    const slot = getSlotPattern(cells, startR, startC, perpDirection);
    if (slot) {
      // Avoid duplicates
      const exists = slots.some(
        s => s.start.row === slot.start.row &&
             s.start.col === slot.start.col &&
             s.direction === slot.direction
      );
      if (!exists) {
        slots.push(slot);
      }
    }
  }

  return slots;
}

/**
 * Find all candidates that match a pattern.
 */
export function findCandidates(
  pattern: string,
  wordIndex: WordIndex
): string[] {
  return matchPattern(pattern, wordIndex);
}

/**
 * Check if a pattern has any valid candidates.
 * Faster than findCandidates when you only need to know yes/no.
 */
export function patternHasCandidates(
  pattern: string,
  wordIndex: WordIndex
): boolean {
  return hasMatch(pattern, wordIndex);
}

/**
 * Validate all perpendicular slots for a word placement.
 * Returns validation results for each affected slot.
 */
export function validatePerpendicularSlots(
  cells: EditableCell[][],
  wordStart: { row: number; col: number },
  wordLength: number,
  direction: 'across' | 'down',
  wordIndex: WordIndex
): SlotValidation[] {
  const perpSlots = getPerpendicularSlots(cells, wordStart, wordLength, direction);
  const validations: SlotValidation[] = [];

  for (const slot of perpSlots) {
    const candidates = findCandidates(slot.pattern, wordIndex);
    const isValid = candidates.length > 0;

    const validation: SlotValidation = {
      slot,
      candidates: candidates.slice(0, 10), // Limit for performance
      isValid,
    };

    if (!isValid) {
      validation.reason = 'no_candidates';
      // Try to find a black box suggestion
      const suggestion = suggestBlackBoxFix(cells, slot, wordIndex);
      if (suggestion) {
        validation.suggestedBlackBox = suggestion;
      }
    }

    validations.push(validation);
  }

  return validations;
}

/**
 * Validate perpendicular slots with a hypothetical word placement.
 * Used to check if placing a word would create invalid slots.
 *
 * @param cells Current grid state
 * @param word The word to hypothetically place
 * @param wordStart Starting position
 * @param direction Direction of placement
 * @param wordIndex Word index for validation
 * @returns Validation results (simulates the word being placed)
 */
export function validatePlacementPerpendicularSlots(
  cells: EditableCell[][],
  word: string,
  wordStart: { row: number; col: number },
  direction: 'across' | 'down',
  wordIndex: WordIndex
): SlotValidation[] {
  // Create a copy of the grid with the hypothetical placement
  const hypotheticalCells = cells.map(row =>
    row.map(cell => ({ ...cell }))
  );

  // Place the word hypothetically
  const upperWord = word.toUpperCase();
  for (let i = 0; i < upperWord.length; i++) {
    const r = direction === 'down' ? wordStart.row + i : wordStart.row;
    const c = direction === 'across' ? wordStart.col + i : wordStart.col;

    if (r < GRID_SIZE && c < GRID_SIZE && !hypotheticalCells[r][c].isBlack) {
      hypotheticalCells[r][c] = {
        ...hypotheticalCells[r][c],
        letter: upperWord[i],
        source: 'auto',
      };
    }
  }

  // Now validate the perpendicular slots
  return validatePerpendicularSlots(
    hypotheticalCells,
    wordStart,
    upperWord.length,
    direction,
    wordIndex
  );
}

/**
 * Suggest a black box placement to fix an invalid slot.
 * Tries to find a position where adding a black box creates two valid sub-slots.
 */
export function suggestBlackBoxFix(
  cells: EditableCell[][],
  invalidSlot: SlotInfo,
  wordIndex: WordIndex
): { row: number; col: number } | null {
  const { start, direction, length, pattern } = invalidSlot;

  // Try adding a black box at each position in the slot
  for (let i = 1; i < length - 1; i++) {
    // Position in grid
    const r = direction === 'down' ? start.row + i : start.row;
    const c = direction === 'across' ? start.col + i : start.col;

    // Check if this cell already has a letter (can't add black box over letter)
    if (cells[r][c].letter) continue;

    // Split the pattern at position i
    const beforePattern = pattern.slice(0, i);
    const afterPattern = pattern.slice(i + 1);

    // Check if both sub-patterns are valid (or too short to matter)
    const beforeValid = beforePattern.length < 2 || hasMatch(beforePattern, wordIndex);
    const afterValid = afterPattern.length < 2 || hasMatch(afterPattern, wordIndex);

    if (beforeValid && afterValid) {
      return { row: r, col: c };
    }
  }

  // Also try adding black box at start or end if those positions are empty
  // Start position
  if (!cells[start.row][start.col].letter) {
    const afterPattern = pattern.slice(1);
    if (afterPattern.length < 2 || hasMatch(afterPattern, wordIndex)) {
      return { row: start.row, col: start.col };
    }
  }

  // End position
  const endR = direction === 'down' ? start.row + length - 1 : start.row;
  const endC = direction === 'across' ? start.col + length - 1 : start.col;
  if (!cells[endR][endC].letter) {
    const beforePattern = pattern.slice(0, -1);
    if (beforePattern.length < 2 || hasMatch(beforePattern, wordIndex)) {
      return { row: endR, col: endC };
    }
  }

  return null;
}

/**
 * Get all cells that belong to a slot.
 */
export function getSlotCells(slot: SlotInfo): { row: number; col: number }[] {
  const cells: { row: number; col: number }[] = [];
  for (let i = 0; i < slot.length; i++) {
    const r = slot.direction === 'down' ? slot.start.row + i : slot.start.row;
    const c = slot.direction === 'across' ? slot.start.col + i : slot.start.col;
    cells.push({ row: r, col: c });
  }
  return cells;
}

/**
 * Check if a word placement would create arc-consistent perpendicular slots.
 * This is the main validation for blocking invalid keyword placements.
 *
 * @returns true if all perpendicular slots have valid candidates
 */
export function checkArcConsistency(
  cells: EditableCell[][],
  word: string,
  wordStart: { row: number; col: number },
  direction: 'across' | 'down',
  wordIndex: WordIndex
): boolean {
  const validations = validatePlacementPerpendicularSlots(
    cells,
    word,
    wordStart,
    direction,
    wordIndex
  );

  return validations.every(v => v.isValid);
}

/**
 * Options for relaxed arc consistency checking
 */
export interface RelaxedArcOptions {
  /** Minimum % of perpendicular slots that must have candidates (0-1) */
  minValidPercent: number;
  /** Allow slots of this length or less to have 0 candidates */
  allowEmptySlotsUnderLength: number;
}

/**
 * Relaxed arc consistency - allows theme word placement even if
 * some perpendicular slots are risky. CSP can handle failures later.
 *
 * This is less strict than checkArcConsistency() and is designed
 * for theme word placement where we want to maximize coverage.
 */
export function checkRelaxedArcConsistency(
  cells: EditableCell[][],
  word: string,
  wordStart: { row: number; col: number },
  direction: 'across' | 'down',
  wordIndex: WordIndex,
  options: RelaxedArcOptions = { minValidPercent: 0.5, allowEmptySlotsUnderLength: 2 }
): boolean {
  const validations = validatePlacementPerpendicularSlots(
    cells,
    word,
    wordStart,
    direction,
    wordIndex
  );

  if (validations.length === 0) return true;

  let validCount = 0;

  for (const v of validations) {
    if (v.isValid) {
      validCount++;
    } else if (v.slot.length <= options.allowEmptySlotsUnderLength) {
      // Short slots with no candidates are acceptable (can become black)
      validCount++;
    }
  }

  return (validCount / validations.length) >= options.minValidPercent;
}

/**
 * Get all current slots in the grid (both across and down).
 * Used for comprehensive validation of the entire grid.
 */
export function getAllSlots(cells: EditableCell[][]): SlotInfo[] {
  const slots: SlotInfo[] = [];

  // Find all across slots
  for (let r = 0; r < GRID_SIZE; r++) {
    let c = 0;
    while (c < GRID_SIZE) {
      // Skip black cells
      if (cells[r][c].isBlack) {
        c++;
        continue;
      }

      // Found start of a slot
      const slot = getSlotPattern(cells, r, c, 'across');
      if (slot) {
        slots.push(slot);
        c += slot.length;
      } else {
        c++;
      }
    }
  }

  // Find all down slots
  for (let c = 0; c < GRID_SIZE; c++) {
    let r = 0;
    while (r < GRID_SIZE) {
      // Skip black cells
      if (cells[r][c].isBlack) {
        r++;
        continue;
      }

      // Found start of a slot
      const slot = getSlotPattern(cells, r, c, 'down');
      if (slot) {
        slots.push(slot);
        r += slot.length;
      } else {
        r++;
      }
    }
  }

  return slots;
}

/**
 * Validate all slots in the grid.
 * Returns all invalid slots with their issues.
 */
export function validateAllSlots(
  cells: EditableCell[][],
  wordIndex: WordIndex
): SlotValidation[] {
  const allSlots = getAllSlots(cells);
  const validations: SlotValidation[] = [];

  for (const slot of allSlots) {
    // Skip slots that are completely empty (all blanks)
    if (!slot.pattern.includes('_') && slot.fixedPositions.length === 0) {
      continue;
    }

    // Only validate slots that have at least one letter
    if (slot.fixedPositions.length === 0) {
      continue;
    }

    const candidates = findCandidates(slot.pattern, wordIndex);
    const isValid = candidates.length > 0;

    const validation: SlotValidation = {
      slot,
      candidates: candidates.slice(0, 10),
      isValid,
    };

    if (!isValid) {
      validation.reason = 'no_candidates';
      const suggestion = suggestBlackBoxFix(cells, slot, wordIndex);
      if (suggestion) {
        validation.suggestedBlackBox = suggestion;
      }
    }

    validations.push(validation);
  }

  return validations;
}

/**
 * Format a slot for display.
 */
export function formatSlot(slot: SlotInfo): string {
  const dirSymbol = slot.direction === 'across' ? '→' : '↓';
  return `${dirSymbol} (${slot.start.row + 1},${slot.start.col + 1}): "${slot.pattern}"`;
}

/**
 * Format validation result for display.
 */
export function formatValidation(validation: SlotValidation): string {
  const slotStr = formatSlot(validation.slot);
  if (validation.isValid) {
    return `${slotStr} - ${validation.candidates.length} candidates`;
  }
  return `${slotStr} - NO VALID WORDS`;
}
