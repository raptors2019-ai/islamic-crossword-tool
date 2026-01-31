import { GRID_5X5_CONSTRAINTS } from '@/lib/types';

describe('Grid constraints', () => {
  describe('GRID_5X5_CONSTRAINTS', () => {
    it('has correct size', () => {
      expect(GRID_5X5_CONSTRAINTS.size).toBe('5x5');
    });

    it('limits word length to 5', () => {
      expect(GRID_5X5_CONSTRAINTS.maxWordLength).toBe(5);
    });

    it('requires minimum 2-letter words', () => {
      expect(GRID_5X5_CONSTRAINTS.minWordLength).toBe(2);
    });

    it('targets 6 words per puzzle', () => {
      expect(GRID_5X5_CONSTRAINTS.targetWordCount).toBe(6);
    });
  });
});
