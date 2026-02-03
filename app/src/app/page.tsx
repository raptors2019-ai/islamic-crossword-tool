'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Grid3X3, FileText } from 'lucide-react';
import { ThemeWord, GeneratedPuzzle, Difficulty, DifficultyClues, PuzzleHistoryEntry } from '@/lib/types';
import { generatePuzzle } from '@/lib/generator-api';
import {
  processKeywords,
  processPlacedWords,
  findBestGenerationResult,
} from '@/lib/puzzle-helpers';
import { PuzzleStats } from '@/components/puzzle-stats';
import { CrosswordGrid } from '@/components/crossword-grid';
import { downloadFlutterJson } from '@/lib/export-flutter';
import { WordHub } from '@/components/word-hub';
import { GapFillers } from '@/components/gap-fillers';
import { ConstraintSuggestions } from '@/components/constraint-suggestions';
import { SlotStats } from '@/components/slot-stats';
import { useEditableGrid } from '@/hooks/use-editable-grid';
import { detectWords, DetectedWord } from '@/lib/word-detector';
import { SlotWarningsPanel } from '@/components/slot-warnings-panel';
import {
  InvalidPlacementModal,
  PlacementSuggestion,
  generatePlacementSuggestions,
} from '@/components/invalid-placement-modal';
import { LiveClueEditor } from '@/components/live-clue-editor';
import { SlotValidation } from '@/lib/perpendicular-validator';
import {
  toGeneratedPuzzleGrid,
  placeWord,
  calculateCellNumbers,
  placeWordAtBestPosition,
  GRID_SIZE,
  getGridStats,
  removeWordFromGrid,
  createEmptyGrid,
  regenerateWord,
} from '@/lib/editable-grid';
import {
  generatePuzzle as generateAutoPuzzle,
  GenerationResult,
} from '@/lib/auto-generator';
import {
  getKeywordsForProphet,
  ProphetKeyword,
} from '@/lib/prophet-keywords';
import { fillGridWithCSP, canGridBeFilled, CSPFillResult } from '@/lib/csp-filler';
import { buildBoostedWordIndex, matchPattern } from '@/lib/word-index';

const themePresets = [
  { id: 'prophets', name: 'Prophet Stories', icon: '📖' },
  { id: 'ramadan', name: 'Ramadan', icon: '🌙' },
  { id: 'names', name: '99 Names of Allah', icon: '✨' },
  { id: 'pillars', name: '5 Pillars', icon: '🕌' },
  { id: 'quran', name: 'Quran', icon: '📚' },
  { id: 'companions', name: 'Companions', icon: '👥' },
];

