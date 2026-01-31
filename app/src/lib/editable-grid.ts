/**
 * Editable Grid Types and Helpers
 * For the always-on interactive puzzle builder
 */

export type CellSource = 'user' | 'auto' | 'empty';

export interface EditableCell {
  letter: string | null;
  isBlack: boolean;
  source: CellSource;
  number: number | null;
}

export interface EditableGrid {
  cells: EditableCell[][];
  selectedCell: { row: number; col: number } | null;
  direction: 'across' | 'down';
}

export const GRID_SIZE = 5;

/**
 * Create an empty 5x5 editable grid
 */
export function createEmptyGrid(): EditableCell[][] {
  const cells: EditableCell[][] = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    const row: EditableCell[] = [];
    for (let c = 0; c < GRID_SIZE; c++) {
      row.push({
        letter: null,
        isBlack: false,
        source: 'empty',
        number: null,
      });
    }
    cells.push(row);
  }
  return cells;
}

/**
 * Create initial editable grid state
 */
export function createEditableGrid(): EditableGrid {
  return {
    cells: createEmptyGrid(),
    selectedCell: null,
    direction: 'across',
  };
}

/**
 * Set a letter in a cell
 */
export function setLetter(
  cells: EditableCell[][],
  row: number,
  col: number,
  letter: string | null,
  source: CellSource = 'user'
): EditableCell[][] {
  if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) {
    return cells;
  }

  const newCells = cells.map((r, ri) =>
    r.map((cell, ci) => {
      if (ri === row && ci === col) {
        return {
          ...cell,
          letter: letter ? letter.toUpperCase() : null,
          source: letter ? source : 'empty',
          isBlack: false, // Setting a letter clears black
        };
      }
      return cell;
    })
  );

  return newCells;
}

/**
 * Toggle black cell state
 */
export function toggleBlack(
  cells: EditableCell[][],
  row: number,
  col: number
): EditableCell[][] {
  if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) {
    return cells;
  }

  return cells.map((r, ri) =>
    r.map((cell, ci) => {
      if (ri === row && ci === col) {
        const newIsBlack = !cell.isBlack;
        return {
          ...cell,
          isBlack: newIsBlack,
          letter: newIsBlack ? null : cell.letter,
          source: newIsBlack ? 'empty' : cell.source,
        };
      }
      return cell;
    })
  );
}

/**
 * Clear a cell (remove letter, keep white)
 */
export function clearCell(
  cells: EditableCell[][],
  row: number,
  col: number
): EditableCell[][] {
  if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) {
    return cells;
  }

  return cells.map((r, ri) =>
    r.map((cell, ci) => {
      if (ri === row && ci === col && !cell.isBlack) {
        return {
          ...cell,
          letter: null,
          source: 'empty',
        };
      }
      return cell;
    })
  );
}

/**
 * Get the next cell in the current direction
 */
export function getNextCell(
  row: number,
  col: number,
  direction: 'across' | 'down',
  cells: EditableCell[][]
): { row: number; col: number } | null {
  let nextRow = row;
  let nextCol = col;

  if (direction === 'across') {
    nextCol++;
  } else {
    nextRow++;
  }

  // Skip black cells
  while (
    nextRow < GRID_SIZE &&
    nextCol < GRID_SIZE &&
    cells[nextRow][nextCol].isBlack
  ) {
    if (direction === 'across') {
      nextCol++;
    } else {
      nextRow++;
    }
  }

  if (nextRow >= GRID_SIZE || nextCol >= GRID_SIZE) {
    return null;
  }

  return { row: nextRow, col: nextCol };
}

/**
 * Get the previous cell in the current direction
 */
export function getPrevCell(
  row: number,
  col: number,
  direction: 'across' | 'down',
  cells: EditableCell[][]
): { row: number; col: number } | null {
  let prevRow = row;
  let prevCol = col;

  if (direction === 'across') {
    prevCol--;
  } else {
    prevRow--;
  }

  // Skip black cells
  while (
    prevRow >= 0 &&
    prevCol >= 0 &&
    cells[prevRow][prevCol].isBlack
  ) {
    if (direction === 'across') {
      prevCol--;
    } else {
      prevRow--;
    }
  }

  if (prevRow < 0 || prevCol < 0) {
    return null;
  }

  return { row: prevRow, col: prevCol };
}

/**
 * Get cell by arrow key direction
 */
export function getCellInDirection(
  row: number,
  col: number,
  key: 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight',
  cells: EditableCell[][]
): { row: number; col: number } | null {
  let nextRow = row;
  let nextCol = col;

  switch (key) {
    case 'ArrowUp':
      nextRow--;
      break;
    case 'ArrowDown':
      nextRow++;
      break;
    case 'ArrowLeft':
      nextCol--;
      break;
    case 'ArrowRight':
      nextCol++;
      break;
  }

  if (nextRow < 0 || nextRow >= GRID_SIZE || nextCol < 0 || nextCol >= GRID_SIZE) {
    return null;
  }

  return { row: nextRow, col: nextCol };
}

