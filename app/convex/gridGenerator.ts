/**
 * 5x5 Grid Generator for Islamic Crossword Puzzles
 *
 * Ported from Python Grid5x5Generator (src/generator.py)
 *
 * Features:
 * - 8 black square patterns with symmetry
 * - Seed word placement in row 0
 * - Intersection-based word placement
 * - Grid scoring (words placed, intersections, fill density)
 */

import { v } from "convex/values";
import { action } from "./_generated/server";

// Direction enum
type Direction = "ACROSS" | "DOWN";

// Cell in the grid
interface Cell {
  letter: string | null;
  isBlack: boolean;
  number: number | null;
}

// Placed word data
interface PlacedWord {
  word: string;
  clue: string;
  row: number;
  col: number;
  direction: Direction;
  number: number;
}

// Word input from client
interface WordInput {
  id: string;
  word: string;
  clue: string;
  activeSpelling: string;
}

// Grid generation result
interface GenerationResult {
  success: boolean;
  grid: {
    type: "empty" | "black" | "letter";
    solution?: string;
    number?: number;
  }[][];
  placedWords: PlacedWord[];
  placedWordIds: string[];
  unplacedWordIds: string[];
  clues: {
    across: {
      number: number;
      clue: string;
      answer: string;
      row: number;
      col: number;
      length: number;
    }[];
    down: {
      number: number;
      clue: string;
      answer: string;
      row: number;
      col: number;
      length: number;
    }[];
  };
  statistics: {
    gridFillPercentage: number;
    wordPlacementRate: number;
    totalIntersections: number;
    avgIntersectionsPerWord: number;
    gridConnectivity: number;
    totalCells: number;
    filledCells: number;
    placedWordCount: number;
    totalWordCount: number;
  };
  score: number;
}

// Common 5x5 black square patterns (row, col positions)
// These get mirrored for symmetry
const BLACK_PATTERNS: [number, number][][] = [
  // Pattern 0: Single corner
  [[0, 4]],
  // Pattern 1: Two corners (diagonal)
  [[0, 4], [4, 0]],
  // Pattern 2: L-shape corner
  [[0, 4], [1, 4]],
  // Pattern 3: Cross center
  [[2, 2]],
  // Pattern 4: No black squares (dense)
  [],
  // Pattern 5: Staircase
  [[0, 4], [1, 3]],
  // Pattern 6: Two edges
  [[2, 4], [2, 0]],
  // Pattern 7: Three corners
  [[0, 4], [4, 0], [4, 4]],
];

/**
 * Create an empty 5x5 grid
 */
function createEmptyGrid(): Cell[][] {
  return Array.from({ length: 5 }, () =>
    Array.from({ length: 5 }, () => ({ letter: null, isBlack: false, number: null }))
  );
}

/**
 * Apply black square pattern with symmetry
 */
function applyBlackPattern(grid: Cell[][], pattern: [number, number][]): void {
  for (const [row, col] of pattern) {
    if (row >= 0 && row < 5 && col >= 0 && col < 5) {
      grid[row][col].isBlack = true;
    }
    // Apply point symmetry (180-degree rotation)
    const symRow = 4 - row;
    const symCol = 4 - col;
    if (symRow >= 0 && symRow < 5 && symCol >= 0 && symCol < 5) {
      grid[symRow][symCol].isBlack = true;
    }
  }
}

/**
 * Check if a word fits at a position
 */
function canPlaceWord(
  grid: Cell[][],
  word: string,
  row: number,
  col: number,
  direction: Direction
): boolean {
  const len = word.length;

  // Check bounds
  if (direction === "ACROSS") {
    if (col < 0 || col + len > 5 || row < 0 || row >= 5) return false;
  } else {
    if (row < 0 || row + len > 5 || col < 0 || col >= 5) return false;
  }

  // Check each cell
  for (let i = 0; i < len; i++) {
    const r = direction === "ACROSS" ? row : row + i;
    const c = direction === "ACROSS" ? col + i : col;

    const cell = grid[r][c];

    // Can't place on black cell
    if (cell.isBlack) return false;

    // Cell must be empty or have matching letter
    if (cell.letter !== null && cell.letter !== word[i]) return false;
  }

  // Check for adjacent parallel words (no two-letter words)
  // This is a simplified check - full validation would be more complex
  return true;
}

/**
 * Place a word in the grid
 */
function placeWord(
  grid: Cell[][],
  word: string,
  row: number,
  col: number,
  direction: Direction,
  clueNumber: number
): void {
  for (let i = 0; i < word.length; i++) {
    const r = direction === "ACROSS" ? row : row + i;
    const c = direction === "ACROSS" ? col + i : col;

    grid[r][c].letter = word[i];
    if (i === 0) {
      grid[r][c].number = clueNumber;
    }
  }
}

/**
 * Find positions where a word can intersect with existing words
 */