export default function Home() {
  const [selectedTheme, setSelectedTheme] = useState<string>('prophets');
  const [puzzleTitle, setPuzzleTitle] = useState('Prophet Stories Crossword');
  const [themeWords, setThemeWords] = useState<ThemeWord[]>([]);
  const [clues, setClues] = useState<Record<string, string>>({});
  const [generatedPuzzle, setGeneratedPuzzle] = useState<GeneratedPuzzle | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedWordId, setSelectedWordId] = useState<string | null>(null);
  const [placedInGridIds, setPlacedInGridIds] = useState<Set<string>>(new Set());

  // Mobile navigation state
  const [mobileTab, setMobileTab] = useState<'grid' | 'clues'>('grid');

  // Grid-based clues with difficulty levels (word -> { easy, medium, hard })
  const [gridClues, setGridClues] = useState<Record<string, DifficultyClues>>({});
  const [selectedDifficulties, setSelectedDifficulties] = useState<Record<string, Difficulty>>({});
  const [selectedGridWord, setSelectedGridWord] = useState<string | null>(null);

  // Track current prophet selection for regeneration
  const [currentProphet, setCurrentProphet] = useState<{
    id: string;
    keywords: ProphetKeyword[];
  } | null>(null);

  // Track previous puzzle words for ensuring regeneration produces different results
  const [previousPuzzleWords, setPreviousPuzzleWords] = useState<Set<string>>(new Set());

  // Query pre-generated clues for the current prophet
  const preGeneratedClues = useQuery(
    api.difficultyClues.getForProphet,
    currentProphet ? { prophetId: currentProphet.id } : 'skip'
  );

  // Load pre-generated clues into gridClues state when they arrive
  useEffect(() => {
    if (!preGeneratedClues || Object.keys(preGeneratedClues).length === 0) {
      return;
    }

    // Convert pre-generated clues to gridClues format
    setGridClues(prev => {
      const newClues = { ...prev };

      for (const [word, clueData] of Object.entries(preGeneratedClues)) {
        // Only add if we don't already have clues for this word (don't overwrite user edits)
        if (!newClues[word] || (!newClues[word].easy && !newClues[word].medium && !newClues[word].hard)) {
          newClues[word] = {
            easy: clueData.easy[0] || '',
            medium: clueData.medium[0] || '',
            hard: clueData.hard[0] || '',
            alternatives: {
              easy: clueData.easy.slice(1),
              medium: clueData.medium.slice(1),
              hard: clueData.hard.slice(1),
            },
          };
        }
      }

      return newClues;
    });
  }, [preGeneratedClues]);

  // Puzzle history for comparing variations
  const [puzzleHistory, setPuzzleHistory] = useState<PuzzleHistoryEntry[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1); // -1 means viewing current (unsaved) state

  // Sorted puzzle history by theme words placed (highest first)
  const sortedPuzzleHistory = useMemo(() => {
    return [...puzzleHistory].sort((a, b) =>
      b.stats.themeWordsPlaced - a.stats.themeWordsPlaced
    );
  }, [puzzleHistory]);

  // Handle clue change from LiveClueEditor
  const handleGridClueChange = useCallback((word: string, difficulty: Difficulty, clue: string) => {
    setGridClues(prev => ({
      ...prev,
      [word]: {
        ...(prev[word] || { easy: '', medium: '', hard: '' }),
        [difficulty]: clue,
      },
    }));
  }, []);

  // Handle storing AI-generated clue options (first becomes selected, rest go to alternatives)
  const handleClueOptionsUpdate = useCallback((word: string, newOptions: { easy: string[]; medium: string[]; hard: string[] }) => {
    console.log('[handleClueOptionsUpdate] Called with word:', word, 'options:', newOptions);

    // Ensure all options are arrays
    const safeOptions = {
      easy: Array.isArray(newOptions.easy) ? newOptions.easy : (newOptions.easy ? [String(newOptions.easy)] : []),
      medium: Array.isArray(newOptions.medium) ? newOptions.medium : (newOptions.medium ? [String(newOptions.medium)] : []),
      hard: Array.isArray(newOptions.hard) ? newOptions.hard : (newOptions.hard ? [String(newOptions.hard)] : []),
    };
    console.log('[handleClueOptionsUpdate] safeOptions:', safeOptions);

    setGridClues(prev => {
      const existing = prev[word] || { easy: '', medium: '', hard: '' };
      const existingAlts = existing.alternatives || { easy: [], medium: [], hard: [] };

      // For each difficulty: first option becomes selected (if no current), rest go to alternatives
      // Also add any new options to alternatives (avoiding duplicates)
      const mergeAlternatives = (difficulty: Difficulty): string[] => {
        const currentClue = existing[difficulty];
        const newClues = safeOptions[difficulty];
        const existingAltList = existingAlts[difficulty] || [];

        // All new clues except the one that will become selected
        const selectedClue = currentClue || newClues[0] || '';
        const allAlts = [
          ...existingAltList,
          ...newClues.filter(c => c !== selectedClue),
        ];

        // Remove duplicates and the current selected clue
        return [...new Set(allAlts)].filter(c => c && c !== selectedClue);
      };

      const newState = {
        ...prev,
        [word]: {
          easy: existing.easy || safeOptions.easy[0] || '',
          medium: existing.medium || safeOptions.medium[0] || '',
          hard: existing.hard || safeOptions.hard[0] || '',
          alternatives: {
            easy: mergeAlternatives('easy'),
            medium: mergeAlternatives('medium'),
            hard: mergeAlternatives('hard'),
          },
        },
      };
      console.log('[handleClueOptionsUpdate] New state for word:', word, newState[word]);
      return newState;
    });
  }, []);

  // Handle swapping a clue with an alternative
  const handleSwapClueAlternative = useCallback((word: string, difficulty: Difficulty, alternativeClue: string) => {
    setGridClues(prev => {
      const existing = prev[word];
      if (!existing) return prev;

      const currentClue = existing[difficulty];
      const currentAlts = existing.alternatives?.[difficulty] || [];

      // Remove the alternative from the list and add the current clue
      const newAlts = currentAlts.filter(c => c !== alternativeClue);
      if (currentClue) {
        newAlts.push(currentClue);
      }

      return {
        ...prev,
        [word]: {
          ...existing,
          [difficulty]: alternativeClue,
          alternatives: {
            ...(existing.alternatives || { easy: [], medium: [], hard: [] }),
            [difficulty]: newAlts,
          },
        },
      };
    });
  }, []);

  // Handle difficulty selection change
  const handleDifficultyChange = useCallback((word: string, difficulty: Difficulty) => {
    setSelectedDifficulties(prev => ({ ...prev, [word]: difficulty }));
  }, []);

  // Editable grid hook for always-on interactive grid
  const {
    cells: editableCells,
    selectedCell,
    direction: editDirection,
    currentPattern,
    slotWarnings,
    wordIndex,
    canUndo,
    undo,
    selectCell,
    handleKeyDown,
    handleContextMenu,
    setCells,
    clearGrid,
    toggleBlackCell,
  } = useEditableGrid();

  // Handle word swap from LiveClueEditor
  const handleSwapWord = useCallback((
    oldWord: string,
    newWord: string,
    newClue: string,
    row: number,
    col: number,
    direction: 'across' | 'down'
  ) => {
    // Place the new word in the grid at the same position
    const newCells = placeWord(editableCells, newWord, row, col, direction, 'user');
    if (newCells) {
      setCells(newCells);
      // Add the clue for the new word
      setGridClues(prev => ({
        ...prev,
        [newWord.toUpperCase()]: {
          easy: newClue,
          medium: '',
          hard: '',
        },
      }));
      // Remove old word's clues if different
      if (oldWord.toUpperCase() !== newWord.toUpperCase()) {
        setGridClues(prev => {
          const { [oldWord.toUpperCase()]: _, ...rest } = prev;
          return rest;
        });
      }
    }
  }, [editableCells, setCells]);

  // Invalid placement modal state
  const [invalidPlacementData, setInvalidPlacementData] = useState<{
    word: string;
    invalidSlots: SlotValidation[];
    suggestions: PlacementSuggestion[];
  } | null>(null);

  // Auto-complete state
  const [isAutoCompleting, setIsAutoCompleting] = useState(false);
  const [autoCompleteResult, setAutoCompleteResult] = useState<CSPFillResult | null>(null);

  // Auto-generate result (from prophet selection)
  const [autoGenerateResult, setAutoGenerateResult] = useState<GenerationResult | null>(null);

  // Save current puzzle state to history
  const savePuzzleToHistory = useCallback((
    prophetId: string,
    cells: typeof editableCells,
    words: ThemeWord[],
    placedIds: Set<string>,
    clues: Record<string, DifficultyClues>,
    result: GenerationResult | null
  ) => {
    const entry: PuzzleHistoryEntry = {
      id: `puzzle-${Date.now()}`,
      timestamp: Date.now(),
      prophetId,
      themeWords: words,
      placedInGridIds: Array.from(placedIds),
      gridClues: clues,
      stats: {
        islamicPercentage: result?.stats.islamicPercentage || 0,
        gridFillPercentage: result?.stats.gridFillPercentage || 0,
        themeWordsPlaced: result?.stats.themeWordsPlaced || 0,
        totalWords: result?.placedWords.length || 0,
      },
      gridData: cells.map(row =>
        row.map(cell => ({
          letter: cell.letter,
          isBlack: cell.isBlack,
          source: cell.source,
        }))
      ),
    };

    setPuzzleHistory(prev => {
      // If we're not at the end of history, truncate before adding
      const newHistory = historyIndex >= 0 && historyIndex < prev.length - 1
        ? prev.slice(0, historyIndex + 1)
        : prev;
      return [...newHistory, entry];
    });
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);

  // Restore puzzle from history entry
  const restorePuzzleFromHistory = useCallback((entry: PuzzleHistoryEntry) => {
    // Restore grid cells
    const restoredCells = entry.gridData.map(row =>
      row.map(cell => ({
        letter: cell.letter,
        isBlack: cell.isBlack,
        source: cell.source as 'user' | 'auto' | 'empty',
        number: null, // Will be recalculated
      }))
    );
    setCells(restoredCells);

    // Restore theme words
    setThemeWords(entry.themeWords);

    // Restore placed IDs
    setPlacedInGridIds(new Set(entry.placedInGridIds));

    // Restore clues
    setGridClues(entry.gridClues);

    // Update previous words for regeneration comparison
    const placedWords = entry.themeWords
      .filter(w => entry.placedInGridIds.includes(w.id))
      .map(w => w.activeSpelling.toUpperCase());
    setPreviousPuzzleWords(new Set(placedWords));
  }, [setCells]);

  // Navigate to previous puzzle in sorted history (better puzzles first)
  const goToPreviousPuzzle = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      restorePuzzleFromHistory(sortedPuzzleHistory[newIndex]);
    }
  }, [historyIndex, sortedPuzzleHistory, restorePuzzleFromHistory]);

  // Navigate to next puzzle in sorted history
  const goToNextPuzzle = useCallback(() => {
    if (historyIndex < sortedPuzzleHistory.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      restorePuzzleFromHistory(sortedPuzzleHistory[newIndex]);
    }
  }, [historyIndex, sortedPuzzleHistory, restorePuzzleFromHistory]);

  // Detect words in the editable grid
  const detectedWords = useMemo(() => {
    return detectWords(editableCells);
  }, [editableCells]);

  // Handle regenerating a filler word
  const handleRegenerateWord = useCallback((word: { word: string; row: number; col: number; direction: 'across' | 'down' }) => {
    // Get all words currently in the grid to exclude from alternatives
    const usedWords = new Set(detectedWords.map(w => w.word.toUpperCase()));

    // Create a matchPattern wrapper for the word index
    const indexWrapper = {
      matchPattern: (pattern: string) => matchPattern(pattern, wordIndex),
    };

    const result = regenerateWord(editableCells, word, indexWrapper, usedWords);

    if (result) {
      setCells(result.newCells);
      // Update clues: remove old word's clues and add placeholder for new
      setGridClues(prev => {
        const { [word.word.toUpperCase()]: _, ...rest } = prev;
        return {
          ...rest,
          [result.newWord]: {
            easy: '',
            medium: '',
            hard: '',
          },
        };
      });
    }
  }, [editableCells, wordIndex, detectedWords, setCells]);

  // Get the current pattern string for constraint suggestions
  const patternString = currentPattern?.pattern || null;

  // Handle filling a word from constraint suggestions
  const handleFillSuggestion = useCallback((word: string, clue: string) => {
    if (!currentPattern || !selectedCell) return;

    const newCells = placeWord(
      editableCells,
      word,
      currentPattern.startRow,
      currentPattern.startCol,
      editDirection,
      'auto',
      true // Preserve user-typed letters
    );

    if (newCells) {
      setCells(newCells);
    }
  }, [currentPattern, selectedCell, editableCells, editDirection, setCells]);

  // Start with empty word list - user selects keywords from Word Hub

  useEffect(() => {
    const preset = themePresets.find(t => t.id === selectedTheme);
    if (preset) {
      setPuzzleTitle(`${preset.name} Crossword`);
    }
  }, [selectedTheme]);

  const clearWordsForTheme = () => {
    setThemeWords([]);
    setClues({});
    setGeneratedPuzzle(null);
    setSelectedWordId(null);
    setPlacedInGridIds(new Set());
    clearGrid();
  };

  const islamicPercentage = useMemo(() => {
    if (themeWords.length === 0) return 0;
    const islamicCategories = ['prophets', 'names-of-allah', 'quran', 'companions', 'general'];
    const count = themeWords.filter(w => w.category && islamicCategories.includes(w.category)).length;
    return Math.round((count / themeWords.length) * 100);
  }, [themeWords]);

  const addCustomWord = useCallback((word: string) => {
    const upperWord = word.trim().toUpperCase();
    if (!upperWord || upperWord.length > 5 || upperWord.length < 2) return;
    // Check if word already exists
    const exists = themeWords.some(
      (w) => w.activeSpelling.toUpperCase() === upperWord
    );
    if (exists || themeWords.length >= 12) return;

    const id = `custom-${Date.now()}`;
    const newThemeWords = [...themeWords, { id, word: upperWord, clue: '', activeSpelling: upperWord }];
    const newClues = { ...clues, [id]: '' };
    setThemeWords(newThemeWords);
    setClues(newClues);
    setSelectedWordId(id);

    // Try to place the word in the editable grid
    const preferDirection = themeWords.length % 2 === 0 ? 'across' : 'down';
    const result = placeWordAtBestPosition(editableCells, upperWord, preferDirection);
    if (result) {
      setCells(result.cells);
      setPlacedInGridIds(prev => new Set([...prev, id]));
    }

    // Auto-generate puzzle if we have enough words
    if (newThemeWords.length >= 3) {
      setIsGenerating(true);
      generatePuzzle({
        title: puzzleTitle,
        themeWords: newThemeWords,
        targetWords: Math.min(newThemeWords.length, 8),
      }).then((puzzle) => {
        setGeneratedPuzzle(puzzle);
      }).finally(() => {
        setIsGenerating(false);
      });
    } else {
      setGeneratedPuzzle(null);
    }
  }, [themeWords, clues, puzzleTitle, editableCells, setCells]);

  const addProphetKeyword = useCallback((keyword: ProphetKeyword) => {
    // STRICT 5x5 validation: word must be 2-5 letters
    if (keyword.word.length < 2 || keyword.word.length > 5) return;

    // Check if word already exists
    const exists = themeWords.some(
      (w) => w.activeSpelling.toUpperCase() === keyword.word.toUpperCase()
    );
    if (exists || themeWords.length >= 12) return;

    const id = `prophet-${Date.now()}-${keyword.word}`;
    const newWord: ThemeWord = {
      id,
      word: keyword.word,
      clue: keyword.clue,
      activeSpelling: keyword.word,
      category: 'prophets',
    };
    const newThemeWords = [...themeWords, newWord];
    const newClues = { ...clues, [id]: keyword.clue };
    setThemeWords(newThemeWords);
    setClues(newClues);

    // Try to place the word in the editable grid
    // Alternate direction based on number of words for better intersections
    const preferDirection = themeWords.length % 2 === 0 ? 'across' : 'down';
    const result = placeWordAtBestPosition(editableCells, keyword.word, preferDirection);
    if (result) {
      setCells(result.cells);
      // Track that this word was successfully placed in the grid
      setPlacedInGridIds(prev => new Set([...prev, id]));
    }
    // If placement fails, word is still in themeWords but not in grid
    // The UI will show it as "not placed"

    // Auto-generate puzzle if we have enough words
    if (newThemeWords.length >= 3) {
      setIsGenerating(true);
      generatePuzzle({
        title: puzzleTitle,
        themeWords: newThemeWords,
        targetWords: Math.min(newThemeWords.length, 8),
      }).then((puzzle) => {
        setGeneratedPuzzle(puzzle);
      }).finally(() => {
        setIsGenerating(false);
      });
    } else {
      setGeneratedPuzzle(null);
    }
  }, [themeWords, clues, puzzleTitle, editableCells, setCells]);

  const removeProphetKeyword = useCallback((word: string) => {
    const wordToRemove = themeWords.find(
      (w) => w.activeSpelling.toUpperCase() === word.toUpperCase()
    );
    if (!wordToRemove) return;

    const newThemeWords = themeWords.filter((w) => w.id !== wordToRemove.id);
    const { [wordToRemove.id]: _, ...newClues } = clues;

    // Remove word from the editable grid (forceRemove=true to clear even in word squares)
    const newCells = removeWordFromGrid(editableCells, wordToRemove.activeSpelling, true);
    setCells(newCells);

    // Remove from placedInGridIds
    setPlacedInGridIds(prev => {
      const next = new Set(prev);
      next.delete(wordToRemove.id);
      return next;
    });

    setThemeWords(newThemeWords);
    setClues(newClues);
    if (selectedWordId === wordToRemove.id) setSelectedWordId(null);

    // Regenerate puzzle if we still have enough words
    if (newThemeWords.length >= 3) {
      setIsGenerating(true);
      generatePuzzle({
        title: puzzleTitle,
        themeWords: newThemeWords,
        targetWords: Math.min(newThemeWords.length, 8),
      }).then((puzzle) => {
        setGeneratedPuzzle(puzzle);
      }).finally(() => {
        setIsGenerating(false);
      });
    } else {
      setGeneratedPuzzle(null);
    }
  }, [themeWords, clues, selectedWordId, puzzleTitle, editableCells, setCells]);

  const removeWord = useCallback((id: string) => {
    const wordToRemove = themeWords.find(w => w.id === id);
    if (wordToRemove) {
      // Remove word from the editable grid (forceRemove=true to clear even in word squares)
      const newCells = removeWordFromGrid(editableCells, wordToRemove.activeSpelling, true);
      setCells(newCells);

      // Remove from placedInGridIds
      setPlacedInGridIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }

    setThemeWords(themeWords.filter(w => w.id !== id));
    const { [id]: _, ...rest } = clues;
    setClues(rest);
    if (selectedWordId === id) setSelectedWordId(null);
    setGeneratedPuzzle(null);
  }, [themeWords, clues, selectedWordId, editableCells, setCells]);

  const toggleSpelling = (id: string) => {
    setThemeWords(themeWords.map(w => {
      if (w.id !== id || !w.spellingVariants?.length) return w;
      const idx = w.spellingVariants.indexOf(w.activeSpelling);
      return { ...w, activeSpelling: w.spellingVariants[(idx + 1) % w.spellingVariants.length] };
    }));
    setGeneratedPuzzle(null);
  };

  const swapWord = (originalId: string, newWord: string, newClue: string) => {
    const newId = `swap-${Date.now()}`;
    const newThemeWords = themeWords.map(w =>
      w.id === originalId ? { id: newId, word: newWord, clue: newClue, activeSpelling: newWord } : w
    );
    setThemeWords(newThemeWords);
    const { [originalId]: _, ...rest } = clues;
    setClues({ ...rest, [newId]: newClue });

    // Auto-regenerate puzzle
    if (newThemeWords.length >= 3) {
      setIsGenerating(true);
      generatePuzzle({
        title: puzzleTitle,
        themeWords: newThemeWords,
        targetWords: Math.min(newThemeWords.length, 8),
      }).then((puzzle) => {
        setGeneratedPuzzle(puzzle);
      }).finally(() => {
        setIsGenerating(false);
      });
    } else {
      setGeneratedPuzzle(null);
    }
  };

  const addWordFromSuggestion = useCallback((word: string, clue: string) => {
    const upperWord = word.trim().toUpperCase();
    if (!upperWord || upperWord.length > 5 || upperWord.length < 2) return;
    // Check if word already exists
    const exists = themeWords.some(
      (w) => w.activeSpelling.toUpperCase() === upperWord
    );
    if (exists || themeWords.length >= 12) return;

    const id = `suggestion-${Date.now()}`;
    const newThemeWords = [...themeWords, { id, word: upperWord, clue, activeSpelling: upperWord }];
    const newClues = { ...clues, [id]: clue };
    setThemeWords(newThemeWords);
    setClues(newClues);

    // Try to place the word in the editable grid
    const preferDirection = themeWords.length % 2 === 0 ? 'across' : 'down';
    const result = placeWordAtBestPosition(editableCells, upperWord, preferDirection);
    if (result) {
      setCells(result.cells);
      setPlacedInGridIds(prev => new Set([...prev, id]));
    }

    // Auto-generate puzzle if we have enough words
    if (newThemeWords.length >= 3) {
      setIsGenerating(true);
      generatePuzzle({
        title: puzzleTitle,
        themeWords: newThemeWords,
        targetWords: Math.min(newThemeWords.length, 8),
      }).then((puzzle) => {
        setGeneratedPuzzle(puzzle);
      }).finally(() => {
        setIsGenerating(false);
      });
    } else {
      setGeneratedPuzzle(null);
    }
  }, [themeWords, clues, puzzleTitle, editableCells, setCells]);

  const handleGenerate = useCallback(async () => {
    if (themeWords.length < 3) return;
    setIsGenerating(true);
    try {
      const puzzle = await generatePuzzle({
        title: puzzleTitle,
        themeWords,
        targetWords: Math.min(themeWords.length, 8),
      });
      setGeneratedPuzzle(puzzle);
    } finally {
      setIsGenerating(false);
    }
  }, [puzzleTitle, themeWords]);

  // Helper to reset all puzzle-related state
  const resetPuzzleState = useCallback(() => {
    clearGrid();
    setThemeWords([]);
    setClues({});
    setPlacedInGridIds(new Set());
    setGeneratedPuzzle(null);
    setSelectedWordId(null);
    setAutoCompleteResult(null);
    setGridClues({});
  }, [clearGrid]);

  // Handle prophet selection - auto-generate puzzle with prophet's keywords
  const handleProphetSelect = useCallback((prophetId: string, keywords: ProphetKeyword[], shuffle: boolean = false) => {
    // Store prophet selection for regeneration
    setCurrentProphet({ id: prophetId, keywords });

    // Clear existing state
    resetPuzzleState();

    // Process keywords (filter, sort/shuffle, build index)
    const processed = processKeywords(keywords, shuffle);
    if (!processed) return;

    const { validKeywords, keywordWords, boostedIndex, clueMap } = processed;
    const keywordSet = new Set(keywordWords);

    setIsGenerating(true);

    try {
      // Create theme words input for generator
      const themeWordsInput = validKeywords.map(kw => ({
        word: kw.word.toUpperCase(),
        clue: kw.clue,
      }));

      // Generate puzzle with optional random pattern for variety
      const generatorOptions = {
        maxTimeMs: 10000,
        wordIndex: boostedIndex,
        ...(shuffle && { preferredPattern: Math.floor(Math.random() * 8) }),
      };
      const result = generateAutoPuzzle(themeWordsInput, generatorOptions);

      // Process placed words into theme words
      const { themeWords: newThemeWords, clues: newClues, placedIds } = processPlacedWords(
        result.placedWords,
        keywordSet,
        clueMap,
        prophetId
      );

      setThemeWords(newThemeWords);
      setClues(newClues);
      setPlacedInGridIds(placedIds);

      // Apply the generated grid, with CSP completion if needed
      let finalGrid = result.grid;
      let finalResult = result;
      const hasContent = result.grid.some(row => row.some(cell => cell.letter || cell.isBlack));
      const isComplete = result.success && result.stats.gridFillPercentage >= 99;

      // Try CSP completion if grid is incomplete
      if (hasContent && !isComplete) {
        const cspResult = fillGridWithCSP(result.grid, boostedIndex, 10000);
        if (cspResult.success) {
          finalGrid = cspResult.grid;
          finalResult = {
            ...result,
            success: true,
            grid: finalGrid,
            placedWords: [
              ...result.placedWords,
              ...cspResult.placedWords.map(pw => ({
                word: pw.word,
                clue: '',
                row: pw.slot.start.row,
                col: pw.slot.start.col,
                direction: pw.slot.direction,
                isThemeWord: false,
              })),
            ],
            stats: {
              ...result.stats,
              gridFillPercentage: 100,
              fillerWordsPlaced: result.stats.fillerWordsPlaced + cspResult.stats.filledByCSP,
            },
          };
        }
      }

      if (hasContent) {
        setCells(finalGrid);
      }

      setAutoGenerateResult(finalResult);

      // Track placed words for future regeneration comparison
      setPreviousPuzzleWords(new Set(finalResult.placedWords.map(pw => pw.word.toUpperCase())));

      // Save to puzzle history (clear history for new prophet)
      setPuzzleHistory([]);
      setHistoryIndex(-1);
      // Schedule save after state updates
      setTimeout(() => {
        savePuzzleToHistory(prophetId, finalGrid, newThemeWords, placedIds, {}, finalResult);
      }, 0);
    } catch (error) {
      console.error('Error generating puzzle:', error);
    } finally {
      setIsGenerating(false);
    }
  }, [resetPuzzleState, setCells, savePuzzleToHistory]);

  // Handle regenerating the puzzle with the same prophet's keywords
  // Ensures: 1) Complete grid (100% fill), 2) At least 50% different words
  const handleRegeneratePuzzle = useCallback(() => {
    if (!currentProphet) return;

    const MAX_ATTEMPTS = 10;
    const MIN_DIFFERENT_PERCENT = 0.5;

    setIsGenerating(true);
    setAutoGenerateResult(null);
    setAutoCompleteResult(null);

    try {
      // Process keywords (filter, shuffle, build index)
      const processed = processKeywords(currentProphet.keywords, true);
      if (!processed) {
        setIsGenerating(false);
        return;
      }

      const { validKeywords, keywordWords, boostedIndex, clueMap } = processed;
      const keywordSet = new Set(keywordWords);

      // Find best result across multiple attempts
      const bestResult = findBestGenerationResult(
        validKeywords,
        boostedIndex,
        previousPuzzleWords,
        MAX_ATTEMPTS,
        MIN_DIFFERENT_PERCENT
      );

      if (bestResult) {
        // Clear and update state
        resetPuzzleState();

        // Process placed words into theme words
        const { themeWords: newThemeWords, clues: newClues, placedIds } = processPlacedWords(
          bestResult.placedWords,
          keywordSet,
          clueMap,
          currentProphet.id
        );

        setThemeWords(newThemeWords);
        setClues(newClues);
        setPlacedInGridIds(placedIds);

        // Apply the grid, with CSP completion if needed
        let finalGrid = bestResult.grid;
        let finalResult = bestResult;
        const hasContent = bestResult.grid.some(row => row.some(cell => cell.letter || cell.isBlack));
        const isComplete = bestResult.success && bestResult.stats.gridFillPercentage >= 99;

        // Try CSP completion if grid is incomplete
        if (hasContent && !isComplete) {
          const cspResult = fillGridWithCSP(bestResult.grid, boostedIndex, 10000);
          if (cspResult.success) {
            finalGrid = cspResult.grid;
            finalResult = {
              ...bestResult,
              success: true,
              grid: finalGrid,
              placedWords: [
                ...bestResult.placedWords,
                ...cspResult.placedWords.map(pw => ({
                  word: pw.word,
                  clue: '',
                  row: pw.slot.start.row,
                  col: pw.slot.start.col,
                  direction: pw.slot.direction,
                  isThemeWord: false,
                })),
              ],
              stats: {
                ...bestResult.stats,
                gridFillPercentage: 100,
                fillerWordsPlaced: bestResult.stats.fillerWordsPlaced + cspResult.stats.filledByCSP,
              },
            };
          }
        }

        if (hasContent) {
          setCells(finalGrid);
        }

        setAutoGenerateResult(finalResult);
        setPreviousPuzzleWords(new Set(finalResult.placedWords.map(pw => pw.word.toUpperCase())));

        // Save to puzzle history
        setTimeout(() => {
          savePuzzleToHistory(currentProphet.id, finalGrid, newThemeWords, placedIds, gridClues, finalResult);
        }, 0);
      }
    } catch (error) {
      console.error('Error regenerating puzzle:', error);
    } finally {
      setIsGenerating(false);
    }
  }, [currentProphet, previousPuzzleWords, resetPuzzleState, setCells, savePuzzleToHistory, gridClues]);

  // Handle auto-complete (CSP-based gap filling)
  const handleAutoComplete = useCallback(async () => {
    setIsAutoCompleting(true);
    setAutoCompleteResult(null);

    try {
      // Run CSP filling on the current grid
      const result = fillGridWithCSP(editableCells, wordIndex, 15000);

      if (result.success) {
        // Apply the filled grid
        setCells(result.grid);
        setAutoCompleteResult(result);
      } else {
        // Show partial result info
        setAutoCompleteResult(result);
      }
    } catch (error) {
      console.error('Auto-complete error:', error);
    } finally {
      setIsAutoCompleting(false);
    }
  }, [editableCells, wordIndex, setCells]);

  // Handle clearing the grid (also clears generation result states)
  const handleClearGrid = useCallback(() => {
    clearGrid();
    setAutoGenerateResult(null);
    setAutoCompleteResult(null);
  }, [clearGrid]);

  // Check if grid can be completed (for validation)
  const gridCompletionStatus = useMemo(() => {
    return canGridBeFilled(editableCells, wordIndex);
  }, [editableCells, wordIndex]);

  // Grid fill stats for progress indicator
  const gridStats = useMemo(() => {
    return getGridStats(editableCells);
  }, [editableCells]);

  // Handle invalid placement from WordHub
  const handleInvalidPlacement = useCallback((word: string, invalidSlots: SlotValidation[]) => {
    // Get placed words for suggestion generation
    const placedWords = themeWords
      .filter(w => placedInGridIds.has(w.id))
      .map(w => {
        // Find position in grid (simplified - just use first match)
        for (let r = 0; r < editableCells.length; r++) {
          for (let c = 0; c < editableCells[r].length; c++) {
            const cell = editableCells[r][c];
            if (cell.letter === w.activeSpelling[0].toUpperCase()) {
              // Check across
              let match = true;
              for (let i = 0; i < w.activeSpelling.length && match; i++) {
                if (editableCells[r]?.[c + i]?.letter !== w.activeSpelling[i].toUpperCase()) {
                  match = false;
                }
              }
              if (match) {
                return { word: w.activeSpelling, position: { row: r, col: c }, direction: 'across' as const };
              }
              // Check down
              match = true;
              for (let i = 0; i < w.activeSpelling.length && match; i++) {
                if (editableCells[r + i]?.[c]?.letter !== w.activeSpelling[i].toUpperCase()) {
                  match = false;
                }
              }
              if (match) {
                return { word: w.activeSpelling, position: { row: r, col: c }, direction: 'down' as const };
              }
            }
          }
        }
        return null;
      })
      .filter((w): w is NonNullable<typeof w> => w !== null);

    const suggestions = generatePlacementSuggestions(word, invalidSlots, placedWords);
    setInvalidPlacementData({ word, invalidSlots, suggestions });
  }, [themeWords, placedInGridIds, editableCells]);

  // Apply suggestion from invalid placement modal
  const handleApplySuggestion = useCallback((suggestion: PlacementSuggestion) => {
    switch (suggestion.type) {
      case 'remove':
        // Find and remove the word
        const wordToRemove = themeWords.find(
          w => w.activeSpelling.toUpperCase() === suggestion.word.toUpperCase()
        );
        if (wordToRemove) {
          removeProphetKeyword(suggestion.word);
        }
        break;
      case 'blackbox':
        // Add black box at the suggested position
        toggleBlackCell(suggestion.position.row, suggestion.position.col);
        break;
      case 'replace':
        // For now, just remove the old word (user can add new one)
        const oldWord = themeWords.find(
          w => w.activeSpelling.toUpperCase() === suggestion.oldWord.toUpperCase()
        );
        if (oldWord) {
          removeProphetKeyword(suggestion.oldWord);
        }
        break;
    }
    setInvalidPlacementData(null);
  }, [themeWords, removeProphetKeyword, toggleBlackCell]);

  // Handle black box from warnings panel
  const handleApplyBlackBox = useCallback((pos: { row: number; col: number }) => {
    toggleBlackCell(pos.row, pos.col);
  }, [toggleBlackCell]);

  // Compute slot warning cells for grid overlay
  const slotWarningCells = useMemo(() => {
    const cells: { row: number; col: number; isWarning: boolean; isSuggestedBlackBox: boolean }[] = [];
    const addedCells = new Set<string>();

    for (const validation of slotWarnings) {
      // Add all cells in the invalid slot as warnings
      for (let i = 0; i < validation.slot.length; i++) {
        const row = validation.slot.direction === 'down'
          ? validation.slot.start.row + i
          : validation.slot.start.row;
        const col = validation.slot.direction === 'across'
          ? validation.slot.start.col + i
          : validation.slot.start.col;
        const key = `${row}-${col}`;

        if (!addedCells.has(key)) {
          cells.push({ row, col, isWarning: true, isSuggestedBlackBox: false });
          addedCells.add(key);
        }
      }

      // Add suggested black box position
      if (validation.suggestedBlackBox) {
        const { row, col } = validation.suggestedBlackBox;
        const key = `${row}-${col}-suggest`;
        if (!addedCells.has(key)) {
          // Check if this cell is already marked
          const existingIdx = cells.findIndex(c => c.row === row && c.col === col);
          if (existingIdx >= 0) {
            cells[existingIdx].isSuggestedBlackBox = true;
          } else {
            cells.push({ row, col, isWarning: false, isSuggestedBlackBox: true });
          }
          addedCells.add(key);
        }
      }
    }

    return cells;
  }, [slotWarnings]);

  const selectedWord = themeWords.find(w => w.id === selectedWordId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#001a2c] via-[#003B5C] to-[#002a42]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#004d77]/60 backdrop-blur-md border-b border-[#4A90C2]/20">
        <div className="container mx-auto px-4 md:px-6 py-3 md:py-4">
          <div className="flex flex-wrap items-center gap-3 md:gap-6">
            {/* Logo - smaller on mobile */}
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-gradient-to-br from-[#D4AF37] to-[#b8952f] flex items-center justify-center shadow-lg">
                <span className="text-lg md:text-xl">☪</span>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-white text-base md:text-lg tracking-wide font-serif font-semibold">
                  Crossword Builder
                </h1>
                <p className="text-[#8fc1e3] text-[10px] md:text-xs tracking-widest uppercase">5×5 Islamic Puzzles</p>
              </div>
            </div>

            {/* Theme Selector - full width on mobile */}
            <div className="w-full sm:w-auto order-last sm:order-none">
              <Select value={selectedTheme} onValueChange={(v) => { setSelectedTheme(v); clearWordsForTheme(); }}>
                <SelectTrigger className="w-full sm:w-[200px] bg-[#002a42]/80 border-[#4A90C2]/30 text-white hover:border-[#D4AF37]/50 transition-colors">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#002a42] border-[#4A90C2]/30">
                  {themePresets.map(t => (
                    <SelectItem key={t.id} value={t.id} className="text-white data-[highlighted]:bg-[#D4AF37] data-[highlighted]:text-[#001a2c]">
                      <span className="flex items-center gap-2">
                        <span>{t.icon}</span>
                        <span>{t.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Title Input - hidden on mobile, shown on tablet+ */}
            <div className="hidden sm:flex flex-1 min-w-[200px] max-w-[320px]">
              <Input
                value={puzzleTitle}
                onChange={(e) => setPuzzleTitle(e.target.value)}
                className="bg-[#002a42]/80 border-[#4A90C2]/30 text-white placeholder:text-[#6ba8d4] font-serif text-lg focus:ring-2 focus:ring-[#4A90C2]/30"
              />
            </div>

            {/* Islamic Percentage - always visible but compact on mobile */}
            <div
              role="status"
              aria-label={`${islamicPercentage}% Islamic words ${islamicPercentage >= 50 ? '- meets requirement' : '- below required 50%'}`}
              className={cn(
                'px-2 md:px-4 py-1 md:py-2 rounded-full flex items-center gap-1 md:gap-2 transition-all hover:-translate-y-0.5 hover:shadow-lg',
                islamicPercentage >= 50
                  ? 'bg-emerald-900/50 border border-emerald-500/30'
                  : 'bg-red-900/50 border border-red-500/30'
              )}
            >
              <div
                className={cn(
                  'w-2 h-2 rounded-full animate-pulse',
                  islamicPercentage >= 50 ? 'bg-emerald-400' : 'bg-red-400'
                )}
                aria-hidden="true"
              />
              <span className="text-white font-medium text-sm md:text-base">{islamicPercentage}%</span>
              <span className="text-[#8fc1e3] text-xs md:text-sm hidden md:inline">Islamic</span>
              <span className="sr-only">
                {islamicPercentage >= 50 ? 'Requirement met' : 'Below 50% requirement'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 md:px-6 py-4 md:py-8" aria-label="Crossword puzzle builder">
        {/* Mobile Tab Switcher - visible only on small screens */}
        <div className="flex md:hidden border-b border-[#4A90C2]/20 mb-4" role="tablist" aria-label="View selection">
          <button
            onClick={() => setMobileTab('grid')}
            role="tab"
            aria-selected={mobileTab === 'grid'}
            aria-controls="grid-panel"
            id="grid-tab"
            className={cn(
              "flex-1 py-3 flex items-center justify-center gap-2 text-sm font-medium transition-colors min-h-[44px]",
              mobileTab === 'grid'
                ? "text-[#D4AF37] border-b-2 border-[#D4AF37]"
                : "text-[#8fc1e3] hover:text-white"
            )}
          >
            <Grid3X3 className="w-4 h-4" aria-hidden="true" />
            Grid
          </button>
          <button
            onClick={() => setMobileTab('clues')}
            role="tab"
            aria-selected={mobileTab === 'clues'}
            aria-controls="clues-panel"
            id="clues-tab"
            className={cn(
              "flex-1 py-3 flex items-center justify-center gap-2 text-sm font-medium transition-colors min-h-[44px]",
              mobileTab === 'clues'
                ? "text-[#D4AF37] border-b-2 border-[#D4AF37]"
                : "text-[#8fc1e3] hover:text-white"
            )}
          >
            <FileText className="w-4 h-4" aria-hidden="true" />
            Clues
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] lg:grid-cols-[280px_1fr_320px] gap-4 md:gap-6 lg:gap-8">

          {/* Left Column: Slot Stats + Constraint Suggestions + Gap Fillers - hidden on mobile/tablet */}
          <div className="hidden lg:block space-y-4 lg:space-y-6">
            {/* Slot Statistics */}
            <SlotStats
              cells={editableCells}
              themeWords={themeWords}
            />

            {/* Live Constraint Suggestions */}
            <ConstraintSuggestions
              pattern={patternString}
              direction={editDirection}
              onSelectWord={handleFillSuggestion}
            />

            {/* Gap Fillers (for generated puzzle) */}
            {generatedPuzzle && (
              <GapFillers
                suggestions={generatedPuzzle?.fillerSuggestions || []}
                themeWords={themeWords}
                puzzle={generatedPuzzle}
                onSwapWord={swapWord}
                onRemoveWord={removeWord}
                onAddWord={addWordFromSuggestion}
              />
            )}

            {/* Slot Warnings Panel (for perpendicular validation) */}
            {slotWarnings.length > 0 && (
              <SlotWarningsPanel
                validations={slotWarnings}
                onApplyBlackBox={handleApplyBlackBox}
              />
            )}

            {/* Detected Words Panel */}
            {detectedWords.length > 0 && (
              <Card className="bg-[#004d77]/40 backdrop-blur-sm border-[#4A90C2]/20 overflow-hidden">
                <CardContent className="p-4">
                  <h3 className="text-[#D4AF37] text-sm font-semibold mb-3 uppercase tracking-wider">
                    Detected Words ({detectedWords.length})
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {detectedWords.map((word, i) => (
                      <span
                        key={`${word.word}-${word.direction}-${i}`}
                        className={cn(
                          'px-2 py-1 rounded text-xs font-mono',
                          word.isValid
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-red-500/20 text-red-400 border border-red-500/30'
                        )}
                      >
                        {word.word}
                        <span className="ml-1 opacity-60">
                          {word.direction === 'across' ? '→' : '↓'}
                        </span>
                      </span>
                    ))}
                  </div>
                  {detectedWords.some(w => !w.isValid) && (
                    <p className="text-red-400 text-xs mt-2">
                      Red words are not in the dictionary
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Center Column: Word Hub + Puzzle Grid - conditional visibility on mobile */}
          <div className={cn("space-y-4 md:space-y-6", mobileTab !== 'grid' && 'hidden md:block')}>
            {/* Mobile-only title input */}
            <div className="sm:hidden">
              <Input
                value={puzzleTitle}
                onChange={(e) => setPuzzleTitle(e.target.value)}
                placeholder="Puzzle title..."
                className="bg-[#002a42]/80 border-[#4A90C2]/30 text-white placeholder:text-[#6ba8d4] font-serif text-base focus:ring-2 focus:ring-[#4A90C2]/30"
              />
            </div>

            {/* Word Hub - shown for prophets theme */}
            {selectedTheme === 'prophets' && (
              <Card className="bg-[#004d77]/40 backdrop-blur-sm border-[#4A90C2]/20 overflow-hidden border-t-2 border-t-[#D4AF37]">
                <CardContent className="p-4 md:p-5">
                  <WordHub
                    onKeywordSelect={addProphetKeyword}
                    onKeywordDeselect={removeProphetKeyword}
                    onCustomWordAdd={addCustomWord}
                    onWordRemove={removeWord}
                    onWordSelect={setSelectedWordId}
                    selectedWords={themeWords}
                    selectedWordId={selectedWordId}
                    puzzle={generatedPuzzle}
                    placedInGridIds={placedInGridIds}
                    editableCells={editableCells}
                    wordIndex={wordIndex}
                    onInvalidPlacement={handleInvalidPlacement}
                    onProphetSelect={handleProphetSelect}
                  />
                </CardContent>
              </Card>
            )}

            {/* Always-On Editable Grid */}
            <Card className="bg-[#004d77]/40 backdrop-blur-sm border-[#4A90C2]/20 overflow-hidden">
              <CardContent className="p-4 md:p-6">
                <div className="flex justify-center mb-4">
                  <CrosswordGrid
                    grid={toGeneratedPuzzleGrid(calculateCellNumbers(editableCells))}
                    theme="dark"
                    cellSize="lg"
                    showControls={false}
                    showNumbers={true}
                    showLetters={true}
                    editable={true}
                    editableGrid={editableCells}
                    editDirection={editDirection}
                    selectedCell={selectedCell}
                    onCellSelect={selectCell}
                    onKeyDown={handleKeyDown}
                    onContextMenu={handleContextMenu}
                    slotWarningCells={slotWarningCells}
                  />
                </div>

                {/* Grid Fill Progress */}
                {gridStats.whiteCells > 0 && (
                  <div className="mb-4">
                    <div className="flex justify-between text-xs text-[#8fc1e3] mb-1">
                      <span id="progress-label">Grid Fill Progress</span>
                      <span>{Math.round((gridStats.filledCells / gridStats.whiteCells) * 100)}%</span>
                    </div>
                    <div
                      className="h-2 bg-[#001a2c]/60 rounded-full overflow-hidden"
                      role="progressbar"
                      aria-labelledby="progress-label"
                      aria-valuenow={Math.round((gridStats.filledCells / gridStats.whiteCells) * 100)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <div
                        className="h-full bg-gradient-to-r from-[#4A90C2] to-[#D4AF37] transition-all duration-300"
                        style={{ width: `${(gridStats.filledCells / gridStats.whiteCells) * 100}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-[#6ba8d4] mt-1">
                      <span>{gridStats.filledCells} filled</span>
                      <span>{gridStats.emptyCells} empty</span>
                    </div>
                  </div>
                )}

                {/* Puzzle History Navigation - sorted by theme word count (best first) */}
                {sortedPuzzleHistory.length > 1 && (
                  <div className="flex items-center justify-center gap-2 mb-4 py-2 px-4 bg-[#001a2c]/40 rounded-lg border border-[#4A90C2]/20">
                    <Button
                      onClick={goToPreviousPuzzle}
                      disabled={historyIndex <= 0}
                      variant="outline"
                      size="icon"
                      className="border-[#4A90C2]/40 text-[#8fc1e3] hover:bg-[#4A90C2]/20 hover:text-white disabled:opacity-30 h-8 w-8"
                      title="Better variation (more theme words)"
                      aria-label="Go to better puzzle variation"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </Button>
                    <div className="text-center min-w-[140px]">
                      <span className="text-[#D4AF37] font-medium">
                        #{historyIndex + 1} of {sortedPuzzleHistory.length}
                      </span>
                      {historyIndex >= 0 && sortedPuzzleHistory[historyIndex] && (
                        <div className="text-[10px] text-[#6ba8d4] mt-0.5">
                          {sortedPuzzleHistory[historyIndex].stats.themeWordsPlaced} theme words
                          {' • '}
                          {sortedPuzzleHistory[historyIndex].stats.islamicPercentage.toFixed(0)}% Islamic
                        </div>
                      )}
                    </div>
                    <Button
                      onClick={goToNextPuzzle}
                      disabled={historyIndex >= sortedPuzzleHistory.length - 1}
                      variant="outline"
                      size="icon"
                      className="border-[#4A90C2]/40 text-[#8fc1e3] hover:bg-[#4A90C2]/20 hover:text-white disabled:opacity-30 h-8 w-8"
                      title="Next variation (fewer theme words)"
                      aria-label="Go to next puzzle variation"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Button>
                  </div>
                )}

                {/* Grid Actions */}
                <div className="flex flex-wrap justify-center gap-3 mt-4">
                  <Button
                    onClick={undo}
                    disabled={!canUndo}
                    variant="outline"
                    size="icon"
                    className="border-[#4A90C2]/40 text-[#8fc1e3] hover:bg-[#4A90C2]/20 hover:text-white disabled:opacity-30 min-h-[44px] min-w-[44px]"
                    title="Undo (Ctrl+Z)"
                    aria-label="Undo last action"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                    </svg>
                  </Button>
                  <Button
                    onClick={handleClearGrid}
                    variant="outline"
                    className="border-[#4A90C2]/40 text-[#8fc1e3] hover:bg-[#4A90C2]/20 hover:text-white min-h-[44px]"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Clear Grid
                  </Button>

                  {/* Auto-Complete Button */}
                  <Button
                    onClick={handleAutoComplete}
                    disabled={isAutoCompleting || gridStats.emptyCells === 0}
                    aria-busy={isAutoCompleting}
                    className={cn(
                      "px-6 transition-all min-h-[44px]",
                      gridCompletionStatus.canFill
                        ? "bg-emerald-600 hover:bg-emerald-500 text-white hover:scale-105"
                        : "bg-amber-600 hover:bg-amber-500 text-white"
                    )}
                  >
                    {isAutoCompleting ? (
                      <>
                        <svg className="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Filling...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Auto-Complete
                      </>
                    )}
                  </Button>

                  {/* Regenerate Puzzle Button - only show when a prophet is selected */}
                  {currentProphet && (
                    <Button
                      onClick={handleRegeneratePuzzle}
                      disabled={isGenerating}
                      aria-busy={isGenerating}
                      className="bg-[#D4AF37] hover:bg-[#e5c86b] text-[#001a2c] px-6 transition-all hover:scale-105 min-h-[44px]"
                    >
                      {isGenerating ? (
                        <>
                          <svg className="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Generating...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Regenerate Puzzle
                        </>
                      )}
                    </Button>
                  )}

                  {themeWords.length >= 3 && (
                    <Button
                      onClick={handleGenerate}
                      disabled={isGenerating}
                      aria-busy={isGenerating}
                      className="bg-[#4A90C2] hover:bg-[#5ba0d2] text-white px-6 transition-all hover:scale-105 min-h-[44px]"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Auto-Generate
                    </Button>
                  )}
                </div>

                {/* Auto-Generate Result (from prophet selection) */}
                {autoGenerateResult && (
                  <div className={cn(
                    "mt-4 p-3 rounded-lg text-sm",
                    autoGenerateResult.success
                      ? "bg-emerald-900/30 border border-emerald-500/30 text-emerald-400"
                      : "bg-amber-900/30 border border-amber-500/30 text-amber-400"
                  )}>
                    <div className="font-semibold mb-1">
                      {autoGenerateResult.success ? 'Puzzle Generated!' : 'Partial Grid Generated'}
                    </div>
                    <div className="text-xs opacity-80 space-y-1">
                      <div>Theme words placed: {autoGenerateResult.stats.themeWordsPlaced}</div>
                      <div>Grid fill: {autoGenerateResult.stats.gridFillPercentage.toFixed(0)}%</div>
                      {autoGenerateResult.stats.islamicPercentage > 0 && (
                        <div>Islamic words: {autoGenerateResult.stats.islamicPercentage.toFixed(0)}%</div>
                      )}
                      {!autoGenerateResult.success && (
                        <div className="text-amber-300 mt-2">
                          Use &quot;Auto-Complete&quot; to fill remaining slots, or manually edit the grid.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Auto-Complete Result */}
                {autoCompleteResult && (
                  <div className={cn(
                    "mt-4 p-3 rounded-lg text-sm",
                    autoCompleteResult.success
                      ? "bg-emerald-900/30 border border-emerald-500/30 text-emerald-400"
                      : "bg-amber-900/30 border border-amber-500/30 text-amber-400"
                  )}>
                    <div className="font-semibold mb-1">
                      {autoCompleteResult.success ? 'Grid Completed!' : 'Partial Fill'}
                    </div>
                    <div className="text-xs opacity-80 space-y-1">
                      <div>Filled {autoCompleteResult.stats.filledByCSP} slots in {autoCompleteResult.stats.timeTakenMs}ms</div>
                      <div>Avg word score: {autoCompleteResult.stats.avgWordScore.toFixed(0)}</div>
                      {autoCompleteResult.stats.islamicPercentage > 0 && (
                        <div>Islamic words: {autoCompleteResult.stats.islamicPercentage.toFixed(0)}%</div>
                      )}
                      {!autoCompleteResult.success && autoCompleteResult.unfilledSlots.length > 0 && (
                        <div className="text-amber-300">
                          {autoCompleteResult.unfilledSlots.length} slot(s) could not be filled
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Can't Complete Warning */}
                {!gridCompletionStatus.canFill && gridStats.emptyCells > 0 && (
                  <div className="mt-4 p-3 rounded-lg bg-red-900/30 border border-red-500/30 text-red-400 text-sm">
                    <div className="font-semibold mb-1">Cannot Complete Grid</div>
                    <div className="text-xs opacity-80">
                      Some slots have no valid words. Try:
                      <ul className="list-disc ml-4 mt-1">
                        <li>Adding black squares to shorten problematic slots</li>
                        <li>Changing some letters</li>
                        <li>Using a different black square pattern</li>
                      </ul>
                    </div>
                  </div>
                )}

                {/* Stats for generated puzzle */}
                {generatedPuzzle && (
                  <div className="mt-6 pt-6 border-t border-[#4A90C2]/20">
                    <PuzzleStats statistics={generatedPuzzle.statistics} />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Generated Puzzle Preview (shows when auto-generated) */}
            {generatedPuzzle && (
              <Card className="bg-[#004d77]/40 backdrop-blur-sm border-[#4A90C2]/20 overflow-hidden">
                <CardContent className="p-4 md:p-6">
                  <h3 className="text-[#D4AF37] text-sm font-semibold mb-4 uppercase tracking-wider">
                    Auto-Generated Preview
                  </h3>
                  <div className="flex justify-center">
                    <CrosswordGrid
                      grid={generatedPuzzle.grid}
                      clues={generatedPuzzle.clues}
                      theme="dark"
                      cellSize="sm"
                      showControls={false}
                      showNumbers={true}
                      showLetters={true}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

          </div>

          {/* Right Column: Clue Editor - hidden on mobile, visible on tablet+ */}
          <div className={cn("space-y-4 md:space-y-6", mobileTab !== 'clues' && 'hidden md:block')}>
            <Card className="bg-[#004d77]/40 backdrop-blur-sm border-[#4A90C2]/20 overflow-hidden border-t-2 border-t-[#D4AF37]">
              <CardContent className="p-4 md:p-5">
                <h3 className="text-[#D4AF37] text-base md:text-lg mb-3 md:mb-4 font-serif font-semibold tracking-wide">
                  Clue Editor
                </h3>

                <LiveClueEditor
                  cells={editableCells}
                  clues={gridClues}
                  selectedDifficulties={selectedDifficulties}
                  onClueChange={handleGridClueChange}
                  onDifficultyChange={handleDifficultyChange}
                  onClueOptionsUpdate={handleClueOptionsUpdate}
                  onSwapClueAlternative={handleSwapClueAlternative}
                  onSwapWord={handleSwapWord}
                  onRegenerateWord={handleRegenerateWord}
                  selectedWord={selectedGridWord}
                  onSelectWord={setSelectedGridWord}
                />
              </CardContent>
            </Card>

          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-[#004d77]/90 backdrop-blur-md border-t border-[#4A90C2]/20 z-40">
        <div className="container mx-auto px-4 md:px-6 py-3 md:py-4">
          <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-2 sm:gap-4">
            {/* Primary button - full width on mobile */}
            <Button
              onClick={() => generatedPuzzle && downloadFlutterJson(generatedPuzzle, selectedTheme, puzzleTitle)}
              disabled={!generatedPuzzle}
              className="w-full sm:w-auto bg-gradient-to-r from-[#D4AF37] to-[#b8952f] hover:from-[#e5c86b] hover:to-[#D4AF37] text-[#001a2c] font-bold px-4 md:px-6 shadow-lg shadow-[#D4AF37]/20 transition-all hover:scale-105 disabled:opacity-40"
            >
              <svg className="w-4 h-4 md:w-5 md:h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <span className="hidden sm:inline">Export Flutter JSON</span>
              <span className="sm:hidden">Export Flutter</span>
            </Button>
            {/* Secondary buttons - side by side on mobile */}
            <div className="flex gap-2 sm:contents">
              <Button
                disabled={!generatedPuzzle}
                variant="outline"
                className="flex-1 sm:flex-none border-[#4A90C2]/40 bg-[#002a42]/80 text-white hover:bg-[#003B5C] disabled:opacity-40"
              >
                <svg className="w-4 h-4 md:w-5 md:h-5 mr-1 md:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="hidden sm:inline">Export </span>IPUZ
              </Button>
              <Button
                disabled={!generatedPuzzle}
                variant="outline"
                className="flex-1 sm:flex-none border-[#4A90C2]/40 bg-[#002a42]/80 text-white hover:bg-[#003B5C] disabled:opacity-40"
              >
                <svg className="w-4 h-4 md:w-5 md:h-5 mr-1 md:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                <span className="hidden sm:inline">Export </span>PDF
              </Button>
            </div>
          </div>
        </div>
      </footer>

      {/* Spacer for fixed footer - taller on mobile due to stacked buttons */}
      <div className="h-32 sm:h-24" />

      {/* Invalid Placement Modal */}
      {invalidPlacementData && (
        <InvalidPlacementModal
          word={invalidPlacementData.word}
          invalidSlots={invalidPlacementData.invalidSlots}
          suggestions={invalidPlacementData.suggestions}
          onClose={() => setInvalidPlacementData(null)}
          onApplySuggestion={handleApplySuggestion}
        />
      )}
    </div>
  );
}