/**
 * Extract pattern from row for constraint suggestions
 * Returns pattern like "A__AH" where _ is unknown
 */
export function getRowPattern(cells: EditableCell[][], row: number): string {
  let pattern = '';
  for (let col = 0; col < GRID_SIZE; col++) {
    const cell = cells[row][col];
    if (cell.isBlack) {
      pattern += '#';
    } else if (cell.letter) {
      pattern += cell.letter;
    } else {
      pattern += '_';
    }
  }
  return pattern;
}

/**
 * Extract pattern from column for constraint suggestions
 */
export function getColPattern(cells: EditableCell[][], col: number): string {
  let pattern = '';
  for (let row = 0; row < GRID_SIZE; row++) {
    const cell = cells[row][col];
    if (cell.isBlack) {
      pattern += '#';
    } else if (cell.letter) {
      pattern += cell.letter;
    } else {
      pattern += '_';
    }
  }
  return pattern;
}

/**
 * Get the pattern for the current word based on selection and direction
 */
export function getCurrentWordPattern(
  cells: EditableCell[][],
  row: number,
  col: number,
  direction: 'across' | 'down'
): { pattern: string; startRow: number; startCol: number; length: number } | null {
  if (cells[row][col].isBlack) {
    return null;
  }

  let startRow = row;
  let startCol = col;

  // Find start of word
  if (direction === 'across') {
    while (startCol > 0 && !cells[row][startCol - 1].isBlack) {
      startCol--;
    }
  } else {
    while (startRow > 0 && !cells[startRow - 1][col].isBlack) {
      startRow--;
    }
  }

  // Build pattern
  let pattern = '';
  let r = startRow;
  let c = startCol;

  while (r < GRID_SIZE && c < GRID_SIZE && !cells[r][c].isBlack) {
    const cell = cells[r][c];
    pattern += cell.letter || '_';
    if (direction === 'across') {
      c++;
    } else {
      r++;
    }
  }

  if (pattern.length < 2) {
    return null;
  }

  return {
    pattern,
    startRow,
    startCol,
    length: pattern.length,
  };
}

/**
 * Place a word in the grid
 * Returns new cells array, or null if placement fails
 */
export function placeWord(
  cells: EditableCell[][],
  word: string,
  startRow: number,
  startCol: number,
  direction: 'across' | 'down',
  source: CellSource = 'auto',
  preserveUserTyped: boolean = true
): EditableCell[][] | null {
  const upperWord = word.toUpperCase();
  const newCells = cells.map(row => row.map(cell => ({ ...cell })));

  for (let i = 0; i < upperWord.length; i++) {
    const r = direction === 'down' ? startRow + i : startRow;
    const c = direction === 'across' ? startCol + i : startCol;

    if (r >= GRID_SIZE || c >= GRID_SIZE) {
      return null; // Word doesn't fit
    }

    const cell = newCells[r][c];

    if (cell.isBlack) {
      return null; // Can't place on black cell
    }

    // If preserveUserTyped is true, don't overwrite user-typed letters
    if (preserveUserTyped && cell.source === 'user' && cell.letter !== upperWord[i]) {
      return null; // Conflicts with user-typed letter
    }

    // If there's already a letter and it doesn't match, fail
    if (cell.letter && cell.letter !== upperWord[i]) {
      return null; // Conflicts with existing letter
    }

    newCells[r][c] = {
      ...cell,
      letter: upperWord[i],
      source: cell.source === 'user' ? 'user' : source,
    };
  }

  return newCells;
}

/**
 * Calculate cell numbers for the grid
 */
export function calculateCellNumbers(cells: EditableCell[][]): EditableCell[][] {
  let number = 1;
  const newCells = cells.map(row => row.map(cell => ({ ...cell, number: null as number | null })));

  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const cell = newCells[r][c];
      if (cell.isBlack) continue;

      // Check if this cell starts an across or down word
      const startsAcross =
        (c === 0 || newCells[r][c - 1].isBlack) &&
        c + 1 < GRID_SIZE &&
        !newCells[r][c + 1].isBlack;

      const startsDown =
        (r === 0 || newCells[r - 1][c].isBlack) &&
        r + 1 < GRID_SIZE &&
        !newCells[r + 1][c].isBlack;

      if (startsAcross || startsDown) {
        newCells[r][c].number = number++;
      }
    }
  }

  return newCells;
}

/**
 * Convert EditableGrid to GeneratedPuzzle grid format
 */
export function toGeneratedPuzzleGrid(
  cells: EditableCell[][]
): { type: 'empty' | 'black' | 'letter'; solution?: string; number?: number }[][] {
  const numberedCells = calculateCellNumbers(cells);

  return numberedCells.map(row =>
    row.map(cell => {
      if (cell.isBlack) {
        return { type: 'black' as const };
      }
      if (cell.letter) {
        return {
          type: 'letter' as const,
          solution: cell.letter,
          number: cell.number || undefined,
        };
      }
      return {
        type: 'empty' as const,
        number: cell.number || undefined,
      };
    })
  );
}

