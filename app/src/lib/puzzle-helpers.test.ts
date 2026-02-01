/**
 * Tests for puzzle generation helper functions
 */

import {
  shuffleArray,
  processKeywords,
  processPlacedWords,
  scoreGenerationResult,
  calculateDifferencePercent,
} from './puzzle-helpers';
import { ProphetKeyword } from './prophet-keywords';
import { GenerationResult } from './auto-generator';

describe('shuffleArray', () => {
  it('should return array of same length', () => {
    const input = [1, 2, 3, 4, 5];
    const result = shuffleArray(input);
    expect(result.length).toBe(input.length);
  });

  it('should contain all original elements', () => {
    const input = [1, 2, 3, 4, 5];
    const result = shuffleArray(input);
    expect(result.sort()).toEqual(input.sort());
  });

  it('should not modify original array', () => {
    const input = [1, 2, 3, 4, 5];
    const original = [...input];
    shuffleArray(input);
    expect(input).toEqual(original);
  });
});

describe('processKeywords', () => {
  const mockKeywords: ProphetKeyword[] = [
    { word: 'ADAM', clue: 'First prophet', relevance: 100 },
    { word: 'HAWWA', clue: 'First woman', relevance: 95 },
    { word: 'IBLIS', clue: 'Satan', relevance: 90 },
    { word: 'TOOLONG', clue: 'Should be filtered', relevance: 80 }, // 7 letters
    { word: 'A', clue: 'Too short', relevance: 70 }, // 1 letter
  ];

  it('should filter out words > 5 letters', () => {
    const result = processKeywords(mockKeywords);
    expect(result).not.toBeNull();
    expect(result!.validKeywords.find(k => k.word === 'TOOLONG')).toBeUndefined();
  });

  it('should filter out words < 2 letters', () => {
    const result = processKeywords(mockKeywords);
    expect(result).not.toBeNull();
    expect(result!.validKeywords.find(k => k.word === 'A')).toBeUndefined();
  });

  it('should return valid keywords sorted by relevance when not shuffling', () => {
    const result = processKeywords(mockKeywords, false);
    expect(result).not.toBeNull();
    expect(result!.validKeywords[0].word).toBe('ADAM');
    expect(result!.validKeywords[1].word).toBe('HAWWA');
  });

  it('should build boosted index with keyword words', () => {
    const result = processKeywords(mockKeywords);
    expect(result).not.toBeNull();
    expect(result!.keywordWords).toContain('ADAM');
    expect(result!.keywordWords).toContain('HAWWA');
  });

  it('should build clue map', () => {
    const result = processKeywords(mockKeywords);
    expect(result).not.toBeNull();
    expect(result!.clueMap.get('ADAM')).toBe('First prophet');
  });

  it('should return null for empty keywords', () => {
    const result = processKeywords([]);
    expect(result).toBeNull();
  });

  it('should return null when all keywords are filtered out', () => {
    const invalidKeywords: ProphetKeyword[] = [
      { word: 'TOOLONGWORD', clue: 'Too long', relevance: 100 },
      { word: 'X', clue: 'Too short', relevance: 90 },
    ];
    const result = processKeywords(invalidKeywords);
    expect(result).toBeNull();
  });
});

