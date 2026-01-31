'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
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
import { ThemeWord, GeneratedPuzzle } from '@/lib/types';
import { generatePuzzle } from '@/lib/generator-api';
import { PuzzleStats } from '@/components/puzzle-stats';
import { CrosswordGrid } from '@/components/crossword-grid';
import { downloadFlutterJson } from '@/lib/export-flutter';
import { WordHub } from '@/components/word-hub';
import { GapFillers } from '@/components/gap-fillers';
import { ProphetKeyword } from '@/lib/prophet-keywords';
import { KeywordReview } from '@/components/keyword-review';
import { ConstraintSuggestions } from '@/components/constraint-suggestions';
import { SlotStats } from '@/components/slot-stats';
import { useEditableGrid } from '@/hooks/use-editable-grid';
import { detectWords, DetectedWord } from '@/lib/word-detector';
import {
  toGeneratedPuzzleGrid,
  placeWord,
  calculateCellNumbers,
  placeWordAtBestPosition,
  GRID_SIZE,
} from '@/lib/editable-grid';

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
  const [showReviewPanel, setShowReviewPanel] = useState(false);

  // Editable grid hook for always-on interactive grid
  const {
    cells: editableCells,
    selectedCell,
    direction: editDirection,
    currentPattern,
    selectCell,
    handleKeyDown,
    handleContextMenu,
    setCells,
    clearGrid,
  } = useEditableGrid();

  // Detect words in the editable grid
  const detectedWords = useMemo(() => {
    return detectWords(editableCells);
  }, [editableCells]);

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

  const removeProphetKeyword = useCallback((word: string) => {
    const wordToRemove = themeWords.find(
      (w) => w.activeSpelling.toUpperCase() === word.toUpperCase()
    );
    if (!wordToRemove) return;

    const newThemeWords = themeWords.filter((w) => w.id !== wordToRemove.id);
    const { [wordToRemove.id]: _, ...newClues } = clues;

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
  }, [themeWords, clues, selectedWordId, puzzleTitle]);

  const removeWord = (id: string) => {
    setThemeWords(themeWords.filter(w => w.id !== id));
    const { [id]: _, ...rest } = clues;
    setClues(rest);
    if (selectedWordId === id) setSelectedWordId(null);
    setGeneratedPuzzle(null);
  };

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

  const selectedWord = themeWords.find(w => w.id === selectedWordId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#001a2c] via-[#003B5C] to-[#002a42]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#004d77]/60 backdrop-blur-md border-b border-[#4A90C2]/20">
        <div className="container mx-auto px-6 py-4">
          <div className="flex flex-wrap items-center gap-6">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#D4AF37] to-[#b8952f] flex items-center justify-center shadow-lg">
                <span className="text-xl">☪</span>
              </div>
              <div>
                <h1 className="text-white text-lg tracking-wide font-serif font-semibold">
                  Crossword Builder
                </h1>
                <p className="text-[#8fc1e3] text-xs tracking-widest uppercase">5×5 Islamic Puzzles</p>
              </div>
            </div>

            {/* Theme Selector */}
            <div>
              <Select value={selectedTheme} onValueChange={(v) => { setSelectedTheme(v); clearWordsForTheme(); }}>
                <SelectTrigger className="w-[200px] bg-[#002a42]/80 border-[#4A90C2]/30 text-white hover:border-[#D4AF37]/50 transition-colors">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#002a42] border-[#4A90C2]/30">
                  {themePresets.map(t => (
                    <SelectItem key={t.id} value={t.id} className="text-white hover:bg-[#003B5C]">
                      <span className="flex items-center gap-2">
                        <span>{t.icon}</span>
                        <span>{t.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Title Input */}
            <div className="flex-1 min-w-[200px] max-w-[320px]">
              <Input
                value={puzzleTitle}
                onChange={(e) => setPuzzleTitle(e.target.value)}
                className="bg-[#002a42]/80 border-[#4A90C2]/30 text-white placeholder:text-[#6ba8d4] font-serif text-lg focus:ring-2 focus:ring-[#4A90C2]/30"
              />
            </div>

            {/* Islamic Percentage */}
            <div
              className={cn(
                'px-4 py-2 rounded-full flex items-center gap-2 transition-all hover:-translate-y-0.5 hover:shadow-lg',
                islamicPercentage >= 50
                  ? 'bg-emerald-900/50 border border-emerald-500/30'
                  : 'bg-red-900/50 border border-red-500/30'
              )}
            >
              <div className={cn(
                'w-2 h-2 rounded-full animate-pulse',
                islamicPercentage >= 50 ? 'bg-emerald-400' : 'bg-red-400'
              )} />
              <span className="text-white font-medium">{islamicPercentage}%</span>
              <span className="text-[#8fc1e3] text-sm">Islamic</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr_340px] gap-8">

          {/* Left Column: Slot Stats + Constraint Suggestions + Gap Fillers */}
          <div className="space-y-6">
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

          {/* Center Column: Word Hub + Puzzle Grid */}
          <div className="space-y-6">
            {/* Word Hub - shown for prophets theme */}
            {selectedTheme === 'prophets' && (
              <Card className="bg-[#004d77]/40 backdrop-blur-sm border-[#4A90C2]/20 overflow-hidden border-t-2 border-t-[#D4AF37]">
                <CardContent className="p-5">
                  <WordHub
                    onKeywordSelect={addProphetKeyword}
                    onKeywordDeselect={removeProphetKeyword}
                    onCustomWordAdd={addCustomWord}
                    onWordRemove={removeWord}
                    onWordSelect={setSelectedWordId}
                    selectedWords={themeWords}
                    selectedWordId={selectedWordId}
                    puzzle={generatedPuzzle}
                  />
                </CardContent>
              </Card>
            )}

            {/* Always-On Editable Grid */}
            <Card className="bg-[#004d77]/40 backdrop-blur-sm border-[#4A90C2]/20 overflow-hidden">
              <CardContent className="p-6">
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
                  />
                </div>

                {/* Grid Actions */}
                <div className="flex justify-center gap-3 mt-4">
                  <Button
                    onClick={clearGrid}
                    variant="outline"
                    className="border-[#4A90C2]/40 text-[#8fc1e3] hover:bg-[#4A90C2]/20 hover:text-white"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Clear Grid
                  </Button>
                  {themeWords.length >= 3 && (
                    <Button
                      onClick={handleGenerate}
                      disabled={isGenerating}
                      className="bg-[#4A90C2] hover:bg-[#5ba0d2] text-white px-6 transition-all hover:scale-105"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Auto-Generate
                    </Button>
                  )}
                </div>

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
                <CardContent className="p-6">
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

          {/* Right Column: Clue Editor */}
          <div className="space-y-6">
            <Card className="bg-[#004d77]/40 backdrop-blur-sm border-[#4A90C2]/20 overflow-hidden border-t-2 border-t-[#D4AF37]">
              <CardContent className="p-5">
                <h3 className="text-[#D4AF37] text-lg mb-4 font-serif font-semibold tracking-wide">
                  Clue Editor
                </h3>

                {selectedWord ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl text-white font-bold tracking-widest font-serif">
                        {selectedWord.activeSpelling}
                      </span>
                      {selectedWord.arabicScript && (
                        <span className="text-[#D4AF37] text-lg">{selectedWord.arabicScript}</span>
                      )}
                    </div>

                    {selectedWord.spellingVariants && selectedWord.spellingVariants.length > 1 && (
                      <button
                        onClick={() => toggleSpelling(selectedWord.id)}
                        className="text-[#8fc1e3] hover:text-[#D4AF37] text-sm flex items-center gap-2 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                        Switch spelling variant
                      </button>
                    )}

                    <Textarea
                      value={clues[selectedWord.id] || selectedWord.clue || ''}
                      onChange={(e) => setClues({ ...clues, [selectedWord.id]: e.target.value })}
                      className="bg-[#001a2c]/60 border-[#4A90C2]/30 text-white min-h-[100px] placeholder:text-[#6ba8d4] resize-none focus:ring-2 focus:ring-[#4A90C2]/30"
                      placeholder="Enter your clue..."
                    />

                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        className="flex-1 border-[#4A90C2]/40 text-[#8fc1e3] hover:bg-[#4A90C2]/20 hover:text-white"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                        </svg>
                        AI Suggest
                      </Button>
                      <Button
                        onClick={() => setSelectedWordId(null)}
                        className="bg-[#D4AF37] hover:bg-[#e5c86b] text-[#001a2c]"
                      >
                        Done
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-[#001a2c]/40 flex items-center justify-center">
                      <svg className="w-8 h-8 text-[#6ba8d4]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </div>
                    <p className="text-[#8fc1e3]">Select a word to edit its clue</p>
                  </div>
                )}

                {/* Clues Display - Clean Crossword Format */}
                <div className="mt-6 pt-6 border-t border-[#4A90C2]/20">
                  {generatedPuzzle ? (
                    <>
                      {/* Across Clues */}
                      <div className="mb-5">
                        <h4 className="text-[#D4AF37] font-semibold mb-3 flex items-center gap-2 uppercase tracking-wider text-sm">
                          <span className="text-base">→</span> Across
                        </h4>
                        <div className="space-y-2">
                          {generatedPuzzle.clues.across.map((clue) => {
                            const isSelected = themeWords.find(w =>
                              w.activeSpelling.toUpperCase() === clue.answer.toUpperCase()
                            )?.id === selectedWordId;
                            return (
                              <button
                                key={`across-${clue.number}`}
                                onClick={() => {
                                  const word = themeWords.find(w =>
                                    w.activeSpelling.toUpperCase() === clue.answer.toUpperCase()
                                  );
                                  if (word) setSelectedWordId(word.id);
                                }}
                                className={cn(
                                  'w-full text-left px-3 py-2 rounded-lg transition-all group',
                                  isSelected
                                    ? 'bg-[#D4AF37]/20 border border-[#D4AF37]/40'
                                    : 'hover:bg-[#001a2c]/60 border border-transparent'
                                )}
                              >
                                <div className="flex items-start gap-2">
                                  <span className="text-[#D4AF37] font-mono font-bold text-sm min-w-[1.5rem]">
                                    {clue.number}.
                                  </span>
                                  <div className="flex-1">
                                    <span className="text-white text-sm">
                                      {clue.clue || 'No clue yet'}
                                    </span>
                                    <span className="text-[#6ba8d4] text-xs ml-1.5">
                                      ({clue.length})
                                    </span>
                                  </div>
                                </div>
                                <div className="ml-6 mt-1 text-[10px] text-[#4A90C2] uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
                                  Answer: {clue.answer}
                                </div>
                              </button>
                            );
                          })}
                          {generatedPuzzle.clues.across.length === 0 && (
                            <p className="text-[#6ba8d4] text-xs italic px-3">No across clues</p>
                          )}
                        </div>
                      </div>

                      {/* Down Clues */}
                      <div>
                        <h4 className="text-[#D4AF37] font-semibold mb-3 flex items-center gap-2 uppercase tracking-wider text-sm">
                          <span className="text-base">↓</span> Down
                        </h4>
                        <div className="space-y-2">
                          {generatedPuzzle.clues.down.map((clue) => {
                            const isSelected = themeWords.find(w =>
                              w.activeSpelling.toUpperCase() === clue.answer.toUpperCase()
                            )?.id === selectedWordId;
                            return (
                              <button
                                key={`down-${clue.number}`}
                                onClick={() => {
                                  const word = themeWords.find(w =>
                                    w.activeSpelling.toUpperCase() === clue.answer.toUpperCase()
                                  );
                                  if (word) setSelectedWordId(word.id);
                                }}
                                className={cn(
                                  'w-full text-left px-3 py-2 rounded-lg transition-all group',
                                  isSelected
                                    ? 'bg-[#D4AF37]/20 border border-[#D4AF37]/40'
                                    : 'hover:bg-[#001a2c]/60 border border-transparent'
                                )}
                              >
                                <div className="flex items-start gap-2">
                                  <span className="text-[#D4AF37] font-mono font-bold text-sm min-w-[1.5rem]">
                                    {clue.number}.
                                  </span>
                                  <div className="flex-1">
                                    <span className="text-white text-sm">
                                      {clue.clue || 'No clue yet'}
                                    </span>
                                    <span className="text-[#6ba8d4] text-xs ml-1.5">
                                      ({clue.length})
                                    </span>
                                  </div>
                                </div>
                                <div className="ml-6 mt-1 text-[10px] text-[#4A90C2] uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
                                  Answer: {clue.answer}
                                </div>
                              </button>
                            );
                          })}
                          {generatedPuzzle.clues.down.length === 0 && (
                            <p className="text-[#6ba8d4] text-xs italic px-3">No down clues</p>
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-6">
                      <div className="w-12 h-12 mx-auto mb-3 rounded-lg bg-[#001a2c]/40 flex items-center justify-center">
                        <svg className="w-6 h-6 text-[#6ba8d4]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h7" />
                        </svg>
                      </div>
                      <p className="text-[#8fc1e3] text-sm">
                        Generate a puzzle to see clues
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Keyword Review Toggle */}
            <button
              onClick={() => setShowReviewPanel(!showReviewPanel)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-[#004d77]/40 border border-[#4A90C2]/20 hover:border-[#D4AF37]/30 transition-colors"
            >
              <span className="text-[#8fc1e3] text-sm">Review AI Keywords</span>
              <svg
                className={cn(
                  'w-4 h-4 text-[#8fc1e3] transition-transform',
                  showReviewPanel && 'rotate-180'
                )}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Keyword Review Panel */}
            {showReviewPanel && <KeywordReview />}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-[#004d77]/60 backdrop-blur-md border-t border-[#4A90C2]/20">
        <div className="container mx-auto px-6 py-4">
          <div className="flex flex-wrap justify-center gap-4">
            <Button
              onClick={() => generatedPuzzle && downloadFlutterJson(generatedPuzzle, selectedTheme, puzzleTitle)}
              disabled={!generatedPuzzle}
              className="bg-gradient-to-r from-[#D4AF37] to-[#b8952f] hover:from-[#e5c86b] hover:to-[#D4AF37] text-[#001a2c] font-bold px-6 shadow-lg shadow-[#D4AF37]/20 transition-all hover:scale-105 disabled:opacity-40"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              Export Flutter JSON
            </Button>
            <Button
              disabled={!generatedPuzzle}
              variant="outline"
              className="border-[#4A90C2]/40 bg-[#002a42]/80 text-white hover:bg-[#003B5C] disabled:opacity-40"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export IPUZ
            </Button>
            <Button
              disabled={!generatedPuzzle}
              variant="outline"
              className="border-[#4A90C2]/40 bg-[#002a42]/80 text-white hover:bg-[#003B5C] disabled:opacity-40"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Export PDF
            </Button>
          </div>
        </div>
      </footer>

      <div className="h-24" />
    </div>
  );
}
