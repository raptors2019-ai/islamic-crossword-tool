/**
 * Tests for Auto-Generator
 *
 * Success criteria:
 * - 100% grid fill (no empty white cells)
 * - All detected words are valid dictionary words
 * - Islamic percentage >= 25%
 * - Test each prophet's keywords
 * - 10 runs same input → >= 7 successes
 */

import {
  generatePuzzle,
  validateAllWords,
  ThemeWord,
  GenerationResult,
} from './auto-generator';
import { createEmptyGrid, GRID_SIZE } from './editable-grid';
import { detectWords } from './word-detector';
import { getDefaultWordIndex } from './word-index';

// Prophet-specific theme words for testing
const PROPHET_THEMES: Record<string, ThemeWord[]> = {
  ADAM: [
    { word: 'ADAM', clue: 'First prophet' },
    { word: 'HAWWA', clue: "Adam's wife" },
    { word: 'IBLIS', clue: 'Refused to bow' },
    { word: 'CLAY', clue: 'Adam was created from this' },
  ],
  NUH: [
    { word: 'NUH', clue: 'Prophet of the flood' },
    { word: 'ARK', clue: "Nuh's vessel" },
    { word: 'FLOOD', clue: 'Great deluge' },
    { word: 'JUDI', clue: 'Mountain where ark landed' },
  ],
  IBRAHIM: [
    { word: 'KAABA', clue: 'House of Allah' },
    { word: 'FIRE', clue: 'Ibrahim was thrown into this' },
    { word: 'HAJJ', clue: 'Annual pilgrimage' },
  ],
  MUSA: [
    { word: 'MUSA', clue: 'Prophet who spoke to Allah' },
    { word: 'STAFF', clue: "Musa's miracle" },
    { word: 'NILE', clue: 'River in Egypt' },
    { word: 'TORAH', clue: 'Book revealed to Musa' },
  ],
  YUSUF: [
    { word: 'YUSUF', clue: 'Prophet of dreams' },
    { word: 'DREAM', clue: 'Yusuf could interpret these' },
    { word: 'JAIL', clue: 'Where Yusuf was imprisoned' },
    { word: 'EGYPT', clue: 'Land where Yusuf ruled' },
  ],
};

// Helper to check grid fill percentage
function getGridFillPercentage(grid: ReturnType<typeof createEmptyGrid>): number {
  let whiteCells = 0;
  let filledCells = 0;

  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (!grid[r][c].isBlack) {
        whiteCells++;
        if (grid[r][c].letter) {
          filledCells++;
        }
      }
    }
  }

  return whiteCells > 0 ? (filledCells / whiteCells) * 100 : 0;
}

// Helper to check if all words are valid
function areAllWordsValid(grid: ReturnType<typeof createEmptyGrid>): {
  valid: boolean;
  invalidWords: string[];
} {
  const words = detectWords(grid);
  const invalidWords = words.filter((w) => !w.isValid).map((w) => w.word);
  return {
    valid: invalidWords.length === 0,
    invalidWords,
  };
}


