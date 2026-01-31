/**
 * Grid Fit Checker for 5x5 Crossword Puzzles
 *
 * CRITICAL: Grid is ALWAYS 5x5. This is non-negotiable.
 * - Maximum word length: 5 letters
 * - Minimum word length: 2 letters
 * - Grid dimensions: exactly 5 rows x 5 columns
 *
 * Determines if a word can fit into the current puzzle state.
 * Used to show visual indicators on keyword pills.
 */

import { GeneratedPuzzle, GRID_5X5_CONSTRAINTS } from './types';

// 5x5 grid constants - these are absolute and non-negotiable
const MAX_WORD_LENGTH = GRID_5X5_CONSTRAINTS.maxWordLength; // 5
const MIN_WORD_LENGTH = GRID_5X5_CONSTRAINTS.minWordLength; // 2
const GRID_SIZE = 5;

export type FitQuality = 'perfect' | 'good' | 'possible' | 'unlikely' | 'cannot_fit';

export interface FitResult {
  canFit: boolean;
  quality: FitQuality;
  reason?: 'too_long' | 'too_short' | 'conflicts' | 'grid_full' | 'perpendicular_conflict';
  intersections?: number;
  potentialPositions?: number;
}

/**
 * Check if a word can fit into the 5x5 puzzle grid.
 *
 * STRICT RULES (non-negotiable):
 * - Word must be between 2-5 letters (inclusive)
 * - Grid is always exactly 5x5
 *
 * @param word - The word to check
 * @param puzzle - The current generated puzzle (or null if no puzzle yet)
 * @param placedWords - Words already placed/selected for the puzzle
 * @returns FitResult with quality assessment
 */
export function checkWordFit(
  word: string,
  puzzle: GeneratedPuzzle | null,
  placedWords: string[]
): FitResult {
  const wordUpper = word.toUpperCase();

  // STRICT: Word must be 5 letters or less for 5x5 grid
  if (wordUpper.length > MAX_WORD_LENGTH) {
    return {
      canFit: false,
      quality: 'cannot_fit',
      reason: 'too_long',
    };
  }

  // STRICT: Word must be at least 2 letters
  if (wordUpper.length < MIN_WORD_LENGTH) {
    return {
      canFit: false,
      quality: 'cannot_fit',
      reason: 'too_short',
    };
  }

  // If no puzzle generated yet, check potential intersections with placed words
  if (!puzzle) {
    if (placedWords.length === 0) {
      // No words yet - any word can be the starting word
      return {
        canFit: true,
        quality: 'perfect',
        potentialPositions: 5, // Could go anywhere in 5x5
      };
    }

    // Check potential intersections with already selected words
    const intersections = countPotentialIntersections(wordUpper, placedWords);

    if (intersections >= 2) {
      return {
        canFit: true,
        quality: 'perfect',
        intersections,
      };
    } else if (intersections === 1) {
      return {
        canFit: true,
        quality: 'good',
        intersections,
      };
    } else {
      // Zero intersections - still selectable, generator will handle placement
      // (may result in black boxes or disconnected regions that generator resolves)
      return {
        canFit: true,
        quality: 'possible',
        intersections: 0,
      };
    }
  }

  // Puzzle exists - check against actual grid
  const gridAnalysis = analyzeGridForWord(wordUpper, puzzle);

  if (gridAnalysis.positions === 0) {
    // No valid positions found
    if (gridAnalysis.hasConflicts) {
      return {
        canFit: false,
        quality: 'cannot_fit',
        reason: 'conflicts',
      };
    }
    return {
      canFit: false,
      quality: 'cannot_fit',
      reason: 'grid_full',
    };
  }

  // Has valid positions
  if (gridAnalysis.bestIntersections >= 2) {
    return {
      canFit: true,
      quality: 'perfect',
      intersections: gridAnalysis.bestIntersections,
      potentialPositions: gridAnalysis.positions,
    };
  } else if (gridAnalysis.bestIntersections === 1) {
    return {
      canFit: true,
      quality: 'good',
      intersections: gridAnalysis.bestIntersections,
      potentialPositions: gridAnalysis.positions,
    };
  } else {
    return {
      canFit: true,
      quality: 'possible',
      intersections: 0,
      potentialPositions: gridAnalysis.positions,
    };
  }
}

/**
 * Count potential intersections between a word and a list of other words.
 * An intersection occurs when two words share a common letter.
 */
export function countPotentialIntersections(word: string, otherWords: string[]): number {
  const wordLetters = new Set(word.toUpperCase().split(''));
  let totalIntersections = 0;

  for (const otherWord of otherWords) {
    const otherLetters = otherWord.toUpperCase().split('');
    for (const letter of otherLetters) {
      if (wordLetters.has(letter)) {
        totalIntersections++;
        break; // Count max 1 intersection per word pair
      }
    }
  }

  return totalIntersections;
}

/**
 * Analyze the puzzle grid to find valid positions for a word.
 */
