/**
 * Tests for CSP-Based Grid Filler
 */

import {
  getCSPSlots,
  enforceArcConsistency,
  fillGridWithCSP,
  canGridBeFilled,
  getUnfilledSlotsByDifficulty,
  suggestWordForSlot,
  CSPSlot,
} from './csp-filler';
import {
  createEmptyGrid,
  placeWord,
  EditableCell,
  GRID_SIZE,
} from './editable-grid';
import { buildWordIndex, WordIndex, getDefaultWordIndex } from './word-index';

// Use the default full word index for realistic testing
function getTestWordIndex(): WordIndex {
  return getDefaultWordIndex();
}

describe('CSP Filler', () => {
  let wordIndex: WordIndex;

  beforeAll(() => {
    wordIndex = getTestWordIndex();
  });

  describe('getCSPSlots', () => {
    it('should identify all slots in an empty grid', () => {
      const grid = createEmptyGrid();
      const slots = getCSPSlots(grid, wordIndex);

      // Empty 5x5 grid should have 10 slots (5 across + 5 down)
      expect(slots.length).toBe(10);

      // Check directions
      const acrossSlots = slots.filter(s => s.direction === 'across');
      const downSlots = slots.filter(s => s.direction === 'down');
      expect(acrossSlots.length).toBe(5);
      expect(downSlots.length).toBe(5);
    });

    it('should detect filled slots', () => {
      const grid = createEmptyGrid();
      // Place "PEACE" in row 0
      const withWord = placeWord(grid, 'PEACE', 0, 0, 'across')!;
      const slots = getCSPSlots(withWord, wordIndex);

      // First across slot should be filled
      const firstAcross = slots.find(s => s.direction === 'across' && s.start.row === 0);
      expect(firstAcross?.isFilled).toBe(true);
      expect(firstAcross?.pattern).toBe('PEACE');
    });

    it('should build intersection graph correctly', () => {
      const grid = createEmptyGrid();
      const slots = getCSPSlots(grid, wordIndex);

      // Each slot should have intersections with perpendicular slots
      const acrossSlot = slots.find(s => s.direction === 'across' && s.start.row === 0)!;

      // Row 0 across slot intersects with all 5 down slots
      expect(acrossSlot.intersections.length).toBe(5);
    });
  });

  describe('enforceArcConsistency', () => {
    it('should prune candidates that have no support', () => {
      const grid = createEmptyGrid();
      // Place "PEACE" across row 0
      const withWord = placeWord(grid, 'PEACE', 0, 0, 'across')!;
      const slots = getCSPSlots(withWord, wordIndex);
      const slotMap = new Map(slots.map(s => [s.id, s]));

      // Before AC-3, down slots starting at row 0 have many candidates
      const downSlot0 = slots.find(s => s.direction === 'down' && s.start.col === 0)!;
      const initialCandidates = [...downSlot0.candidates];

      // Apply AC-3
      const result = enforceArcConsistency(slots, slotMap);
      expect(result).toBe(true);

      // After AC-3, candidates should only include words starting with 'P'
      expect(downSlot0.candidates.every(w => w[0] === 'P')).toBe(true);
      expect(downSlot0.candidates.length).toBeLessThan(initialCandidates.length);
    });

    it('should return false for unsatisfiable grids', () => {
      const grid = createEmptyGrid();
      // Place letters that create impossible patterns
      const testGrid = placeWord(grid, 'XXXXX', 0, 0, 'across');
      // This should create down slots starting with X, which likely have no candidates

      if (testGrid) {
        const slots = getCSPSlots(testGrid, wordIndex);
        const slotMap = new Map(slots.map(s => [s.id, s]));

        // AC-3 should return false because X-starting words don't exist
        const result = enforceArcConsistency(slots, slotMap);
        expect(result).toBe(false);
      }
    });
  });

  describe('fillGridWithCSP', () => {
    it('should fill an empty grid without duplicate words', () => {
      const grid = createEmptyGrid();
      const result = fillGridWithCSP(grid, wordIndex, 15000);

      // Stats should be reasonable
      expect(result.stats.totalSlots).toBe(10); // 5 across + 5 down

      // If successful, verify no duplicates
      if (result.success) {
        const placedWordStrings = result.placedWords.map(pw => pw.word);
        const uniqueWords = new Set(placedWordStrings);
        expect(uniqueWords.size).toBe(placedWordStrings.length);
      }
    });

    it('should fill grid with existing words preserving them', () => {
      const grid = createEmptyGrid();
      // Place "QURAN" first (less likely to create word-square constraints)
      const withWord = placeWord(grid, 'QURAN', 0, 0, 'across')!;
      const result = fillGridWithCSP(withWord, wordIndex, 15000);

      // Grid should have QURAN in row 0 regardless of success
      expect(result.grid[0].map(c => c.letter).join('')).toBe('QURAN');

      // Stats should account for the already placed word
      expect(result.stats.alreadyFilled).toBe(1);

      // If successful, no duplicates
      if (result.success) {
        const allWords = [
          ...result.placedWords.map(pw => pw.word),
          'QURAN' // Include the pre-placed word
        ];
        const uniqueWords = new Set(allWords);
        expect(uniqueWords.size).toBe(allWords.length);
      }
    });

    it('should respect timeout', () => {
      const grid = createEmptyGrid();
      const startTime = Date.now();

      // Very short timeout
      const result = fillGridWithCSP(grid, wordIndex, 10);

      const elapsed = Date.now() - startTime;

      // Should complete within reasonable time of timeout
      expect(elapsed).toBeLessThan(500); // Allow some overhead

      // Stats should reflect time taken
      expect(result.stats.timeTakenMs).toBeDefined();
    });
  });

  describe('canGridBeFilled', () => {
    it('should return true for a fillable grid', () => {
      const grid = createEmptyGrid();
      const result = canGridBeFilled(grid, wordIndex);

      expect(result.canFill).toBe(true);
      expect(result.problematicSlots.length).toBe(0);
    });

    it('should return false when slots have no candidates', () => {
      const grid = createEmptyGrid();
      // Place impossible pattern
      let testGrid = grid;
      testGrid = placeWord(testGrid, 'QQQQ', 0, 0, 'across') || testGrid;

      const result = canGridBeFilled(testGrid, wordIndex);

      // Q-starting words don't exist, so should fail
      if (testGrid !== grid) {
        expect(result.canFill).toBe(false);
        expect(result.problematicSlots.length).toBeGreaterThan(0);
      }
    });
  });

  describe('getUnfilledSlotsByDifficulty', () => {
    it('should return slots sorted by difficulty (fewest candidates first)', () => {
      const grid = createEmptyGrid();
      // Place a word to constrain some slots
      const withWord = placeWord(grid, 'PEACE', 0, 0, 'across')!;

      const slots = getUnfilledSlotsByDifficulty(withWord, wordIndex);

      // Should have unfilled slots
      expect(slots.length).toBeGreaterThan(0);

      // Should be sorted by candidate count
      for (let i = 1; i < slots.length; i++) {
        expect(slots[i].candidates.length).toBeGreaterThanOrEqual(slots[i - 1].candidates.length);
      }
    });

    it('should not include filled slots', () => {
      const grid = createEmptyGrid();
      const withWord = placeWord(grid, 'PEACE', 0, 0, 'across')!;

      const slots = getUnfilledSlotsByDifficulty(withWord, wordIndex);

      // No slot should be filled
      expect(slots.every(s => !s.isFilled)).toBe(true);
    });
  });

  describe('suggestWordForSlot', () => {
    it('should suggest words for an empty slot', () => {
      const grid = createEmptyGrid();
      const suggestions = suggestWordForSlot(grid, 0, 0, 'across', wordIndex, 5);

      // Should have suggestions
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.length).toBeLessThanOrEqual(5);

      // All suggestions should be 5 letters (full row)
      expect(suggestions.every(w => w.length === 5)).toBe(true);
    });

    it('should suggest words matching existing pattern', () => {
      const grid = createEmptyGrid();
      // Set first letter to 'P'
      const withP = placeWord(grid, 'P', 0, 0, 'across');

      // Note: placeWord for single letter might not work, let's set manually
      const testGrid = grid.map((row, r) =>
        row.map((cell, c) => {
          if (r === 0 && c === 0) {
            return { ...cell, letter: 'P', source: 'auto' as const };
          }
          return cell;
        })
      );

      const suggestions = suggestWordForSlot(testGrid, 0, 0, 'across', wordIndex, 5);

      // All suggestions should start with P
      expect(suggestions.every(w => w[0] === 'P')).toBe(true);
    });
  });

  describe('MRV heuristic', () => {
    it('should select slot with fewest candidates first', () => {
      const grid = createEmptyGrid();
      // Place a word to create different constraint levels
      const withWord = placeWord(grid, 'PEACE', 0, 0, 'across')!;

      const slots = getUnfilledSlotsByDifficulty(withWord, wordIndex);

      // First unfilled slot should have fewer or equal candidates than subsequent
      if (slots.length >= 2) {
        expect(slots[0].candidates.length).toBeLessThanOrEqual(slots[1].candidates.length);
      }
    });
  });
});