describe('Auto-Generator', () => {
  const wordIndex = getDefaultWordIndex();

  describe('validateAllWords', () => {
    it('should detect valid grids', () => {
      const grid = createEmptyGrid();
      // Empty grid should have no words, so valid
      const result = validateAllWords(grid);
      expect(result.valid).toBe(true);
    });
  });

  describe('generatePuzzle - Basic Functionality', () => {
    it('should generate a puzzle with theme words', () => {
      const themeWords: ThemeWord[] = [
        { word: 'ISLAM', clue: 'The religion' },
        { word: 'PEACE', clue: 'Salam means this' },
      ];

      const result = generatePuzzle(themeWords, {
        wordIndex,
        maxTimeMs: 10000,
      });

      // Should complete without crashing
      expect(result).toBeDefined();
      expect(result.grid).toBeDefined();
      expect(result.stats).toBeDefined();
    });
  });

  describe('100% Grid Fill Requirement', () => {
    it('should fill all white cells when successful', () => {
      const themeWords: ThemeWord[] = [
        { word: 'SALAT', clue: 'Prayer' },
        { word: 'QURAN', clue: 'Holy book' },
      ];

      const result = generatePuzzle(themeWords, {
        wordIndex,
        maxTimeMs: 15000,
      });

      if (result.success) {
        const fillPercentage = getGridFillPercentage(result.grid);
        expect(fillPercentage).toBe(100);
      }
    });
  });

  describe('All Valid Words Requirement', () => {
    it('should only contain valid dictionary words when successful', () => {
      const themeWords: ThemeWord[] = [
        { word: 'FAITH', clue: 'Belief' },
        { word: 'IMAN', clue: 'Faith in Arabic' },
      ];

      const result = generatePuzzle(themeWords, {
        wordIndex,
        maxTimeMs: 15000,
      });

      if (result.success) {
        const validation = areAllWordsValid(result.grid);
        expect(validation.valid).toBe(true);
        if (!validation.valid) {
          console.log('Invalid words found:', validation.invalidWords);
        }
      }
    });
  });

  describe('Islamic Percentage Requirement', () => {
    it('should achieve at least 25% Islamic words when successful', () => {
      const themeWords: ThemeWord[] = [
        { word: 'ALLAH', clue: 'God' },
        { word: 'NABI', clue: 'Prophet' },
        { word: 'DUA', clue: 'Prayer' },
      ];

      const result = generatePuzzle(themeWords, {
        wordIndex,
        maxTimeMs: 15000,
      });

      if (result.success) {
        // Islamic percentage should be at least 25%
        expect(result.stats.islamicPercentage).toBeGreaterThanOrEqual(25);
      }
    });
  });

  describe('Prophet-Specific Tests', () => {
    const prophets = Object.keys(PROPHET_THEMES);

    for (const prophet of prophets) {
      it(`should generate valid puzzle for ${prophet} theme`, () => {
        const themeWords = PROPHET_THEMES[prophet];
        const result = generatePuzzle(themeWords, {
          wordIndex,
          maxTimeMs: 15000,
        });

        if (result.success) {
          // Verify 100% fill
          const fillPercentage = getGridFillPercentage(result.grid);
          expect(fillPercentage).toBe(100);

          // Verify all words are valid
          const validation = areAllWordsValid(result.grid);
          expect(validation.valid).toBe(true);
          if (!validation.valid) {
            console.log(`${prophet}: Invalid words:`, validation.invalidWords);
          }
        }
      });
    }
  });

  describe('Success Rate Tests', () => {
    it('should achieve >= 70% success rate over 10 runs', () => {
      const themeWords: ThemeWord[] = [
        { word: 'ADAM', clue: 'First prophet' },
        { word: 'CLAY', clue: 'Created from' },
      ];

      let successCount = 0;
      const runs = 10;

      for (let i = 0; i < runs; i++) {
        const result = generatePuzzle(themeWords, {
          wordIndex,
          maxTimeMs: 10000,
        });

        if (result.success) {
          const fillPercentage = getGridFillPercentage(result.grid);
          const validation = areAllWordsValid(result.grid);

          if (fillPercentage === 100 && validation.valid) {
            successCount++;
          }
        }
      }

      const successRate = (successCount / runs) * 100;
      console.log(`ADAM Success rate: ${successRate}% (${successCount}/${runs})`);
      expect(successRate).toBeGreaterThanOrEqual(70);
    });

    it('should achieve >= 80% success rate per prophet', () => {
      const prophets = Object.keys(PROPHET_THEMES);
      const runsPerProphet = 5;

      for (const prophet of prophets) {
        let successCount = 0;
        const themeWords = PROPHET_THEMES[prophet];

        for (let i = 0; i < runsPerProphet; i++) {
          const result = generatePuzzle(themeWords, {
            wordIndex,
            maxTimeMs: 10000,
          });

          if (result.success) {
            const fillPercentage = getGridFillPercentage(result.grid);
            const validation = areAllWordsValid(result.grid);

            if (fillPercentage === 100 && validation.valid) {
              successCount++;
            }
          }
        }

        const successRate = (successCount / runsPerProphet) * 100;
        console.log(`${prophet} Success rate: ${successRate}% (${successCount}/${runsPerProphet})`);
        expect(successRate).toBeGreaterThanOrEqual(80);
      }
    });
  });

  describe('Never Return Invalid Results', () => {
    it('should NEVER return success with invalid words', () => {
      const themes = Object.values(PROPHET_THEMES);
      const runs = 5;

      for (const themeWords of themes) {
        for (let i = 0; i < runs; i++) {
          const result = generatePuzzle(themeWords, {
            wordIndex,
            maxTimeMs: 10000,
          });

          // If success is true, ALL words MUST be valid
          if (result.success) {
            const validation = areAllWordsValid(result.grid);
            expect(validation.valid).toBe(true);
            if (!validation.valid) {
              console.log('CRITICAL: Success returned with invalid words:', validation.invalidWords);
              console.log('Theme:', themeWords.map((t) => t.word).join(', '));
            }
          }
        }
      }
    });

    it('should NEVER return success with incomplete grid', () => {
      const themes = Object.values(PROPHET_THEMES);
      const runs = 5;

      for (const themeWords of themes) {
        for (let i = 0; i < runs; i++) {
          const result = generatePuzzle(themeWords, {
            wordIndex,
            maxTimeMs: 10000,
          });

          // If success is true, grid MUST be 100% filled
          if (result.success) {
            const fillPercentage = getGridFillPercentage(result.grid);
            expect(fillPercentage).toBe(100);
            if (fillPercentage < 100) {
              console.log('CRITICAL: Success returned with incomplete grid:', fillPercentage);
              console.log('Theme:', themeWords.map((t) => t.word).join(', '));
            }
          }
        }
      }
    });
  });
});
