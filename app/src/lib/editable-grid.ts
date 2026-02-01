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

// ============================================================================
// BLACK SQUARE HELPERS
// ============================================================================

/**
 * Add symmetric black squares (180° point symmetry)
 * For a 5x5 grid, position (r, c) mirrors to (4-r, 4-c)
 */
export function addSymmetricBlack(
  cells: EditableCell[][],
  row: number,
  col: number
): EditableCell[][] {
  const newCells = cells.map((r) => r.map((c) => ({ ...c })));

  // Primary position
  if (row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE) {
    newCells[row][col] = {
      ...newCells[row][col],
      isBlack: true,
      letter: null,
      source: 'empty',
    };
  }

  // Mirror position (180° rotation)
  const mirrorRow = GRID_SIZE - 1 - row;
  const mirrorCol = GRID_SIZE - 1 - col;

  if (mirrorRow >= 0 && mirrorRow < GRID_SIZE && mirrorCol >= 0 && mirrorCol < GRID_SIZE) {
    newCells[mirrorRow][mirrorCol] = {
      ...newCells[mirrorRow][mirrorCol],
      isBlack: true,
      letter: null,
      source: 'empty',
    };
  }

  return newCells;
}

/**
 * Check if adding a black square at a position would break an existing word
 */
export function wouldBreakWord(
  cells: EditableCell[][],
  row: number,
  col: number
): boolean {
  // Can't place black on a cell with a letter
  if (cells[row][col].letter) {
    return true;
  }

  // Check mirror position too
  const mirrorRow = GRID_SIZE - 1 - row;
  const mirrorCol = GRID_SIZE - 1 - col;

  if (
    mirrorRow >= 0 &&
    mirrorRow < GRID_SIZE &&
    mirrorCol >= 0 &&
    mirrorCol < GRID_SIZE &&
    cells[mirrorRow][mirrorCol].letter
  ) {
    return true;
  }

  return false;
}

/**
 * Check if all white cells in the grid are connected (no isolated regions)
 * Uses BFS to verify connectivity
 */
export function validateConnectivity(cells: EditableCell[][]): boolean {
  // Find first non-black cell
  let startR = -1;
  let startC = -1;

  for (let r = 0; r < GRID_SIZE && startR === -1; r++) {
    for (let c = 0; c < GRID_SIZE && startC === -1; c++) {
      if (!cells[r][c].isBlack) {
        startR = r;
        startC = c;
      }
    }
  }

  // If no white cells, trivially connected
  if (startR === -1) return true;

  // Count total white cells
  let totalWhite = 0;
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (!cells[r][c].isBlack) totalWhite++;
    }
  }

  // BFS from start cell
  const visited = new Set<string>();
  const queue = [{ r: startR, c: startC }];
  visited.add(`${startR},${startC}`);

  while (queue.length > 0) {
    const { r, c } = queue.shift()!;

    // Check 4-neighbors
    const neighbors = [
      { r: r - 1, c },
      { r: r + 1, c },
      { r, c: c - 1 },
      { r, c: c + 1 },
    ];

    for (const n of neighbors) {
      if (
        n.r >= 0 &&
        n.r < GRID_SIZE &&
        n.c >= 0 &&
        n.c < GRID_SIZE &&
        !cells[n.r][n.c].isBlack &&
        !visited.has(`${n.r},${n.c}`)
      ) {
        visited.add(`${n.r},${n.c}`);
        queue.push(n);
      }
    }
  }

  // All white cells should be reachable
  return visited.size === totalWhite;
}

/**
 * Suggest black square positions to bound short words
 * Returns positions where adding a black square would:
 * 1. Not break existing words
 * 2. Maintain grid connectivity
 * 3. Help bound slots that are too short or invalid
 */