describe('processPlacedWords', () => {
  const mockPlacedWords = [
    { word: 'ADAM', clue: 'Test clue', row: 0, col: 0, direction: 'across' as const, isThemeWord: true },
    { word: 'HAWWA', clue: '', row: 1, col: 0, direction: 'down' as const, isThemeWord: true },
    { word: 'EXTRA', clue: '', row: 2, col: 0, direction: 'across' as const, isThemeWord: false },
  ];
  const keywordSet = new Set(['ADAM', 'HAWWA']);
  const clueMap = new Map([
    ['ADAM', 'First prophet'],
    ['HAWWA', 'First woman'],
  ]);

  it('should only include keywords in theme words', () => {
    const result = processPlacedWords(mockPlacedWords, keywordSet, clueMap, 'test-prophet');
    expect(result.themeWords.length).toBe(2);
    expect(result.themeWords.find(t => t.word === 'EXTRA')).toBeUndefined();
  });

  it('should use clues from clue map', () => {
    const result = processPlacedWords(mockPlacedWords, keywordSet, clueMap, 'test-prophet');
    const adamWord = result.themeWords.find(t => t.word === 'ADAM');
    expect(adamWord?.clue).toBe('First prophet');
  });

  it('should generate unique IDs', () => {
    const result = processPlacedWords(mockPlacedWords, keywordSet, clueMap, 'test-prophet');
    const ids = result.themeWords.map(t => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('should add all theme words to placedIds', () => {
    const result = processPlacedWords(mockPlacedWords, keywordSet, clueMap, 'test-prophet');
    expect(result.placedIds.size).toBe(2);
  });

  it('should not duplicate words', () => {
    const duplicatePlacedWords = [
      ...mockPlacedWords,
      { word: 'ADAM', clue: 'Duplicate', row: 3, col: 0, direction: 'down' as const, isThemeWord: true },
    ];
    const result = processPlacedWords(duplicatePlacedWords, keywordSet, clueMap, 'test-prophet');
    const adamWords = result.themeWords.filter(t => t.word === 'ADAM');
    expect(adamWords.length).toBe(1);
  });
});

describe('scoreGenerationResult', () => {
  const createMockResult = (success: boolean, fillPercent: number): GenerationResult => ({
    success,
    grid: [],
    placedWords: [],
    unplacedThemeWords: [],
    stats: {
      totalSlots: 10,
      themeWordsPlaced: 5,
      fillerWordsPlaced: 3,
      islamicPercentage: 60,
      avgWordScore: 80,
      gridFillPercentage: fillPercent,
      timeTakenMs: 1000,
      attemptsUsed: 1,
      patternUsed: 'test',
    },
  });

  it('should give higher score to complete grids', () => {
    const complete = createMockResult(true, 100);
    const incomplete = createMockResult(false, 80);

    const completeScore = scoreGenerationResult(complete, 0.5);
    const incompleteScore = scoreGenerationResult(incomplete, 0.5);

    expect(completeScore).toBeGreaterThan(incompleteScore);
  });

  it('should give higher score to more different puzzles', () => {
    const result = createMockResult(false, 80);

    const moreDifferent = scoreGenerationResult(result, 0.8);
    const lessDifferent = scoreGenerationResult(result, 0.3);

    expect(moreDifferent).toBeGreaterThan(lessDifferent);
  });

  it('should give higher score to higher fill percentage', () => {
    const highFill = createMockResult(false, 90);
    const lowFill = createMockResult(false, 50);

    const highScore = scoreGenerationResult(highFill, 0.5);
    const lowScore = scoreGenerationResult(lowFill, 0.5);

    expect(highScore).toBeGreaterThan(lowScore);
  });
});

describe('calculateDifferencePercent', () => {
  it('should return 1 for empty old words', () => {
    const newWords = new Set(['ADAM', 'HAWWA']);
    const oldWords = new Set<string>();

    expect(calculateDifferencePercent(newWords, oldWords)).toBe(1);
  });

  it('should return 0 for identical sets', () => {
    const newWords = new Set(['ADAM', 'HAWWA']);
    const oldWords = new Set(['ADAM', 'HAWWA']);

    expect(calculateDifferencePercent(newWords, oldWords)).toBe(0);
  });

  it('should return 1 for completely different sets', () => {
    const newWords = new Set(['MUSA', 'ISA']);
    const oldWords = new Set(['ADAM', 'HAWWA']);

    expect(calculateDifferencePercent(newWords, oldWords)).toBe(1);
  });

  it('should return 0.5 for half different', () => {
    const newWords = new Set(['ADAM', 'MUSA']);
    const oldWords = new Set(['ADAM', 'HAWWA']);

    expect(calculateDifferencePercent(newWords, oldWords)).toBe(0.5);
  });

  it('should return 0 for empty new words', () => {
    const newWords = new Set<string>();
    const oldWords = new Set(['ADAM', 'HAWWA']);

    expect(calculateDifferencePercent(newWords, oldWords)).toBe(0);
  });
});

describe('Integration: processKeywords and processPlacedWords', () => {
  it('should work together for a typical flow', () => {
    const keywords: ProphetKeyword[] = [
      { word: 'ADAM', clue: 'First prophet', relevance: 100 },
      { word: 'HAWWA', clue: 'First woman', relevance: 95 },
      { word: 'IBLIS', clue: 'Satan', relevance: 90 },
    ];

    const processed = processKeywords(keywords);
    expect(processed).not.toBeNull();

    const mockPlacedWords = [
      { word: 'ADAM', clue: '', row: 0, col: 0, direction: 'across' as const, isThemeWord: true },
      { word: 'HAWWA', clue: '', row: 1, col: 0, direction: 'down' as const, isThemeWord: true },
    ];

    const keywordSet = new Set(processed!.keywordWords);
    const result = processPlacedWords(mockPlacedWords, keywordSet, processed!.clueMap, 'adam');

    expect(result.themeWords.length).toBe(2);
    expect(result.themeWords[0].clue).toBe('First prophet');
    expect(result.themeWords[1].clue).toBe('First woman');
  });
});
