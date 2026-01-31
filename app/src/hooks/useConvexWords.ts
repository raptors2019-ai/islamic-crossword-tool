"use client";

import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

/**
 * Custom hooks for accessing Convex word data in the puzzle builder.
 */

// Get all words suitable for 5x5 puzzles
export function useWords5x5(options?: {
  category?: string;
  theme?: string;
  minScore?: number;
}) {
  return useQuery(api.words.listFor5x5, {
    category: options?.category,
    theme: options?.theme,
    minScore: options?.minScore,
  });
}

// Get themed word recommendations
export function useThemeWords(theme: string, maxWords = 15) {
  return useQuery(api.themeKeywords.getThemeWords, {
    theme,
    maxWords,
  });
}

// Get word suggestions based on current puzzle state
export function useWordSuggestions(
  currentWords: string[],
  options?: {
    neededLength?: number;
    theme?: string;
    maxSuggestions?: number;
  }
) {
  return useQuery(api.themeKeywords.getSuggestions, {
    currentWords,
    neededLength: options?.neededLength,
    theme: options?.theme,
    maxSuggestions: options?.maxSuggestions,
  });
}

// Search words
export function useWordSearch(searchTerm: string) {
  return useQuery(
    api.words.search,
    searchTerm.length >= 2 ? { searchTerm } : "skip"
  );
}

// Get clues for a word
export function useWordClues(wordId: Id<"words"> | undefined) {
  return useQuery(
    api.clues.listByWord,
    wordId ? { wordId } : "skip"
  );
}

// Get clues by word string
export function useCluesByWord(word: string) {
  return useQuery(api.clues.listByWordString, { word: word.toUpperCase() });
}

// Get word statistics
export function useWordStats() {
  return useQuery(api.words.stats, {});
}

// Generate AI clues for a word
export function useGenerateClues() {
  return useAction(api.clueGeneration.generateClues);
}

// Generate and store clues
export function useGenerateAndStoreClues() {
  return useAction(api.clueGeneration.generateAndStoreClues);
}

// Analyze theme for keywords
export function useAnalyzeTheme() {
  return useAction(api.themeKeywords.analyzeTheme);
}

// Create a new word
export function useCreateWord() {
  return useMutation(api.words.create);
}

// Create a new clue
export function useCreateClue() {
  return useMutation(api.clues.create);
}

// Approve a clue
export function useApproveClue() {
  return useMutation(api.clues.approve);
}

// Get puzzles
export function usePuzzles(options?: {
  theme?: string;
  limit?: number;
  publishedOnly?: boolean;
}) {
  return useQuery(api.puzzles.list, {
    theme: options?.theme,
    limit: options?.limit,
    publishedOnly: options?.publishedOnly,
  });
}

// Create a puzzle
export function useCreatePuzzle() {
  return useMutation(api.puzzles.create);
}