export function suggestBlackSquares(
  cells: EditableCell[][],
  placedWords: { row: number; col: number; direction: 'across' | 'down'; length: number }[]
): { row: number; col: number; reason: string }[] {
  const suggestions: { row: number; col: number; reason: string }[] = [];

  // Find cells that are adjacent to word ends and empty
  for (const word of placedWords) {
    // Check position after word end
    let endR = word.direction === 'down' ? word.row + word.length : word.row;
    let endC = word.direction === 'across' ? word.col + word.length : word.col;

    // Position after word
    if (endR < GRID_SIZE && endC < GRID_SIZE) {
      const cell = cells[endR][endC];
      if (!cell.isBlack && !cell.letter) {
        // Check if adding black here would help
        const testCells = addSymmetricBlack(cells, endR, endC);
        if (validateConnectivity(testCells)) {
          suggestions.push({
            row: endR,
            col: endC,
            reason: `Bound end of ${word.direction} word`,
          });
        }
      }
    }

    // Position before word start
    let beforeR = word.direction === 'down' ? word.row - 1 : word.row;
    let beforeC = word.direction === 'across' ? word.col - 1 : word.col;

    if (beforeR >= 0 && beforeC >= 0) {
      const cell = cells[beforeR][beforeC];
      if (!cell.isBlack && !cell.letter) {
        const testCells = addSymmetricBlack(cells, beforeR, beforeC);
        if (validateConnectivity(testCells)) {
          suggestions.push({
            row: beforeR,
            col: beforeC,
            reason: `Bound start of ${word.direction} word`,
          });
        }
      }
    }
  }

  // Remove duplicates
  const seen = new Set<string>();
  return suggestions.filter((s) => {
    const key = `${s.row},${s.col}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Common black square patterns for 5x5 grids
 * Each pattern is defined by the primary positions (symmetry is auto-applied)
 */
export const BLACK_SQUARE_PATTERNS: {
  name: string;
  positions: [number, number][];
}[] = [
  { name: 'open', positions: [] },
  { name: 'single-corner', positions: [[0, 4]] },
  { name: 'diagonal-corners', positions: [[0, 4], [4, 0]] },
  { name: 'L-shape', positions: [[0, 4], [1, 4]] },
  { name: 'center', positions: [[2, 2]] },
  { name: 'staircase', positions: [[0, 4], [1, 3]] },
  { name: 'edge-middle', positions: [[2, 4], [2, 0]] },
  { name: 'three-corners', positions: [[0, 4], [4, 0], [4, 4]] },
];

/**
 * Apply a black square pattern to the grid
 */
export function applyBlackPattern(
  cells: EditableCell[][],
  patternIndex: number
): EditableCell[][] {
  if (patternIndex < 0 || patternIndex >= BLACK_SQUARE_PATTERNS.length) {
    return cells;
  }

  let newCells = cells.map((row) => row.map((cell) => ({ ...cell })));

  // Clear existing black squares first
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (newCells[r][c].isBlack && !newCells[r][c].letter) {
        newCells[r][c] = {
          ...newCells[r][c],
          isBlack: false,
        };
      }
    }
  }

  // Apply pattern
  const pattern = BLACK_SQUARE_PATTERNS[patternIndex];
  for (const [row, col] of pattern.positions) {
    newCells = addSymmetricBlack(newCells, row, col);
  }

  return newCells;
}

/**
 * Find the best black square pattern for the current grid state
 * Tries each pattern and scores by:
 * 1. Number of valid slots created
 * 2. Whether it preserves existing letters
 */
export function findBestBlackPattern(
  cells: EditableCell[][]
): { patternIndex: number; score: number } {
  let bestPattern = 0;
  let bestScore = -Infinity;

  for (let i = 0; i < BLACK_SQUARE_PATTERNS.length; i++) {
    const testCells = applyBlackPattern(cells, i);

    // Check if pattern is valid (doesn't cover letters)
    let valid = true;
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (testCells[r][c].isBlack && cells[r][c].letter) {
          valid = false;
          break;
        }
      }
      if (!valid) break;
    }

    if (!valid) continue;

    // Check connectivity
    if (!validateConnectivity(testCells)) continue;

    // Score: count white cells (more = better for word placement)
    let whiteCount = 0;
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (!testCells[r][c].isBlack) whiteCount++;
      }
    }

    // Bonus for patterns that create good slot lengths
    let score = whiteCount;

    if (score > bestScore) {
      bestScore = score;
      bestPattern = i;
    }
  }

  return { patternIndex: bestPattern, score: bestScore };
}

/**
 * Remove a word from the grid by finding and clearing its letters
 * Only removes letters that spell the word contiguously (across or down)
 *
 * @param cells The grid cells
 * @param word The word to remove
 * @param forceRemove If true, removes all letters even if shared with perpendicular words.
 *                    Useful for auto-generated puzzles where words are interconnected.
 */
export function removeWordFromGrid(
  cells: EditableCell[][],
  word: string,
  forceRemove: boolean = false
): EditableCell[][] {
  const upperWord = word.toUpperCase();
  const newCells = cells.map((row) => row.map((cell) => ({ ...cell })));

  // Search for the word across
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c <= GRID_SIZE - upperWord.length; c++) {
      let match = true;
      for (let i = 0; i < upperWord.length && match; i++) {
        if (newCells[r][c + i].letter !== upperWord[i]) {
          match = false;
        }
      }
      if (match) {
        // Found the word, clear it
        for (let i = 0; i < upperWord.length; i++) {
          const cell = newCells[r][c + i];

          if (forceRemove) {
            // Force remove: clear regardless of perpendicular usage
            newCells[r][c + i] = {
              ...cell,
              letter: null,
              source: 'empty',
            };
          } else {
            // Check if letter is used in a perpendicular word
            let usedPerpendicular = false;
            // Check above and below
            if (
              (r > 0 && newCells[r - 1][c + i].letter) ||
              (r < GRID_SIZE - 1 && newCells[r + 1][c + i].letter)
            ) {
              usedPerpendicular = true;
            }
            if (!usedPerpendicular) {
              newCells[r][c + i] = {
                ...cell,
                letter: null,
                source: 'empty',
              };
            }
          }
        }
        return newCells;
      }
    }
  }

  // Search for the word down
  for (let r = 0; r <= GRID_SIZE - upperWord.length; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      let match = true;
      for (let i = 0; i < upperWord.length && match; i++) {
        if (newCells[r + i][c].letter !== upperWord[i]) {
          match = false;
        }
      }
      if (match) {
        // Found the word, clear it
        for (let i = 0; i < upperWord.length; i++) {
          const cell = newCells[r + i][c];

          if (forceRemove) {
            // Force remove: clear regardless of perpendicular usage
            newCells[r + i][c] = {
              ...cell,
              letter: null,
              source: 'empty',
            };
          } else {
            // Check if letter is used in a perpendicular word
            let usedPerpendicular = false;
            // Check left and right
            if (
              (c > 0 && newCells[r + i][c - 1].letter) ||
              (c < GRID_SIZE - 1 && newCells[r + i][c + 1].letter)
            ) {
              usedPerpendicular = true;
            }
            if (!usedPerpendicular) {
              newCells[r + i][c] = {
                ...cell,
                letter: null,
                source: 'empty',
              };
            }
          }
        }
        return newCells;
      }
    }
  }

  return newCells;
}

/**
 * Regenerate a word in the grid by finding an alternative valid word.
 * Only changes letters that aren't locked by perpendicular words.
 *
 * @param cells The current grid cells
 * @param word The word to regenerate (with position and direction)
 * @param wordIndex The word index to find alternatives
 * @param excludeWords Optional set of words to exclude from alternatives
 * @returns New grid with replacement word, or null if no alternative found
 */
export function regenerateWord(
  cells: EditableCell[][],
  word: { word: string; row: number; col: number; direction: 'across' | 'down' },
  wordIndex: { matchPattern: (pattern: string) => string[] },
  excludeWords?: Set<string>
): { newWord: string; newCells: EditableCell[][] } | null {
  const { row, col, direction } = word;
  const upperWord = word.word.toUpperCase();
  const length = upperWord.length;

  // Build pattern with locked letters (intersections with perpendicular words)
  let pattern = '';
  const lockedPositions: boolean[] = [];

  for (let i = 0; i < length; i++) {
    const r = direction === 'down' ? row + i : row;
    const c = direction === 'across' ? col + i : col;

    if (r >= GRID_SIZE || c >= GRID_SIZE) {
      return null; // Word extends beyond grid
    }

    const cell = cells[r][c];
    if (!cell.letter) {
      return null; // Word has gaps - shouldn't happen for complete words
    }

    // Check if this letter is used by a perpendicular word
    let isLocked = false;

    if (direction === 'across') {
      // Check for down word through this cell
      const hasAbove = r > 0 && !cells[r - 1][c].isBlack && cells[r - 1][c].letter;
      const hasBelow = r < GRID_SIZE - 1 && !cells[r + 1][c].isBlack && cells[r + 1][c].letter;
      isLocked = !!(hasAbove || hasBelow);
    } else {
      // Check for across word through this cell
      const hasLeft = c > 0 && !cells[r][c - 1].isBlack && cells[r][c - 1].letter;
      const hasRight = c < GRID_SIZE - 1 && !cells[r][c + 1].isBlack && cells[r][c + 1].letter;
      isLocked = !!(hasLeft || hasRight);
    }

    if (isLocked) {
      pattern += cell.letter;
    } else {
      pattern += '_';
    }
    lockedPositions.push(isLocked);
  }

  // Get candidates matching the pattern
  const candidates = wordIndex.matchPattern(pattern);

  // Filter out current word and excluded words
  const excludeSet = new Set<string>(excludeWords || []);
  excludeSet.add(upperWord);

  const validCandidates = candidates.filter(
    (candidate) => !excludeSet.has(candidate.toUpperCase())
  );

  if (validCandidates.length === 0) {
    return null; // No alternatives available
  }

  // Pick a random alternative
  const randomIndex = Math.floor(Math.random() * validCandidates.length);
  const newWord = validCandidates[randomIndex];

  // Write the new word to the grid
  const newCells = cells.map((r) => r.map((c) => ({ ...c })));

  for (let i = 0; i < length; i++) {
    const r = direction === 'down' ? row + i : row;
    const c = direction === 'across' ? col + i : col;

    // Only update non-locked positions
    if (!lockedPositions[i]) {
      newCells[r][c] = {
        ...newCells[r][c],
        letter: newWord[i].toUpperCase(),
        source: 'auto',
      };
    }
  }

  return { newWord: newWord.toUpperCase(), newCells };
}

/**
 * Count filled and empty cells
 */
export function getGridStats(cells: EditableCell[][]): {
  totalCells: number;
  whiteCells: number;
  blackCells: number;
  filledCells: number;
  emptyCells: number;
} {
  let whiteCells = 0;
  let blackCells = 0;
  let filledCells = 0;

  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (cells[r][c].isBlack) {
        blackCells++;
      } else {
        whiteCells++;
        if (cells[r][c].letter) {
          filledCells++;
        }
      }
    }
  }

  return {
    totalCells: GRID_SIZE * GRID_SIZE,
    whiteCells,
    blackCells,
    filledCells,
    emptyCells: whiteCells - filledCells,
  };
}
