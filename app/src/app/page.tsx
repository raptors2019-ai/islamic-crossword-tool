'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { sampleWords } from '@/lib/sample-data';
import { ThemeWord, GeneratedPuzzle, Word } from '@/lib/types';
import { generatePuzzle, wordToThemeWord } from '@/lib/generator-api';
import { PuzzleStats } from '@/components/puzzle-stats';
import { FillerSuggestions } from '@/components/filler-suggestions';
import { CrosswordGrid } from '@/components/crossword-grid';
import { downloadFlutterJson } from '@/lib/export-flutter';

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
  const [wordSearch, setWordSearch] = useState('');
  const [customWordInput, setCustomWordInput] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [generatedPuzzle, setGeneratedPuzzle] = useState<GeneratedPuzzle | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedWordId, setSelectedWordId] = useState<string | null>(null);

  useEffect(() => {
    if (themeWords.length === 0) {
      autoSelectWordsForTheme(selectedTheme);
    }
  }, []);

  useEffect(() => {
    const preset = themePresets.find(t => t.id === selectedTheme);
    if (preset) {
      setPuzzleTitle(`${preset.name} Crossword`);
    }
  }, [selectedTheme]);

  const autoSelectWordsForTheme = (theme: string) => {
    let filtered = sampleWords.filter(w => w.word.length <= 5);
    const themeToCategory: Record<string, string> = {
      prophets: 'prophets',
      names: 'names-of-allah',
      quran: 'quran',
      companions: 'companions',
    };
    if (themeToCategory[theme]) {
      filtered = filtered.filter(w => w.category === themeToCategory[theme]);
    }
    const selected = filtered.slice(0, 8);
    setThemeWords(selected.map(wordToThemeWord));
    setClues(Object.fromEntries(selected.map(w => [w.id, w.clue])));
    setGeneratedPuzzle(null);
  };

  const islamicPercentage = useMemo(() => {
    if (themeWords.length === 0) return 0;
    const islamicCategories = ['prophets', 'names-of-allah', 'quran', 'companions', 'general'];
    const count = themeWords.filter(w => w.category && islamicCategories.includes(w.category)).length;
    return Math.round((count / themeWords.length) * 100);
  }, [themeWords]);

  const filteredWordBank = useMemo(() => {
    const usedIds = new Set(themeWords.map(w => w.id));
    return sampleWords.filter(word => {
      if (usedIds.has(word.id) || word.word.length > 5) return false;
      const matchesSearch = !wordSearch ||
        word.word.toLowerCase().includes(wordSearch.toLowerCase()) ||
        word.clue.toLowerCase().includes(wordSearch.toLowerCase());
      const matchesCategory = !categoryFilter || word.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [wordSearch, themeWords, categoryFilter]);

  const categories = useMemo(() =>
    [...new Set(sampleWords.map(w => w.category).filter(Boolean))],
  []);

  const addWord = (word: Word) => {
    if (themeWords.length >= 12 || word.word.length > 5) return;
    setThemeWords([...themeWords, wordToThemeWord(word)]);
    setClues({ ...clues, [word.id]: word.clue });
    setGeneratedPuzzle(null);
  };

  const addCustomWord = () => {
    const word = customWordInput.trim().toUpperCase();
    if (!word || word.length > 5) return;
    const id = `custom-${Date.now()}`;
    setThemeWords([...themeWords, { id, word, clue: '', activeSpelling: word }]);
    setClues({ ...clues, [id]: '' });
    setCustomWordInput('');
    setSelectedWordId(id);
    setGeneratedPuzzle(null);
  };

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
    setThemeWords(themeWords.map(w =>
      w.id === originalId ? { id: newId, word: newWord, clue: newClue, activeSpelling: newWord } : w
    ));
    const { [originalId]: _, ...rest } = clues;
    setClues({ ...rest, [newId]: newClue });
    setGeneratedPuzzle(null);
  };

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
    <div className="min-h-screen bg-gradient-to-br from-[#001a2c] via-[#003B5C] to-[#002a42] islamic-pattern">
      {/* Header */}
      <header className="glass sticky top-0 z-50 star-pattern">
        <div className="container mx-auto px-6 py-4">
          <div className="flex flex-wrap items-center gap-6">
            {/* Logo */}
            <div className="flex items-center gap-3 animate-fade-in-up">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#D4AF37] to-[#b8952f] flex items-center justify-center shadow-lg">
                <span className="text-xl">☪</span>
              </div>
              <div>
                <h1 className="text-white text-lg tracking-wide" style={{ fontFamily: 'var(--font-display)' }}>
                  Crossword Builder
                </h1>
                <p className="text-[#8fc1e3] text-xs tracking-widest uppercase">5×5 Islamic Puzzles</p>
              </div>
            </div>

            {/* Theme Selector */}
            <div className="animate-fade-in-up stagger-1 opacity-0">
              <Select value={selectedTheme} onValueChange={(v) => { setSelectedTheme(v); autoSelectWordsForTheme(v); }}>
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
            <div className="flex-1 min-w-[200px] max-w-[320px] animate-fade-in-up stagger-2 opacity-0">
              <Input
                value={puzzleTitle}
                onChange={(e) => setPuzzleTitle(e.target.value)}
                className="bg-[#002a42]/80 border-[#4A90C2]/30 text-white placeholder:text-[#6ba8d4] input-glow transition-all"
                style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem' }}
              />
            </div>

            {/* Islamic Percentage */}
            <div className="animate-fade-in-up stagger-3 opacity-0">
              <div className={cn(
                'px-4 py-2 rounded-full flex items-center gap-2 transition-all badge-animated',
                islamicPercentage >= 50
                  ? 'bg-emerald-900/50 border border-emerald-500/30'
                  : 'bg-red-900/50 border border-red-500/30'
              )}>
                <div className={cn(
                  'w-2 h-2 rounded-full',
                  islamicPercentage >= 50 ? 'bg-emerald-400 animate-pulse' : 'bg-red-400 animate-pulse'
                )} />
                <span className="text-white font-medium">{islamicPercentage}%</span>
                <span className="text-[#8fc1e3] text-sm">Islamic</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr_340px] gap-8">

          {/* Left Column: Word Bank */}
          <div className="space-y-6 animate-fade-in-up stagger-1 opacity-0">
            <Card className="glass border-[#4A90C2]/20 overflow-hidden card-gold-accent">
              <CardContent className="p-5">
                <h3 className="section-header text-[#D4AF37] text-lg mb-4 decorative-line">
                  <span>Word Bank</span>
                </h3>

                {/* Add Word */}
                <div className="flex gap-2 mb-5">
                  <Input
                    placeholder="Add word..."
                    value={customWordInput}
                    onChange={(e) => setCustomWordInput(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && addCustomWord()}
                    maxLength={5}
                    className="bg-[#001a2c]/60 border-[#4A90C2]/30 text-white placeholder:text-[#6ba8d4] uppercase tracking-widest input-glow"
                  />
                  <Button
                    onClick={addCustomWord}
                    disabled={!customWordInput.trim() || customWordInput.length > 5}
                    className="bg-[#D4AF37] hover:bg-[#e5c86b] text-[#001a2c] font-bold px-4 transition-all hover:scale-105"
                  >
                    +
                  </Button>
                </div>

                {/* Selected Words */}
                <div className="mb-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[#8fc1e3] text-xs uppercase tracking-widest">Your Words</span>
                    <span className="text-[#D4AF37] font-bold">{themeWords.length}/12</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {themeWords.map((word, index) => {
                      const isPlaced = generatedPuzzle?.placedWordIds.includes(word.id);
                      const isSelected = selectedWordId === word.id;
                      const chipStyle = isSelected
                        ? 'bg-[#D4AF37] text-[#001a2c] shadow-lg shadow-[#D4AF37]/20'
                        : isPlaced
                        ? 'bg-[#4A90C2]/30 text-white border border-[#4A90C2]/40'
                        : 'bg-[#001a2c]/60 text-[#8fc1e3] border border-[#4A90C2]/20';
                      return (
                        <button
                          key={word.id}
                          onClick={() => setSelectedWordId(word.id)}
                          className={cn(
                            'word-chip px-3 py-1.5 rounded-md text-sm font-medium tracking-wide transition-all',
                            chipStyle
                          )}
                          style={{ animationDelay: `${index * 0.05}s` }}
                        >
                          <span className="flex items-center gap-2">
                            {word.activeSpelling}
                            <span
                              onClick={(e) => { e.stopPropagation(); removeWord(word.id); }}
                              className="opacity-50 hover:opacity-100 hover:text-red-400 transition-opacity"
                            >
                              ×
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Search */}
                <div className="relative mb-4">
                  <Input
                    placeholder="Search..."
                    value={wordSearch}
                    onChange={(e) => setWordSearch(e.target.value)}
                    className="bg-[#001a2c]/60 border-[#4A90C2]/30 text-white placeholder:text-[#6ba8d4] pl-9 input-glow"
                  />
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6ba8d4]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>

                {/* Categories */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  <button
                    onClick={() => setCategoryFilter(null)}
                    className={cn(
                      'px-3 py-1 rounded-full text-xs font-medium transition-all',
                      !categoryFilter
                        ? 'bg-[#D4AF37] text-[#001a2c]'
                        : 'bg-[#001a2c]/40 text-[#8fc1e3] hover:bg-[#001a2c]/60'
                    )}
                  >
                    All
                  </button>
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setCategoryFilter(cat || null)}
                      className={cn(
                        'px-3 py-1 rounded-full text-xs font-medium transition-all capitalize',
                        categoryFilter === cat
                          ? 'bg-[#4A90C2] text-white'
                          : 'bg-[#001a2c]/40 text-[#8fc1e3] hover:bg-[#001a2c]/60'
                      )}
                    >
                      {cat?.replace(/-/g, ' ')}
                    </button>
                  ))}
                </div>

                {/* Word List */}
                <div className="max-h-[350px] overflow-y-auto space-y-1.5 custom-scrollbar pr-2">
                  {filteredWordBank.slice(0, 25).map((word) => (
                    <button
                      key={word.id}
                      onClick={() => addWord(word)}
                      className="w-full p-3 rounded-lg text-left transition-all bg-[#001a2c]/40 hover:bg-[#001a2c]/70 border border-transparent hover:border-[#4A90C2]/30 group"
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-white font-medium tracking-wide group-hover:text-[#D4AF37] transition-colors">
                          {word.word}
                        </span>
                        <span className="text-[#6ba8d4] text-xs bg-[#4A90C2]/20 px-2 py-0.5 rounded">
                          {word.word.length}L
                        </span>
                      </div>
                      {word.arabicScript && (
                        <div className="text-[#8fc1e3] text-sm mt-1 opacity-70">{word.arabicScript}</div>
                      )}
                    </button>
                  ))}
                  {filteredWordBank.length > 25 && (
                    <div className="text-center text-[#6ba8d4] text-sm py-3 border-t border-[#4A90C2]/20 mt-2">
                      +{filteredWordBank.length - 25} more available
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Center Column: Puzzle Grid */}
          <div className="space-y-6 animate-fade-in-up stagger-2 opacity-0">
            <Card className="glass border-[#4A90C2]/20 overflow-hidden">
              <CardContent className="p-6">
                {isGenerating ? (
                  <div className="text-center py-16">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-[#D4AF37]/20 to-[#4A90C2]/20 flex items-center justify-center animate-float">
                      <span className="text-4xl animate-pulse">☪</span>
                    </div>
                    <p className="text-[#b3d4ed] text-lg" style={{ fontFamily: 'var(--font-display)' }}>
                      Generating your puzzle...
                    </p>
                    <div className="w-48 h-1 mx-auto mt-4 rounded-full bg-[#001a2c] overflow-hidden">
                      <div className="h-full w-1/2 bg-gradient-to-r from-[#D4AF37] to-[#4A90C2] animate-shimmer" />
                    </div>
                  </div>
                ) : generatedPuzzle ? (
                  <>
                    <div className="flex justify-center mb-6">
                      <CrosswordGrid
                        grid={generatedPuzzle.grid}
                        clues={generatedPuzzle.clues}
                        theme="dark"
                        cellSize="md"
                        showControls={true}
                        showNumbers={true}
                        showLetters={true}
                      />
                    </div>

                    <div className="flex justify-center">
                      <Button
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className="bg-[#4A90C2] hover:bg-[#5ba0d2] text-white px-6 transition-all hover:scale-105"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Regenerate
                      </Button>
                    </div>

                    <div className="mt-6 pt-6 border-t border-[#4A90C2]/20">
                      <PuzzleStats statistics={generatedPuzzle.statistics} />
                    </div>
                  </>
                ) : (
                  <div className="text-center py-16">
                    <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-[#D4AF37]/10 to-[#4A90C2]/10 border border-[#4A90C2]/20 flex items-center justify-center">
                      <svg className="w-12 h-12 text-[#6ba8d4]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 4v16M4 9h16" />
                      </svg>
                    </div>
                    <h3 className="text-white text-xl mb-2" style={{ fontFamily: 'var(--font-display)' }}>
                      Ready to Create
                    </h3>
                    <p className="text-[#8fc1e3] mb-6">
                      {themeWords.length < 3
                        ? `Add ${3 - themeWords.length} more word${3 - themeWords.length > 1 ? 's' : ''} to generate`
                        : 'Click below to generate your 5×5 puzzle'}
                    </p>
                    <Button
                      onClick={handleGenerate}
                      disabled={themeWords.length < 3}
                      className={cn(
                        'px-8 py-3 text-lg font-semibold transition-all',
                        themeWords.length >= 3
                          ? 'bg-gradient-to-r from-[#D4AF37] to-[#e5c86b] text-[#001a2c] hover:scale-105 animate-pulse-gold'
                          : 'bg-[#4A90C2]/30 text-[#6ba8d4]'
                      )}
                    >
                      Generate Puzzle
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {generatedPuzzle?.fillerSuggestions && generatedPuzzle.fillerSuggestions.length > 0 && (
              <FillerSuggestions
                suggestions={generatedPuzzle.fillerSuggestions}
                themeWords={themeWords}
                onSwapWord={swapWord}
                onUseVariant={(id) => toggleSpelling(id)}
                onRemoveWord={removeWord}
              />
            )}
          </div>

          {/* Right Column: Clue Editor */}
          <div className="space-y-6 animate-fade-in-up stagger-3 opacity-0">
            <Card className="glass border-[#4A90C2]/20 overflow-hidden card-gold-accent">
              <CardContent className="p-5">
                <h3 className="section-header text-[#D4AF37] text-lg mb-4 decorative-line">
                  <span>Clue Editor</span>
                </h3>

                {selectedWord ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl text-white font-bold tracking-widest" style={{ fontFamily: 'var(--font-display)' }}>
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
                      className="bg-[#001a2c]/60 border-[#4A90C2]/30 text-white min-h-[100px] placeholder:text-[#6ba8d4] input-glow resize-none"
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

                {/* All Clues */}
                <div className="mt-6 pt-6 border-t border-[#4A90C2]/20">
                  <h4 className="text-[#8fc1e3] text-xs uppercase tracking-widest mb-3">All Clues</h4>
                  <div className="max-h-[280px] overflow-y-auto space-y-2 custom-scrollbar pr-2">
                    {themeWords.map((word) => {
                      const isPlaced = generatedPuzzle?.placedWordIds.includes(word.id);
                      return (
                        <button
                          key={word.id}
                          onClick={() => setSelectedWordId(word.id)}
                          className={cn(
                            'w-full p-3 rounded-lg text-left transition-all border',
                            selectedWordId === word.id
                              ? 'bg-[#D4AF37]/20 border-[#D4AF37]/40'
                              : 'bg-[#001a2c]/40 border-transparent hover:border-[#4A90C2]/30',
                            !isPlaced && generatedPuzzle && 'opacity-50'
                          )}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-white font-semibold tracking-wide">{word.activeSpelling}</span>
                            {!isPlaced && generatedPuzzle && (
                              <span className="text-xs px-2 py-0.5 rounded bg-red-500/20 text-red-300">unplaced</span>
                            )}
                          </div>
                          <p className="text-[#8fc1e3] text-sm line-clamp-1">
                            {clues[word.id] || word.clue || '(no clue)'}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 glass border-t border-[#4A90C2]/20">
        <div className="container mx-auto px-6 py-4">
          <div className="flex flex-wrap justify-center gap-4">
            <Button
              onClick={() => generatedPuzzle && downloadFlutterJson(generatedPuzzle, selectedTheme, puzzleTitle)}
              disabled={!generatedPuzzle}
              className="btn-export-primary bg-gradient-to-r from-[#D4AF37] to-[#b8952f] hover:from-[#e5c86b] hover:to-[#D4AF37] text-[#001a2c] font-bold px-6 shadow-lg shadow-[#D4AF37]/20 transition-all hover:scale-105 disabled:opacity-40"
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
