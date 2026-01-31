/**
 * Keyword Scorer for Smart Recommendation System
 *
 * Scores and ranks prophet keywords based on how well they fit
 * into the current crossword grid state.
 *
 * Scoring formula:
 * - Base: relevance (100/80/60)
 * - Fit bonus: perfect (+30), good (+20), possible (+5), cannot_fit (-50)
 * - Intersection bonus: intersections * 5 (max +15)
 * - Perpendicular penalty: -100 if would create invalid perpendicular slots
 */

import { ProphetKeyword } from './prophet-keywords';
import { GeneratedPuzzle, ThemeWord } from './types';
import { checkWordFit, FitResult, FitQuality } from './fit-checker';
import { EditableCell, findBestPlacement } from './editable-grid';
import { WordIndex } from './word-index';
import { validatePlacementPerpendicularSlots } from './perpendicular-validator';

export interface ScoredKeyword {
  keyword: ProphetKeyword;
  fitResult: FitResult;
  compositeScore: number;
  hasPerpendicularConflict?: boolean;  // True if placing this would create invalid perpendicular slots
}

// Fit quality bonuses
const FIT_BONUSES: Record<FitQuality, number> = {
  perfect: 30,
  good: 20,
  possible: 5,   // Lower than good, but still selectable
  unlikely: 0,
  cannot_fit: -50,
};

// Max bonus from intersections
const MAX_INTERSECTION_BONUS = 15;
const INTERSECTION_BONUS_PER = 5;

// Options for perpendicular validation during scoring
export interface ScoreKeywordOptions {
  editableCells?: EditableCell[][];
  wordIndex?: WordIndex;
}

/**
 * Score a single keyword based on relevance and grid fit.
 * Optionally checks perpendicular feasibility if editableCells and wordIndex are provided.
 */
export function scoreKeyword(
  keyword: ProphetKeyword,
  puzzle: GeneratedPuzzle | null,
  selectedWords: ThemeWord[],
  options?: ScoreKeywordOptions
): ScoredKeyword {
  const placedWordStrings = selectedWords.map((w) => w.activeSpelling.toUpperCase());
  let fitResult = checkWordFit(keyword.word, puzzle, placedWordStrings);

  // Calculate composite score
  let compositeScore = keyword.relevance;
  let hasPerpendicularConflict = false;

  // Check perpendicular feasibility if editable cells are provided
  if (options?.editableCells && options?.wordIndex && fitResult.canFit) {
    const perpConflict = checkPerpendicularFeasibility(
      keyword.word,
      options.editableCells,
      options.wordIndex
    );
    if (perpConflict) {
      hasPerpendicularConflict = true;
      // Mark as cannot fit due to perpendicular conflict
      fitResult = {
        ...fitResult,
        canFit: false,
        quality: 'cannot_fit',
        reason: 'perpendicular_conflict',
      };
      // Heavy penalty for perpendicular conflicts
      compositeScore -= 100;
    }
  }

  // Add fit bonus
  compositeScore += FIT_BONUSES[fitResult.quality];

  // Add intersection bonus (capped)
  if (fitResult.intersections) {
    const intersectionBonus = Math.min(
      fitResult.intersections * INTERSECTION_BONUS_PER,
      MAX_INTERSECTION_BONUS
    );
    compositeScore += intersectionBonus;
  }

  return {
    keyword,
    fitResult,
    compositeScore,
    hasPerpendicularConflict,
  };
}

/**
 * Check if placing a word would create invalid perpendicular slots.
 * Returns true if there's a conflict.
 */
function checkPerpendicularFeasibility(
  word: string,
  cells: EditableCell[][],
  wordIndex: WordIndex
): boolean {
  // Find the best placement position for this word
  const placement = findBestPlacement(cells, word, 'across');
  if (!placement) {
    // Try down direction
    const downPlacement = findBestPlacement(cells, word, 'down');
    if (!downPlacement) {
      return false; // No placement found, but not a perpendicular conflict
    }
    // Check perpendicular slots for down placement
    const validation = validatePlacementPerpendicularSlots(
      cells,
      word,
      { row: downPlacement.row, col: downPlacement.col },
      'down',
      wordIndex
    );
    return validation.some(v => !v.isValid);
  }

  // Check perpendicular slots for across placement
  const validation = validatePlacementPerpendicularSlots(
    cells,
    word,
    { row: placement.row, col: placement.col },
    'across',
    wordIndex
  );

  if (validation.some(v => !v.isValid)) {
    // Try down direction as fallback
    const downPlacement = findBestPlacement(cells, word, 'down');
    if (downPlacement) {
      const downValidation = validatePlacementPerpendicularSlots(
        cells,
        word,
        { row: downPlacement.row, col: downPlacement.col },
        'down',
        wordIndex
      );
      // Only report conflict if BOTH directions have issues
      return downValidation.some(v => !v.isValid);
    }
    return true; // Only across was possible and it has conflicts
  }

  return false;
}

