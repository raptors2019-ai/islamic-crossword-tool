export interface Word {
  id: string;
  word: string;
  clue: string;
  score: number;
  spellingVariants?: string[];
  arabicScript?: string;
  category?: 'names-of-allah' | 'prophets' | 'quran' | 'general' | 'companions';
}

export interface PlacedWord {
  word: Word;
  row: number;
  col: number;
  direction: 'across' | 'down';
  number: number;
}

export interface Cell {
  letter: string | null;
  number: number | null;
  isBlack: boolean;
  wordIds: string[]; // IDs of words that pass through this cell
}

export interface Puzzle {
  id: string;
  title: string;
  author: string;
  createdAt: Date;
  grid: Cell[][];
  placedWords: PlacedWord[];
  rows: number;
  cols: number;
}

export interface ClueStatus {
  wordId: string;
  status: 'good' | 'needs-review' | 'missing';
  issues?: string[];
}

export type Difficulty = 'easy' | 'medium' | 'hard';

// Grid size constraints
export type GridSize = '5x5' | '7x7' | '9x9' | 'freeform';

export interface GridConstraints {
  size: GridSize;
  maxWordLength: number;
  minWordLength: number;
  targetWordCount: number;
}

// Default constraints for 5x5 puzzles (Azmat's format)
export const GRID_5X5_CONSTRAINTS: GridConstraints = {
  size: '5x5',
  maxWordLength: 5,
  minWordLength: 2,
  targetWordCount: 6,
};

// Theme word for puzzle building - tracks spelling variants and which is active
export interface ThemeWord {
  id: string;
  word: string; // Primary spelling (used in puzzle)
  clue: string;
  arabicScript?: string;
  spellingVariants?: string[]; // All available spellings (including primary)
  activeSpelling: string; // Currently selected spelling for the puzzle
  category?: 'names-of-allah' | 'prophets' | 'quran' | 'general' | 'companions';
}

// Result from puzzle generation
export interface GeneratedPuzzle {
  metadata: {
    title: string;
    author: string;
    date: string;
    rows: number;
    cols: number;
    wordCount: number;
  };
  grid: {
    type: 'empty' | 'black' | 'letter';
    solution?: string;
    number?: number;
  }[][];
  clues: {
    across: GeneratedClue[];
    down: GeneratedClue[];
  };
  placedWordIds: string[]; // IDs of theme words that were placed
  unplacedWordIds: string[]; // IDs of theme words that couldn't fit
  statistics: PuzzleStatistics; // Quality metrics for the puzzle
  fillerSuggestions: FillerSuggestion[]; // Suggestions for unplaced words
}

export interface GeneratedClue {
  number: number;
  clue: string;
  answer: string;
  row: number;
  col: number;
  length: number;
}

// Statistics for puzzle quality assessment
export interface PuzzleStatistics {
  gridFillPercentage: number;      // % of grid cells filled with letters
  wordPlacementRate: number;       // % of theme words successfully placed
  totalIntersections: number;      // number of crossing points
  avgIntersectionsPerWord: number; // quality metric - more crossings = better
  gridConnectivity: number;        // "Grid Flow" score (like Crosserville)
  totalCells: number;              // total cells in grid
  filledCells: number;             // cells with letters
  placedWordCount: number;         // number of words placed
  totalWordCount: number;          // total words attempted
}

// Suggestion for replacing an unplaced word
export interface FillerSuggestion {
  wordId: string;           // ID of unplaced word
  originalWord: string;     // The word that couldn't be placed
  originalLength: number;   // Length of original word
  suggestions: {
    word: string;
    clue: string;
    length: number;
    score: number;          // Quality score (higher = better)
    source: 'islamic' | 'common';  // Where the word came from
    arabicScript?: string;
  }[];
  variants?: {              // Spelling variants that might fit better
    word: string;
    length: number;
  }[];
  reason: 'too_long' | 'no_fit' | 'conflicts';  // Why it couldn't be placed
}