function analyzeGridForWord(
  word: string,
  puzzle: GeneratedPuzzle
): { positions: number; bestIntersections: number; hasConflicts: boolean } {
  const grid = puzzle.grid;
  const rows = grid.length;
  const cols = grid[0]?.length || 0;
  const wordLen = word.length;

  let validPositions = 0;
  let bestIntersections = 0;
  let hasConflicts = false;

  // Check all horizontal positions
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c <= cols - wordLen; c++) {
      const result = checkPosition(grid, word, r, c, 'across');
      if (result.valid) {
        validPositions++;
        bestIntersections = Math.max(bestIntersections, result.intersections);
      } else if (result.conflict) {
        hasConflicts = true;
      }
    }
  }

  // Check all vertical positions
  for (let r = 0; r <= rows - wordLen; r++) {
    for (let c = 0; c < cols; c++) {
      const result = checkPosition(grid, word, r, c, 'down');
      if (result.valid) {
        validPositions++;
        bestIntersections = Math.max(bestIntersections, result.intersections);
      } else if (result.conflict) {
        hasConflicts = true;
      }
    }
  }

  return { positions: validPositions, bestIntersections, hasConflicts };
}

/**
 * Check if a word can be placed at a specific position.
 */
function checkPosition(
  grid: GeneratedPuzzle['grid'],
  word: string,
  startRow: number,
  startCol: number,
  direction: 'across' | 'down'
): { valid: boolean; intersections: number; conflict: boolean } {
  let intersections = 0;

  for (let i = 0; i < word.length; i++) {
    const r = direction === 'across' ? startRow : startRow + i;
    const c = direction === 'across' ? startCol + i : startCol;

    const cell = grid[r]?.[c];
    if (!cell) {
      return { valid: false, intersections: 0, conflict: false };
    }

    if (cell.type === 'black') {
      return { valid: false, intersections: 0, conflict: false };
    }

    if (cell.type === 'letter' && cell.solution) {
      if (cell.solution.toUpperCase() === word[i].toUpperCase()) {
        intersections++;
      } else {
        return { valid: false, intersections: 0, conflict: true };
      }
    }
  }

  return { valid: true, intersections, conflict: false };
}

/**
 * Get a color class for the fit quality.
 */
export function getFitQualityColor(quality: FitQuality): {
  bg: string;
  text: string;
  border: string;
  icon: 'check' | 'maybe' | 'x';
} {
  switch (quality) {
    case 'perfect':
      return {
        bg: 'bg-emerald-500/20',
        text: 'text-emerald-400',
        border: 'border-emerald-500/40',
        icon: 'check',
      };
    case 'good':
      return {
        bg: 'bg-green-500/20',
        text: 'text-green-400',
        border: 'border-green-500/40',
        icon: 'check',
      };
    case 'possible':
      return {
        bg: 'bg-yellow-500/20',
        text: 'text-yellow-400',
        border: 'border-yellow-500/40',
        icon: 'maybe',
      };
    case 'unlikely':
      return {
        bg: 'bg-orange-500/20',
        text: 'text-orange-400',
        border: 'border-orange-500/40',
        icon: 'maybe',
      };
    case 'cannot_fit':
      return {
        bg: 'bg-red-500/20',
        text: 'text-red-400',
        border: 'border-red-500/40',
        icon: 'x',
      };
  }
}

/**
 * Get a human-readable description of the fit result.
 */
export function getFitDescription(result: FitResult): string {
  if (!result.canFit) {
    switch (result.reason) {
      case 'too_long':
        return `Must be ${MAX_WORD_LENGTH} letters or less`;
      case 'too_short':
        return `Must be at least ${MIN_WORD_LENGTH} letters`;
      case 'conflicts':
        return 'Conflicts with existing letters';
      case 'grid_full':
        return 'No room in current grid';
      default:
        return 'Cannot fit in 5x5 grid';
    }
  }

  switch (result.quality) {
    case 'perfect':
      return result.intersections
        ? `${result.intersections} intersections`
        : 'Great fit';
    case 'good':
      return result.intersections
        ? `${result.intersections} intersection`
        : 'Good fit';
    case 'possible':
      return result.intersections === 0
        ? 'No shared letters yet'
        : 'May fit';
    default:
      return 'Unknown';
  }
}

/**
 * Check if a word is valid for the 5x5 grid.
 * This is the primary validation - all words MUST pass this check.
 *
 * @param word - The word to validate
 * @returns true if word length is between 2-5 letters
 */
export function isValidFor5x5(word: string): boolean {
  const length = word.trim().length;
  return length >= MIN_WORD_LENGTH && length <= MAX_WORD_LENGTH;
}

/**
 * Filter a list of words to only those valid for 5x5 grid.
 *
 * @param words - Array of words to filter
 * @returns Only words with 2-5 letters
 */
export function filterFor5x5<T extends { word: string }>(words: T[]): T[] {
  return words.filter((w) => isValidFor5x5(w.word));
}

// Export constants for use elsewhere
export { MAX_WORD_LENGTH, MIN_WORD_LENGTH, GRID_SIZE };