/**
 * Score and sort all keywords by their fit quality with the current grid.
 *
 * @param keywords - List of keywords to score
 * @param puzzle - Current generated puzzle (or null if none)
 * @param selectedWords - Words already selected for the puzzle
 * @param options - Optional perpendicular validation options
 * @returns Keywords sorted by composite score (best fit first)
 */
export function scoreKeywords(
  keywords: ProphetKeyword[],
  puzzle: GeneratedPuzzle | null,
  selectedWords: ThemeWord[],
  options?: ScoreKeywordOptions
): ScoredKeyword[] {
  const scored = keywords.map((keyword) =>
    scoreKeyword(keyword, puzzle, selectedWords, options)
  );

  // Sort by composite score (highest first)
  // For equal scores, keep original order (which is by relevance)
  return scored.sort((a, b) => b.compositeScore - a.compositeScore);
}

/**
 * Get fit indicator style for a keyword pill.
 */
export function getFitIndicatorStyle(
  quality: FitQuality,
  hasPerpendicularConflict?: boolean
): {
  dotColor: string;
  opacity: string;
  tooltip: string;
} {
  // Special case for perpendicular conflicts
  if (hasPerpendicularConflict) {
    return {
      dotColor: 'bg-orange-500',
      opacity: 'opacity-50',
      tooltip: 'Creates invalid crossings with current words',
    };
  }

  switch (quality) {
    case 'perfect':
      return {
        dotColor: 'bg-emerald-400',
        opacity: 'opacity-100',
        tooltip: 'Perfect fit',
      };
    case 'good':
      return {
        dotColor: 'bg-yellow-400',
        opacity: 'opacity-100',
        tooltip: 'Good fit',
      };
    case 'possible':
      return {
        dotColor: 'bg-slate-400',
        opacity: 'opacity-90',
        tooltip: 'Selectable - generator will find placement',
      };
    case 'unlikely':
      return {
        dotColor: 'bg-slate-500',
        opacity: 'opacity-50',
        tooltip: 'Unlikely to fit',
      };
    case 'cannot_fit':
      return {
        dotColor: '',
        opacity: 'opacity-40',
        tooltip: 'Cannot fit',
      };
  }
}

/**
 * Generate a tooltip description for a scored keyword.
 */
export function getScoredKeywordTooltip(scored: ScoredKeyword): string {
  const { keyword, fitResult, hasPerpendicularConflict } = scored;
  const lines: string[] = [keyword.clue];

  // Handle perpendicular conflict
  if (hasPerpendicularConflict) {
    lines.push('⚠️ Creates invalid crossings');
    lines.push('Would make perpendicular words unsolvable');
    return lines.join(' • ');
  }

  if (fitResult.canFit) {
    if (fitResult.intersections && fitResult.intersections > 0) {
      const plural = fitResult.intersections === 1 ? '' : 's';
      lines.push(`${fitResult.intersections} intersection${plural} possible`);
    }
    if (fitResult.potentialPositions && fitResult.potentialPositions > 1) {
      lines.push(`${fitResult.potentialPositions} positions available`);
    }
  } else {
    switch (fitResult.reason) {
      case 'too_long':
        lines.push('Too long for 5x5 grid');
        break;
      case 'too_short':
        lines.push('Too short (min 2 letters)');
        break;
      case 'conflicts':
        lines.push('Conflicts with existing letters');
        break;
      case 'grid_full':
        lines.push('No room in current grid');
        break;
      case 'perpendicular_conflict':
        lines.push('Creates invalid perpendicular words');
        break;
    }
  }

  return lines.join(' • ');
}