describe('Integration Tests', () => {
  let wordIndex: WordIndex;

  beforeAll(() => {
    wordIndex = getTestWordIndex();
  });

  it('should generate a complete puzzle from empty grid', () => {
    const grid = createEmptyGrid();
    const result = fillGridWithCSP(grid, wordIndex, 15000);

    expect(result.success).toBe(true);

    // Verify all cells are filled
    let emptyCount = 0;
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (!result.grid[r][c].isBlack && !result.grid[r][c].letter) {
          emptyCount++;
        }
      }
    }
    expect(emptyCount).toBe(0);
  });

  it('should fill grid preserving theme words and preventing duplicates', () => {
    const grid = createEmptyGrid();

    // Place one theme word
    const testGrid = placeWord(grid, 'ISLAM', 0, 0, 'across')!;

    const result = fillGridWithCSP(testGrid, wordIndex, 15000);

    // Original word should always be preserved
    expect(result.grid[0].map(c => c.letter).join('')).toBe('ISLAM');

    // If successful, verify no duplicate words
    if (result.success) {
      const allWords = [
        ...result.placedWords.map(pw => pw.word),
        'ISLAM'
      ];
      const uniqueWords = new Set(allWords);
      expect(uniqueWords.size).toBe(allWords.length);
    }
  });
});