function findIntersections(
  grid: Cell[][],
  word: string
): { row: number; col: number; direction: Direction; intersectionCount: number }[] {
  const positions: { row: number; col: number; direction: Direction; intersectionCount: number }[] = [];

  // For each letter in the word, find matching letters in grid
  for (let wi = 0; wi < word.length; wi++) {
    const letter = word[wi];

    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        if (grid[r][c].letter === letter) {
          // Try placing across (word letter at position wi intersects at (r, c))
          const acrossCol = c - wi;
          if (canPlaceWord(grid, word, r, acrossCol, "ACROSS")) {
            // Count how many intersections this placement creates
            let count = 0;
            for (let i = 0; i < word.length; i++) {
              if (grid[r][acrossCol + i].letter === word[i]) count++;
            }
            if (count > 0) {
              positions.push({ row: r, col: acrossCol, direction: "ACROSS", intersectionCount: count });
            }
          }

          // Try placing down
          const downRow = r - wi;
          if (canPlaceWord(grid, word, downRow, c, "DOWN")) {
            let count = 0;
            for (let i = 0; i < word.length; i++) {
              if (grid[downRow + i][c].letter === word[i]) count++;
            }
            if (count > 0) {
              positions.push({ row: downRow, col: c, direction: "DOWN", intersectionCount: count });
            }
          }
        }
      }
    }
  }

  // Remove duplicates
  const unique = new Map<string, typeof positions[0]>();
  for (const pos of positions) {
    const key = `${pos.row},${pos.col},${pos.direction}`;
    const existing = unique.get(key);
    if (!existing || pos.intersectionCount > existing.intersectionCount) {
      unique.set(key, pos);
    }
  }

  return Array.from(unique.values());
}

/**
 * Count filled cells in the grid
 */
function countFilledCells(grid: Cell[][]): number {
  let count = 0;
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      if (grid[r][c].letter) count++;
    }
  }
  return count;
}

/**
 * Count intersections in the grid
 */
function countIntersections(grid: Cell[][]): number {
  let count = 0;
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      if (grid[r][c].letter) {
        const hasHorizontalNeighbor =
          (c > 0 && grid[r][c - 1].letter) || (c < 4 && grid[r][c + 1].letter);
        const hasVerticalNeighbor =
          (r > 0 && grid[r - 1][c].letter) || (r < 4 && grid[r + 1][c].letter);
        if (hasHorizontalNeighbor && hasVerticalNeighbor) {
          count++;
        }
      }
    }
  }
  return count;
}

/**
 * Score a completed grid
 */
function scoreGrid(
  grid: Cell[][],
  placedWords: PlacedWord[],
  totalWords: number
): number {
  let score = 0;

  // Word count (up to 40 points)
  score += Math.min(placedWords.length * 6, 40);

  // Intersections (up to 30 points)
  const intersections = countIntersections(grid);
  score += Math.min(intersections * 5, 30);

  // Fill density (up to 20 points)
  const filledCells = countFilledCells(grid);
  const fillPct = filledCells / 25;
  score += Math.floor(fillPct * 20);

  // Direction balance (up to 10 points)
  const across = placedWords.filter((w) => w.direction === "ACROSS").length;
  const down = placedWords.filter((w) => w.direction === "DOWN").length;
  if (across > 0 && down > 0) {
    const balance = Math.min(across, down) / Math.max(across, down);
    score += Math.floor(balance * 10);
  }

  return score;
}

/**
 * Try to generate a 5x5 puzzle with a specific black pattern
 */
