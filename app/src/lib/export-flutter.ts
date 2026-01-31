/**
 * Flutter JSON Export for My Islam App
 *
 * Generates the specific JSON format required for crossword puzzles
 * in the Flutter-based My Islam mobile application.
 */

import { GeneratedPuzzle } from './types';

export interface FlutterCrosswordJson {
  code: string;
  type: 'CROSSWORD';
  title: string;
  description: string;
  theme: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  data: {
    grid: {
      rows: number;
      cols: number;
      cells: string[][];
    };
    clues: {
      across: FlutterClue[];
      down: FlutterClue[];
    };
    cellNumbers: FlutterCellNumber[];
  };
  metadata: {
    estimatedTime: number;
    pointsPerWord: number;
    bonusForCompletion: number;
    hintsAllowed: number;
  };
}

interface FlutterClue {
  number: number;
  clue: string;
  answer: string;
  startPosition: {
    row: number;
    col: number;
  };
  length: number;
}

interface FlutterCellNumber {
  row: number;
  col: number;
  number: number;
}

/**
 * Convert a GeneratedPuzzle to Flutter JSON format.
 *
 * @param puzzle - The generated puzzle from the crossword generator
 * @param theme - Theme name (e.g., "prophets", "ramadan")
 * @param title - Puzzle title
 * @param puzzleCode - Optional custom puzzle code (auto-generated if not provided)
 */
export function exportFlutterJson(
  puzzle: GeneratedPuzzle,
  theme: string = 'prophets',
  title?: string,
  puzzleCode?: string
): FlutterCrosswordJson {
  const { metadata, grid, clues } = puzzle;

  // Build cells array (letters or "#" for black/empty cells)
  const cells: string[][] = grid.map(row =>
    row.map(cell => {
      if (cell.type === 'black' || cell.type === 'empty') {
        return '#';
      }
      return cell.solution || '#';
    })
  );

  // Convert clue to Flutter format
  const toFlutterClue = (clue: typeof clues.across[0]): FlutterClue => ({
    number: clue.number,
    clue: clue.clue,
    answer: clue.answer,
    startPosition: { row: clue.row, col: clue.col },
    length: clue.length,
  });

  const acrossClues = clues.across.map(toFlutterClue);
  const downClues = clues.down.map(toFlutterClue);

  // Build cell numbers array (positions where clue numbers appear)
  const numberedCells = new Set<string>();
  const cellNumbers: FlutterCellNumber[] = [];

  // Collect all numbered cells from clues
  [...clues.across, ...clues.down].forEach(clue => {
    const key = `${clue.row},${clue.col}`;
    if (!numberedCells.has(key)) {
      numberedCells.add(key);
      cellNumbers.push({
        row: clue.row,
        col: clue.col,
        number: clue.number,
      });
    }
  });

  // Sort by number
  cellNumbers.sort((a, b) => a.number - b.number);

  // Generate puzzle code if not provided
  const code = puzzleCode || generatePuzzleCode(theme);

  // Determine difficulty based on word count and grid size
  const difficulty = determineDifficulty(metadata.wordCount, metadata.rows);

  return {
    code,
    type: 'CROSSWORD',
    title: title || metadata.title,
    description: `Complete the crossword about ${theme.replace(/-/g, ' ')}.`,
    theme: theme.toLowerCase().replace(/\s+/g, '-'),
    difficulty,
    data: {
      grid: {
        rows: metadata.rows,
        cols: metadata.cols,
        cells,
      },
      clues: {
        across: acrossClues,
        down: downClues,
      },
      cellNumbers,
    },
    metadata: {
      estimatedTime: calculateEstimatedTime(metadata.wordCount),
      pointsPerWord: 15,
      bonusForCompletion: 50,
      hintsAllowed: 3,
    },
  };
}

/**
 * Generate a puzzle code in the format: PUZ_CROSSWORD_THEME_XXX
 */
function generatePuzzleCode(theme: string): string {
  const themeCode = theme.toUpperCase().replace(/[^A-Z0-9]/g, '_');
  const timestamp = Date.now().toString(36).toUpperCase().slice(-3);
  return `PUZ_CROSSWORD_${themeCode}_${timestamp}`;
}

/**
 * Determine puzzle difficulty based on characteristics.
 */
function determineDifficulty(wordCount: number, gridSize: number): 'EASY' | 'MEDIUM' | 'HARD' {
  if (gridSize <= 5 && wordCount <= 5) return 'EASY';
  if (gridSize <= 7 && wordCount <= 8) return 'MEDIUM';
  return 'HARD';
}

/**
 * Calculate estimated completion time in seconds.
 */
function calculateEstimatedTime(wordCount: number): number {
  // Roughly 30-60 seconds per word for a casual player
  return Math.round(wordCount * 45);
}

/**
 * Download the Flutter JSON as a file.
 */
export function downloadFlutterJson(
  puzzle: GeneratedPuzzle,
  theme: string = 'prophets',
  title?: string
): void {
  const flutterJson = exportFlutterJson(puzzle, theme, title);
  const jsonString = JSON.stringify(flutterJson, null, 2);

  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `${flutterJson.code}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Get Flutter JSON as a formatted string (for display/copying).
 */
export function getFlutterJsonString(
  puzzle: GeneratedPuzzle,
  theme: string = 'prophets',
  title?: string
): string {
  const flutterJson = exportFlutterJson(puzzle, theme, title);
  return JSON.stringify(flutterJson, null, 2);
}
