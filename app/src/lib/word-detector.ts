/**
 * Word Detector
 * Scans grid for complete words and matches against dictionary
 */

import { EditableCell, GRID_SIZE } from './editable-grid';
import { sampleWords } from './sample-data';

export interface DetectedWord {
  word: string;
  row: number;
  col: number;
  direction: 'across' | 'down';
  length: number;
  isValid: boolean; // Whether it matches a dictionary word
  clue?: string;
  category?: string;
  source: 'user' | 'auto' | 'mixed';
}

/**
 * Build a set of valid words from sample data (2-5 letters for 5x5)
 */
function buildDictionary(): Map<string, { clue: string; category?: string }> {
  const dict = new Map<string, { clue: string; category?: string }>();

  for (const word of sampleWords) {
    if (word.word.length >= 2 && word.word.length <= 5) {
      dict.set(word.word.toUpperCase(), {
        clue: word.clue,
        category: word.category,
      });
    }
  }

  return dict;
}

const DICTIONARY = buildDictionary();

/**
 * Check if a word is in the dictionary
 */
export function isValidWord(word: string): boolean {
  return DICTIONARY.has(word.toUpperCase());
}

/**
 * Get word info from dictionary
 */
export function getWordInfo(word: string): { clue: string; category?: string } | null {
  return DICTIONARY.get(word.toUpperCase()) || null;
}

/**
 * Extract a word from grid starting at position in given direction
 * Returns the word, its source type, and whether it's complete (no gaps)
 */
function extractWord(
  cells: EditableCell[][],
  startRow: number,
  startCol: number,
  direction: 'across' | 'down'
): { word: string; source: 'user' | 'auto' | 'mixed'; isComplete: boolean } | null {
  let word = '';
  let hasUser = false;
  let hasAuto = false;
  let r = startRow;
  let c = startCol;

  while (r < GRID_SIZE && c < GRID_SIZE) {
    const cell = cells[r][c];

    if (cell.isBlack) break;

    if (!cell.letter) {
      // Incomplete word - has a gap
      return { word, source: hasUser && hasAuto ? 'mixed' : hasUser ? 'user' : 'auto', isComplete: false };
    }

    word += cell.letter;
    if (cell.source === 'user') hasUser = true;
    if (cell.source === 'auto') hasAuto = true;

    if (direction === 'across') {
      c++;
    } else {
      r++;
    }
  }

  if (word.length < 2) return null;

  return {
    word,
    source: hasUser && hasAuto ? 'mixed' : hasUser ? 'user' : 'auto',
    isComplete: true,
  };
}

/**
 * Detect all words in the grid
 * Returns both across and down words
 */
export function detectWords(cells: EditableCell[][]): DetectedWord[] {
  const words: DetectedWord[] = [];

  // Find across words
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      // Check if this is the start of an across word
      const isStart = (c === 0 || cells[r][c - 1].isBlack) && !cells[r][c].isBlack;

      if (isStart) {
        const extracted = extractWord(cells, r, c, 'across');
        if (extracted && extracted.isComplete && extracted.word.length >= 2) {
          const info = getWordInfo(extracted.word);
          words.push({
            word: extracted.word,
            row: r,
            col: c,
            direction: 'across',
            length: extracted.word.length,
            isValid: !!info,
            clue: info?.clue,
            category: info?.category,
            source: extracted.source,
          });
        }
      }
    }
  }

  // Find down words
  for (let c = 0; c < GRID_SIZE; c++) {
    for (let r = 0; r < GRID_SIZE; r++) {
      // Check if this is the start of a down word
      const isStart = (r === 0 || cells[r - 1][c].isBlack) && !cells[r][c].isBlack;

      if (isStart) {
        const extracted = extractWord(cells, r, c, 'down');
        if (extracted && extracted.isComplete && extracted.word.length >= 2) {
          const info = getWordInfo(extracted.word);
          words.push({
            word: extracted.word,
            row: r,
            col: c,
            direction: 'down',
            length: extracted.word.length,
            isValid: !!info,
            clue: info?.clue,
            category: info?.category,
            source: extracted.source,
          });
        }
      }
    }
  }

  return words;
}

/**
 * Get only valid Islamic words detected in the grid
 */
export function detectValidWords(cells: EditableCell[][]): DetectedWord[] {
  return detectWords(cells).filter(w => w.isValid);
}

/**
 * Calculate what percentage of detected words are valid
 */
export function getValidWordPercentage(cells: EditableCell[][]): number {
  const words = detectWords(cells);
  if (words.length === 0) return 0;

  const validCount = words.filter(w => w.isValid).length;
  return Math.round((validCount / words.length) * 100);
}

/**
 * Get all dictionary words for export
 */
export function getAllDictionaryWords(): string[] {
  return Array.from(DICTIONARY.keys());
}