function tryGenerate(
  words: WordInput[],
  pattern: [number, number][],
  maxAttempts: number = 30
): GenerationResult | null {
  // Sort words by length (longer first, as they're harder to place)
  const sortedWords = [...words].sort(
    (a, b) => b.activeSpelling.length - a.activeSpelling.length
  );

  const grid = createEmptyGrid();
  applyBlackPattern(grid, pattern);

  const placedWords: PlacedWord[] = [];
  const placedWordIds: string[] = [];
  const usedWords = new Set<string>();
  let clueNumber = 1;

  // Find a 5-letter word to start with (or longest available)
  let seedWord = sortedWords.find((w) => w.activeSpelling.length === 5);
  if (!seedWord) {
    seedWord = sortedWords[0];
  }

  if (!seedWord) return null;

  // Place seed word in row 0
  const seedSpelling = seedWord.activeSpelling.toUpperCase();
  const seedCol = Math.floor((5 - seedSpelling.length) / 2);

  if (!canPlaceWord(grid, seedSpelling, 0, seedCol, "ACROSS")) {
    // Try other positions
    for (let c = 0; c <= 5 - seedSpelling.length; c++) {
      if (canPlaceWord(grid, seedSpelling, 0, c, "ACROSS")) {
        placeWord(grid, seedSpelling, 0, c, "ACROSS", clueNumber);
        placedWords.push({
          word: seedSpelling,
          clue: seedWord.clue,
          row: 0,
          col: c,
          direction: "ACROSS",
          number: clueNumber,
        });
        placedWordIds.push(seedWord.id);
        usedWords.add(seedSpelling);
        clueNumber++;
        break;
      }
    }
  } else {
    placeWord(grid, seedSpelling, 0, seedCol, "ACROSS", clueNumber);
    placedWords.push({
      word: seedSpelling,
      clue: seedWord.clue,
      row: 0,
      col: seedCol,
      direction: "ACROSS",
      number: clueNumber,
    });
    placedWordIds.push(seedWord.id);
    usedWords.add(seedSpelling);
    clueNumber++;
  }

  if (placedWords.length === 0) return null;

  // Try to place remaining words
  let stuckCount = 0;
  const targetWords = Math.min(words.length, 8);

  while (placedWords.length < targetWords && stuckCount < maxAttempts) {
    let placed = false;

    // Shuffle remaining words for variety
    const remaining = sortedWords.filter(
      (w) => !usedWords.has(w.activeSpelling.toUpperCase())
    );

    for (let i = remaining.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
    }

    for (const wordInput of remaining) {
      const spelling = wordInput.activeSpelling.toUpperCase();
      const positions = findIntersections(grid, spelling);

      if (positions.length > 0) {
        // Sort by intersection count (more is better)
        positions.sort((a, b) => b.intersectionCount - a.intersectionCount);

        // Try top positions
        for (const pos of positions.slice(0, 5)) {
          if (canPlaceWord(grid, spelling, pos.row, pos.col, pos.direction)) {
            placeWord(grid, spelling, pos.row, pos.col, pos.direction, clueNumber);
            placedWords.push({
              word: spelling,
              clue: wordInput.clue,
              row: pos.row,
              col: pos.col,
              direction: pos.direction,
              number: clueNumber,
            });
            placedWordIds.push(wordInput.id);
            usedWords.add(spelling);
            clueNumber++;
            placed = true;
            break;
          }
        }

        if (placed) break;
      }
    }

    if (!placed) {
      stuckCount++;
    } else {
      stuckCount = 0;
    }
  }

  // Build result
  if (placedWords.length < 3) return null;

  const resultGrid = grid.map((row) =>
    row.map((cell) => {
      if (cell.isBlack) {
        return { type: "black" as const };
      } else if (cell.letter) {
        return {
          type: "letter" as const,
          solution: cell.letter,
          number: cell.number || undefined,
        };
      } else {
        return { type: "empty" as const };
      }
    })
  );

  // Calculate statistics
  const filledCells = countFilledCells(grid);
  const intersections = countIntersections(grid);
  const score = scoreGrid(grid, placedWords, words.length);

  const buildClueList = (direction: Direction) =>
    placedWords
      .filter((w) => w.direction === direction)
      .sort((a, b) => a.number - b.number)
      .map((w) => ({
        number: w.number,
        clue: w.clue,
        answer: w.word,
        row: w.row,
        col: w.col,
        length: w.word.length,
      }));

  const acrossClues = buildClueList("ACROSS");
  const downClues = buildClueList("DOWN");

  const unplacedWordIds = words
    .filter((w) => !usedWords.has(w.activeSpelling.toUpperCase()))
    .map((w) => w.id);

  return {
    success: true,
    grid: resultGrid,
    placedWords,
    placedWordIds,
    unplacedWordIds,
    clues: {
      across: acrossClues,
      down: downClues,
    },
    statistics: {
      gridFillPercentage: Math.round((filledCells / 25) * 100),
      wordPlacementRate: Math.round((placedWords.length / words.length) * 100),
      totalIntersections: intersections,
      avgIntersectionsPerWord:
        placedWords.length > 0
          ? Math.round((intersections / placedWords.length) * 10) / 10
          : 0,
      gridConnectivity: Math.round(
        (intersections / placedWords.length) * 10 +
          (filledCells / 25) * 20 +
          placedWords.length * 2
      ),
      totalCells: 25,
      filledCells,
      placedWordCount: placedWords.length,
      totalWordCount: words.length,
    },
    score,
  };
}

/**
 * Generate a 5x5 crossword puzzle
 *
 * Tries multiple black patterns and returns the best result
 */
export const generate5x5 = action({
  args: {
    words: v.array(
      v.object({
        id: v.string(),
        word: v.string(),
        clue: v.string(),
        activeSpelling: v.string(),
      })
    ),
    targetWords: v.optional(v.number()),
    maxAttempts: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { words, targetWords = 6, maxAttempts = 50 } = args;

    // Filter words to 5 letters or less
    const validWords = words.filter((w) => w.activeSpelling.length <= 5);

    if (validWords.length < 3) {
      return {
        success: false,
        error: "Need at least 3 words (5 letters or less) to generate a puzzle",
      };
    }

    let bestResult: GenerationResult | null = null;
    let bestScore = 0;

    // Try each pattern multiple times
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const patternIndex = attempt % BLACK_PATTERNS.length;
      const pattern = BLACK_PATTERNS[patternIndex];

      const result = tryGenerate(validWords, pattern, 30);

      if (result && result.score > bestScore) {
        bestResult = result;
        bestScore = result.score;

        // Good enough? Stop early
        if (
          result.placedWords.length >= targetWords &&
          result.statistics.gridFillPercentage >= 60 &&
          bestScore >= 70
        ) {
          break;
        }
      }
    }

    if (!bestResult) {
      return {
        success: false,
        error: "Failed to generate a valid puzzle. Try different words.",
      };
    }

    return bestResult;
  },
});
