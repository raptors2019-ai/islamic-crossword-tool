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
