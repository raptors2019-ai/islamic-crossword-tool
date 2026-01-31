// Mock Convex to avoid requiring environment variables in tests
jest.mock('@/lib/convex', () => ({
  convexClient: {
    query: jest.fn(),
    mutation: jest.fn(),
  },
}));

import { wordToThemeWord } from '@/lib/generator-api';

describe('wordToThemeWord', () => {
  it('converts a basic word to ThemeWord', () => {
    const word = {
      id: 'test-1',
      word: 'QURAN',
      clue: 'Holy book of Islam',
    };

    const result = wordToThemeWord(word);

    expect(result).toEqual({
      id: 'test-1',
      word: 'QURAN',
      clue: 'Holy book of Islam',
      arabicScript: undefined,
      spellingVariants: undefined,
      activeSpelling: 'QURAN',
      category: undefined,
    });
  });

  it('preserves optional fields', () => {
    const word = {
      id: 'test-2',
      word: 'MUSA',
      clue: 'Prophet who received the Torah',
      arabicScript: 'موسى',
      spellingVariants: ['MUSA', 'MOSES'],
      category: 'prophets' as const,
    };

    const result = wordToThemeWord(word);

    expect(result.id).toBe('test-2');
    expect(result.word).toBe('MUSA');
    expect(result.arabicScript).toBe('موسى');
    expect(result.spellingVariants).toEqual(['MUSA', 'MOSES']);
    expect(result.activeSpelling).toBe('MUSA');
    expect(result.category).toBe('prophets');
  });

  it('sets activeSpelling to the primary word', () => {
    const word = {
      id: 'test-3',
      word: 'IBRAHIM',
      clue: 'Father of prophets',
      spellingVariants: ['IBRAHIM', 'ABRAHAM'],
    };

    const result = wordToThemeWord(word);

    expect(result.activeSpelling).toBe('IBRAHIM');
  });
});
