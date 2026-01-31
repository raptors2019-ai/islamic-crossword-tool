'use client';

import { useState, useEffect, useCallback } from 'react';
import { ThemeWord } from '@/lib/types';
import { sampleWords } from '@/lib/sample-data';
import { wordToThemeWord } from '@/lib/generator-api';

interface UseThemeWordsOptions {
  maxWordLength?: number;
  initialWordCount?: number;
  autoLoad?: boolean;
}

interface UseThemeWordsReturn {
  themeWords: ThemeWord[];
  setThemeWords: React.Dispatch<React.SetStateAction<ThemeWord[]>>;
  loadWordsForTheme: (theme: string) => void;
  addWord: (word: ThemeWord) => void;
  removeWord: (id: string) => void;
  clearWords: () => void;
  availableWords: typeof sampleWords;
}

/**
 * Hook to manage theme words for crossword puzzle building.
 * Automatically loads words based on the selected theme.
 */
export function useThemeWords(
  initialTheme: string = 'prophets',
  options: UseThemeWordsOptions = {}
): UseThemeWordsReturn {
  const {
    maxWordLength = 5,
    initialWordCount = 8,
    autoLoad = true,
  } = options;

  const [themeWords, setThemeWords] = useState<ThemeWord[]>([]);

  // Map theme IDs to category filters
  const themeToCategoryMap: Record<string, string | null> = {
    prophets: 'prophets',
    names: 'names-of-allah',
    quran: 'quran',
    companions: 'companions',
    ramadan: null, // Uses general Islamic words
    pillars: null, // Uses general Islamic words
    general: null, // Uses all Islamic words
  };

  // Load words for a specific theme
  const loadWordsForTheme = useCallback(
    (theme: string) => {
      // Filter for words that fit in 5x5 grid
      let filtered = sampleWords.filter((w) => w.word.length <= maxWordLength);

      // Further filter by category based on theme
      const category = themeToCategoryMap[theme];
      if (category) {
        filtered = filtered.filter((w) => w.category === category);
      }

      // If we don't have enough words after filtering, include general Islamic words
      if (filtered.length < initialWordCount) {
        const general = sampleWords.filter(
          (w) =>
            w.word.length <= maxWordLength &&
            w.category === 'general' &&
            !filtered.some((f) => f.id === w.id)
        );
        filtered = [...filtered, ...general];
      }

      // Take initial word count
      const selected = filtered.slice(0, initialWordCount);
      const newThemeWords = selected.map(wordToThemeWord);

      setThemeWords(newThemeWords);
    },
    [maxWordLength, initialWordCount]
  );

  // Add a word to the list
  const addWord = useCallback((word: ThemeWord) => {
    setThemeWords((prev) => {
      // Don't add if already exists
      if (prev.some((w) => w.id === word.id)) {
        return prev;
      }
      return [...prev, word];
    });
  }, []);

  // Remove a word from the list
  const removeWord = useCallback((id: string) => {
    setThemeWords((prev) => prev.filter((w) => w.id !== id));
  }, []);

  // Clear all words
  const clearWords = useCallback(() => {
    setThemeWords([]);
  }, []);

  // Get available words (not already selected) for the word bank
  const availableWords = sampleWords.filter(
    (w) =>
      w.word.length <= maxWordLength &&
      !themeWords.some((tw) => tw.id === w.id)
  );

  // Auto-load words on initial mount if autoLoad is true
  useEffect(() => {
    if (autoLoad && themeWords.length === 0) {
      loadWordsForTheme(initialTheme);
    }
  }, [autoLoad, initialTheme, loadWordsForTheme, themeWords.length]);

  return {
    themeWords,
    setThemeWords,
    loadWordsForTheme,
    addWord,
    removeWord,
    clearWords,
    availableWords,
  };
}

/**
 * Get words for a specific theme without the hook.
 * Useful for server-side or one-time fetches.
 */
export function getWordsForTheme(
  theme: string,
  maxWordLength: number = 5,
  count: number = 8
): ThemeWord[] {
  const themeToCategoryMap: Record<string, string | null> = {
    prophets: 'prophets',
    names: 'names-of-allah',
    quran: 'quran',
    companions: 'companions',
    ramadan: null,
    pillars: null,
    general: null,
  };

  let filtered = sampleWords.filter((w) => w.word.length <= maxWordLength);

  const category = themeToCategoryMap[theme];
  if (category) {
    filtered = filtered.filter((w) => w.category === category);
  }

  if (filtered.length < count) {
    const general = sampleWords.filter(
      (w) =>
        w.word.length <= maxWordLength &&
        w.category === 'general' &&
        !filtered.some((f) => f.id === w.id)
    );
    filtered = [...filtered, ...general];
  }

  return filtered.slice(0, count).map(wordToThemeWord);
}