/**
 * Placement candidate with scoring
 */
interface PlacementCandidate {
  row: number;
  col: number;
  direction: 'across' | 'down';
  intersections: number;
  score: number;
}

/**
 * Find the best position to place a word in the grid.
 * Prioritizes positions with:
 * 1. Most intersections with existing letters
 * 2. More central positions
 * 3. Alternating direction from last placed word
 *
 * Returns the best placement or null if word cannot fit.
 */
export function findBestPlacement(
  cells: EditableCell[][],
  word: string,
  preferDirection?: 'across' | 'down'
): PlacementCandidate | null {
  const upperWord = word.toUpperCase();
  const wordLen = upperWord.length;
  const candidates: PlacementCandidate[] = [];

  // Check all horizontal positions
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c <= GRID_SIZE - wordLen; c++) {
      const result = evaluatePlacement(cells, upperWord, r, c, 'across');
      if (result.valid) {
        candidates.push({
          row: r,
          col: c,
          direction: 'across',
          intersections: result.intersections,
          score: result.score,
        });
      }
    }
  }

  // Check all vertical positions
  for (let r = 0; r <= GRID_SIZE - wordLen; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const result = evaluatePlacement(cells, upperWord, r, c, 'down');
      if (result.valid) {
        candidates.push({
          row: r,
          col: c,
          direction: 'down',
          intersections: result.intersections,
          score: result.score,
        });
      }
    }
  }

  if (candidates.length === 0) {
    return null;
  }

  // Sort by score (higher is better)
  candidates.sort((a, b) => {
    // Prefer direction if specified
    if (preferDirection) {
      if (a.direction === preferDirection && b.direction !== preferDirection) return -1;
      if (b.direction === preferDirection && a.direction !== preferDirection) return 1;
    }
    // Then by score
    return b.score - a.score;
  });

  return candidates[0];
}

/**
 * Evaluate a potential word placement
 */
function evaluatePlacement(
  cells: EditableCell[][],
  word: string,
  startRow: number,
  startCol: number,
  direction: 'across' | 'down'
): { valid: boolean; intersections: number; score: number } {
  let intersections = 0;
  let emptyCount = 0;

  for (let i = 0; i < word.length; i++) {
    const r = direction === 'down' ? startRow + i : startRow;
    const c = direction === 'across' ? startCol + i : startCol;

    if (r >= GRID_SIZE || c >= GRID_SIZE) {
      return { valid: false, intersections: 0, score: 0 };
    }

    const cell = cells[r][c];

    if (cell.isBlack) {
      return { valid: false, intersections: 0, score: 0 };
    }

    if (cell.letter) {
      if (cell.letter.toUpperCase() === word[i]) {
        intersections++;
      } else {
        // Conflict with existing letter
        return { valid: false, intersections: 0, score: 0 };
      }
    } else {
      emptyCount++;
    }
  }

  // Must have at least one empty cell to place (unless it's all intersections)
  if (emptyCount === 0 && intersections === 0) {
    return { valid: false, intersections: 0, score: 0 };
  }

  // Calculate score
  let score = 0;

  // Heavily reward intersections (connected words are better)
  score += intersections * 100;

  // Reward central positions (center of 5x5 is at 2,2)
  const centerR = (direction === 'down' ? startRow + word.length / 2 : startRow);
  const centerC = (direction === 'across' ? startCol + word.length / 2 : startCol);
  const distFromCenter = Math.abs(centerR - 2) + Math.abs(centerC - 2);
  score += (4 - distFromCenter) * 10; // Max 40 points for center

  // Slight bonus for filling more empty cells
  score += emptyCount * 5;

  // If grid is empty, prefer first word in a good starting position
  if (intersections === 0) {
    // Prefer starting positions that allow cross words
    if (direction === 'across' && startRow === 0) score += 20;
    if (direction === 'down' && startCol === 0) score += 20;
  }

  return { valid: true, intersections, score };
}

/**
 * Try to place a word in the grid at the best position.
 * Returns the new cells array if successful, or null if placement fails.
 */
export function placeWordAtBestPosition(
  cells: EditableCell[][],
  word: string,
  preferDirection?: 'across' | 'down'
): { cells: EditableCell[][]; placement: PlacementCandidate } | null {
  const placement = findBestPlacement(cells, word, preferDirection);
  if (!placement) {
    return null;
  }

  const newCells = placeWord(
    cells,
    word,
    placement.row,
    placement.col,
    placement.direction,
    'auto',
    true // Preserve user-typed letters
  );

  if (!newCells) {
    return null;
  }

  return { cells: newCells, placement };
}
