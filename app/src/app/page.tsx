'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { sampleWords } from '@/lib/sample-data';
import { ThemeWord, GeneratedPuzzle, Word } from '@/lib/types';
import { generatePuzzle, wordToThemeWord } from '@/lib/generator-api';
import { PuzzleStats } from '@/components/puzzle-stats';
import { FillerSuggestions } from '@/components/filler-suggestions';
import { CrosswordGrid } from '@/components/crossword-grid';

// Islamic Crossword Wizard - Mobile-first, guided flow
// Color Theme: Deep Indigo (#003B5C), Sky Blue (#4A90C2), Warm Gold (#D4AF37)

type Step = 'theme' | 'words' | 'arrange' | 'clues' | 'review';

const presetThemes = [
  { id: 'surprise', name: 'Surprise Me!', icon: '🎲', description: 'Auto-pick a great mix', recommended: true },
  { id: 'ramadan', name: 'Ramadan', icon: '🌙', description: 'Fasting, prayers, spiritual growth' },
  { id: 'prophets', name: 'Prophets', icon: '📖', description: 'Stories of the messengers' },
  { id: 'names', name: '99 Names', icon: '✨', description: 'Beautiful names of Allah' },
  { id: 'pillars', name: '5 Pillars', icon: '🕌', description: 'Foundations of Islam' },
  { id: 'custom', name: 'Custom Theme', icon: '🎨', description: 'Enter your own theme title' },
];

export default function Home() {
  const [currentStep, setCurrentStep] = useState<Step>('theme');
  const [selectedPresetTheme, setSelectedPresetTheme] = useState<string>('surprise');
  const [customThemeTitle, setCustomThemeTitle] = useState('');
  const [themeWords, setThemeWords] = useState<ThemeWord[]>([]);
  const [clues, setClues] = useState<Record<string, string>>({});
  const [wordSearch, setWordSearch] = useState('');
  const [customWordInput, setCustomWordInput] = useState('');
  const [generatedPuzzle, setGeneratedPuzzle] = useState<GeneratedPuzzle | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const steps: { id: Step; label: string; icon: string }[] = [
    { id: 'theme', label: 'Theme', icon: '1' },
    { id: 'words', label: 'Words', icon: '2' },
    { id: 'arrange', label: 'Arrange', icon: '3' },
    { id: 'clues', label: 'Clues', icon: '4' },
    { id: 'review', label: 'Review', icon: '5' },
  ];

  const currentStepIndex = steps.findIndex((s) => s.id === currentStep);

  // Auto-select recommended words when entering words step with no selection
  useEffect(() => {
    if (currentStep === 'words' && themeWords.length === 0) {
      const recommended = sampleWords.slice(0, 7);
      const themeWordsFromRecommended = recommended.map(wordToThemeWord);
      setThemeWords(themeWordsFromRecommended);
      const newClues: Record<string, string> = {};
      recommended.forEach((w) => {
        newClues[w.id] = w.clue;
      });
      setClues(newClues);
    }
  }, [currentStep, themeWords.length]);

  // Get theme title
  const themeTitle = useMemo(() => {
    if (selectedPresetTheme === 'custom') {
      return customThemeTitle || 'Custom Crossword';
    }
    const preset = presetThemes.find((t) => t.id === selectedPresetTheme);
    return preset ? `${preset.name} Crossword` : 'Islamic Crossword';
  }, [selectedPresetTheme, customThemeTitle]);

  // Filter word bank based on search and category
  const filteredWordBank = useMemo(() => {
    const usedIds = new Set(themeWords.map((w) => w.id));
    return sampleWords.filter((word) => {
      if (usedIds.has(word.id)) return false;
      const matchesSearch =
        wordSearch === '' ||
        word.word.toLowerCase().includes(wordSearch.toLowerCase()) ||
        word.clue.toLowerCase().includes(wordSearch.toLowerCase()) ||
        word.arabicScript?.includes(wordSearch);
      const matchesCategory = !categoryFilter || word.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [wordSearch, themeWords, categoryFilter]);

  // Get all categories from sample words
  const categories = useMemo(() => {
    return [...new Set(sampleWords.map((w) => w.category).filter(Boolean))];
  }, []);

  // Add word from word bank to theme
  const addWord = (word: Word) => {
    if (themeWords.length >= 20) return;
    const themeWord = wordToThemeWord(word);
    setThemeWords([...themeWords, themeWord]);
    setClues({ ...clues, [word.id]: word.clue });
  };

  // Add custom word
  const addCustomWord = () => {
    if (!customWordInput.trim()) return;
    const word = customWordInput.trim().toUpperCase();
    const id = `custom-${Date.now()}`;
    const themeWord: ThemeWord = {
      id,
      word,
      clue: '',
      activeSpelling: word,
    };
    setThemeWords([...themeWords, themeWord]);
    setClues({ ...clues, [id]: '' });
    setCustomWordInput('');
  };

  // Remove word from theme
  const removeWord = (id: string) => {
    setThemeWords(themeWords.filter((w) => w.id !== id));
    const newClues = { ...clues };
    delete newClues[id];
    setClues(newClues);
  };

  // Toggle spelling variant for a word
  const toggleSpelling = (id: string) => {
    setThemeWords(
      themeWords.map((w) => {
        if (w.id !== id || !w.spellingVariants || w.spellingVariants.length <= 1) {
          return w;
        }
        const currentIndex = w.spellingVariants.indexOf(w.activeSpelling);
        const nextIndex = (currentIndex + 1) % w.spellingVariants.length;
        return { ...w, activeSpelling: w.spellingVariants[nextIndex] };
      })
    );
  };

  // Use a specific spelling variant for a word
  const useVariant = (id: string, variant: string) => {
    setThemeWords(
      themeWords.map((w) => {
        if (w.id !== id) return w;
        return { ...w, activeSpelling: variant };
      })
    );
    // Regenerate puzzle with new spelling
    setGeneratedPuzzle(null);
  };

  // Swap an unplaced word with a suggested alternative
  const swapWord = (originalWordId: string, newWord: string, newClue: string) => {
    const newId = `swap-${Date.now()}`;
    const newThemeWord: ThemeWord = {
      id: newId,
      word: newWord,
      clue: newClue,
      activeSpelling: newWord,
    };

    // Replace the old word with the new one
    setThemeWords(themeWords.map(w => w.id === originalWordId ? newThemeWord : w));
    setClues(prev => {
      const updated = { ...prev };
      delete updated[originalWordId];
      updated[newId] = newClue;
      return updated;
    });

    // Regenerate puzzle with new word
    setGeneratedPuzzle(null);
  };

  // Auto-select words based on theme
  const autoSelectWords = () => {
    const recommended = sampleWords.slice(0, 7);
    const themeWordsFromRecommended = recommended.map(wordToThemeWord);
    setThemeWords(themeWordsFromRecommended);
    const newClues: Record<string, string> = {};
    recommended.forEach((w) => {
      newClues[w.id] = w.clue;
    });
    setClues(newClues);
  };

  // Generate puzzle
  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    try {
      const puzzle = await generatePuzzle({
        title: themeTitle,
        themeWords,
        targetWords: themeWords.length,
      });
      setGeneratedPuzzle(puzzle);
    } catch (error) {
      console.error('Failed to generate puzzle:', error);
    } finally {
      setIsGenerating(false);
    }
  }, [themeTitle, themeWords]);

  // Auto-generate when entering arrange step or when puzzle is reset
  useEffect(() => {
    if (currentStep === 'arrange' && !generatedPuzzle && themeWords.length > 0 && !isGenerating) {
      handleGenerate();
    }
  }, [currentStep, generatedPuzzle, themeWords.length, isGenerating, handleGenerate]);


  // Handle continue button
  const handleContinue = () => {
    if (currentStep === 'theme' && !selectedPresetTheme) {
      setSelectedPresetTheme('surprise');
    }
    if (currentStep === 'words' && themeWords.length === 0) {
      autoSelectWords();
    }
    if (currentStepIndex < steps.length - 1) {
      setCurrentStep(steps[currentStepIndex + 1].id);
    }
  };

  // Reset and start new puzzle
  const startNewPuzzle = () => {
    setCurrentStep('theme');
    setSelectedPresetTheme('surprise');
    setCustomThemeTitle('');
    setThemeWords([]);
    setClues({});
    setGeneratedPuzzle(null);
    setWordSearch('');
    setCustomWordInput('');
    setCategoryFilter(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#003B5C] to-[#002a42]">
      {/* Progress Header */}
      <header className="bg-[#004d77]/50 backdrop-blur-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🕌</span>
              <span className="font-bold text-white">Crossword Wizard</span>
            </div>
            <Badge className="bg-[#4A90C2]/30 text-[#b3d4ed]">
              Step {currentStepIndex + 1} of {steps.length}
            </Badge>
          </div>

          {/* Step Indicators */}
          <div className="flex justify-between">
            {steps.map((step, i) => (
              <button
                key={step.id}
                onClick={() => setCurrentStep(step.id)}
                className={cn(
                  'flex flex-col items-center gap-1 transition-all',
                  i <= currentStepIndex ? 'opacity-100' : 'opacity-40'
                )}
              >
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all',
                    currentStep === step.id
                      ? 'bg-white text-[#003B5C] scale-110'
                      : i < currentStepIndex
                      ? 'bg-[#4A90C2] text-white'
                      : 'bg-[#004d77] text-[#8fc1e3]'
                  )}
                >
                  {i < currentStepIndex ? '✓' : step.icon}
                </div>
                <span
                  className={cn('text-[10px]', currentStep === step.id ? 'text-white' : 'text-[#8fc1e3]')}
                >
                  {step.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={cn(
        "container mx-auto px-4 py-6",
        currentStep === 'arrange' ? 'max-w-4xl' : 'max-w-lg'
      )}>
        {/* Step 1: Theme */}
        {currentStep === 'theme' && (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">Choose a Theme</h2>
              <p className="text-[#b3d4ed] text-sm">Pick one, or create your own!</p>
            </div>

            <div className="space-y-3">
              {presetThemes.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => setSelectedPresetTheme(theme.id)}
                  className={cn(
                    'w-full p-4 rounded-2xl text-left transition-all relative',
                    selectedPresetTheme === theme.id
                      ? 'bg-[#F8FBFD] text-[#003B5C] shadow-xl scale-[1.02]'
                      : 'bg-[#004d77]/50 text-white hover:bg-[#004d77]'
                  )}
                >
                  {theme.recommended && (
                    <Badge className="absolute -top-2 -right-2 bg-[#D4AF37] text-white text-xs">
                      Recommended
                    </Badge>
                  )}
                  <div className="flex items-center gap-4">
                    <span className="text-3xl">{theme.icon}</span>
                    <div className="flex-1">
                      <div className="font-bold text-lg">{theme.name}</div>
                      <div
                        className={cn(
                          'text-sm',
                          selectedPresetTheme === theme.id ? 'text-[#4A90C2]' : 'text-[#8fc1e3]'
                        )}
                      >
                        {theme.description}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Custom theme title input */}
            {selectedPresetTheme === 'custom' && (
              <div className="mt-4 space-y-2">
                <label className="block text-[#b3d4ed] text-sm">Theme Title</label>
                <Input
                  placeholder="e.g., Story of Prophet Adam"
                  value={customThemeTitle}
                  onChange={(e) => setCustomThemeTitle(e.target.value)}
                  className="bg-[#004d77]/50 border-[#4A90C2]/50 text-white placeholder:text-[#8fc1e3]"
                />
              </div>
            )}
          </div>
        )}

        {/* Step 2: Words */}
        {currentStep === 'words' && (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <h2 className="text-2xl font-bold text-white mb-2">Add Words</h2>
              <p className="text-[#b3d4ed] text-sm">{themeTitle}</p>
            </div>

            {/* Word count progress */}
            <div className="bg-[#004d77]/50 rounded-xl p-3 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-[#b3d4ed] text-sm">Theme Words</span>
                <div className="flex items-center gap-2">
                  <span className="text-white font-bold">{themeWords.length}/20</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-[#8fc1e3] text-xs h-6 hover:text-white hover:bg-[#4A90C2]/20"
                    onClick={autoSelectWords}
                  >
                    Reset
                  </Button>
                </div>
              </div>
              <div className="w-full bg-[#003B5C] rounded-full h-2 mt-2">
                <div
                  className="bg-[#4A90C2] rounded-full h-2 transition-all"
                  style={{ width: `${(themeWords.length / 20) * 100}%` }}
                />
              </div>
            </div>

            {/* Custom word input */}
            <div className="flex gap-2">
              <Input
                placeholder="Type a word to add..."
                value={customWordInput}
                onChange={(e) => setCustomWordInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addCustomWord()}
                className="bg-[#004d77]/50 border-[#4A90C2]/50 text-white placeholder:text-[#8fc1e3] flex-1"
              />
              <Button
                onClick={addCustomWord}
                disabled={!customWordInput.trim()}
                className="bg-[#4A90C2] hover:bg-[#3a7eb0] text-white"
              >
                Add
              </Button>
            </div>

            {/* Selected theme words */}
            {themeWords.length > 0 && (
              <div className="bg-[#004d77]/30 rounded-xl p-3">
                <div className="text-[#8fc1e3] text-xs uppercase tracking-wide mb-2">Your Words</div>
                <div className="flex flex-wrap gap-2">
                  {themeWords.map((word) => (
                    <div
                      key={word.id}
                      className="bg-[#4A90C2] text-white px-3 py-1.5 rounded-full text-sm flex items-center gap-2"
                    >
                      <span className="font-medium">{word.activeSpelling}</span>
                      {word.spellingVariants && word.spellingVariants.length > 1 && (
                        <button
                          onClick={() => toggleSpelling(word.id)}
                          className="text-[#b3d4ed] hover:text-white text-xs bg-[#3a7eb0] px-1.5 py-0.5 rounded"
                          title={`Switch to: ${word.spellingVariants.filter((v) => v !== word.activeSpelling).join(', ')}`}
                        >
                          ↔
                        </button>
                      )}
                      <button onClick={() => removeWord(word.id)} className="text-[#b3d4ed] hover:text-white">
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick action - skip ahead */}
            <Card className="bg-[#D4AF37]/20 border-[#D4AF37]/50">
              <CardContent className="p-3 flex items-center justify-between">
                <div>
                  <div className="text-white font-medium text-sm">Happy with these words?</div>
                  <div className="text-[#D4AF37] text-xs">Skip ahead to see your puzzle</div>
                </div>
                <Button
                  size="sm"
                  className="bg-[#D4AF37] hover:bg-[#c9a430] text-[#1A1A1A]"
                  onClick={() => setCurrentStep('arrange')}
                >
                  Generate →
                </Button>
              </CardContent>
            </Card>

            {/* Word bank search */}
            <div className="mt-4">
              <div className="text-[#8fc1e3] text-xs uppercase tracking-wide mb-2">Word Bank</div>
              <Input
                placeholder="Search Islamic words..."
                value={wordSearch}
                onChange={(e) => setWordSearch(e.target.value)}
                className="bg-[#004d77]/50 border-[#4A90C2]/50 text-white placeholder:text-[#8fc1e3]"
              />

              {/* Category filters */}
              <div className="flex flex-wrap gap-1 mt-2">
                <Badge
                  variant={categoryFilter === null ? 'default' : 'outline'}
                  className={cn(
                    'cursor-pointer text-xs',
                    categoryFilter === null
                      ? 'bg-[#4A90C2] text-white'
                      : 'bg-transparent text-[#8fc1e3] border-[#4A90C2]/50 hover:bg-[#004d77]'
                  )}
                  onClick={() => setCategoryFilter(null)}
                >
                  All
                </Badge>
                {categories.map((cat) => (
                  <Badge
                    key={cat}
                    variant={categoryFilter === cat ? 'default' : 'outline'}
                    className={cn(
                      'cursor-pointer text-xs',
                      categoryFilter === cat
                        ? 'bg-[#4A90C2] text-white'
                        : 'bg-transparent text-[#8fc1e3] border-[#4A90C2]/50 hover:bg-[#004d77]'
                    )}
                    onClick={() => setCategoryFilter(cat || null)}
                  >
                    {cat?.replace(/-/g, ' ')}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Word bank grid */}
            <div className="grid grid-cols-2 gap-2 mt-3">
              {filteredWordBank.slice(0, 12).map((word) => (
                <button
                  key={word.id}
                  onClick={() => addWord(word)}
                  className="p-3 rounded-xl text-left transition-all bg-[#004d77]/50 text-white hover:bg-[#004d77]"
                >
                  <div className="font-bold">{word.word}</div>
                  {word.arabicScript && <div className="text-xs text-[#8fc1e3]">{word.arabicScript}</div>}
                  <div className="text-xs text-[#6ba8d4] mt-1">{word.word.length} letters</div>
                  {word.spellingVariants && word.spellingVariants.length > 1 && (
                    <div className="text-[10px] text-[#4A90C2] mt-1">
                      Also: {word.spellingVariants.slice(1).join(', ')}
                    </div>
                  )}
                </button>
              ))}
            </div>

            {filteredWordBank.length > 12 && (
              <div className="text-center text-[#6ba8d4] text-sm">
                +{filteredWordBank.length - 12} more words available
              </div>
            )}
          </div>
        )}

        {/* Step 3: Arrange */}
        {currentStep === 'arrange' && (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <h2 className="text-2xl font-bold text-white mb-2">Your Puzzle</h2>
              <p className="text-[#b3d4ed] text-sm">Auto-arranged for best fit</p>
            </div>

            {isGenerating ? (
              <Card className="bg-[#004d77]/50 border-[#4A90C2]/30">
                <CardContent className="p-6 text-center">
                  <div className="text-4xl mb-4 animate-pulse">🧩</div>
                  <p className="text-[#b3d4ed]">Generating your puzzle...</p>
                </CardContent>
              </Card>
            ) : generatedPuzzle ? (
              <>
                {/* Grid and Stats side-by-side on larger screens */}
                <div className="flex flex-col lg:flex-row gap-4">
                  {/* Left: Grid */}
                  <div className="flex-1">
                    <Card className="bg-[#004d77]/50 border-[#4A90C2]/30">
                      <CardContent className="p-4">
                        <CrosswordGrid
                          grid={generatedPuzzle.grid}
                          clues={generatedPuzzle.clues}
                          theme="dark"
                          cellSize="md"
                          showControls={true}
                          showNumbers={true}
                          showLetters={true}
                        />

                        <div className="flex justify-center gap-2 mt-4">
                          <Button
                            size="sm"
                            onClick={handleGenerate}
                            disabled={isGenerating}
                            className="bg-[#4A90C2] hover:bg-[#3a7eb0] text-white font-bold px-6 shadow-lg"
                          >
                            🔄 Regenerate
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Right: Stats */}
                  <div className="lg:w-80 space-y-4">
                    <PuzzleStats statistics={generatedPuzzle.statistics} />

                    {/* Placed words with variant toggle */}
                    <div className="bg-[#004d77]/30 rounded-xl p-4">
                      <div className="text-[#8fc1e3] text-xs uppercase tracking-wide mb-2">
                        Placed Words (click ↔ to swap spellings)
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {generatedPuzzle.placedWordIds.map((id) => {
                          const word = themeWords.find((w) => w.id === id);
                          if (!word) return null;
                          const hasVariants = word.spellingVariants && word.spellingVariants.length > 1;

                          return (
                            <button
                              key={id}
                              onClick={() => hasVariants && toggleSpelling(id)}
                              disabled={!hasVariants}
                              className={cn(
                                'px-2 py-1 rounded text-sm flex items-center gap-1 text-white',
                                hasVariants
                                  ? 'bg-[#4A90C2] hover:bg-[#3a7eb0] cursor-pointer'
                                  : 'bg-[#004d77] cursor-default'
                              )}
                            >
                              {word.activeSpelling}
                              {hasVariants && <span className="text-[#b3d4ed] text-xs">↔</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Filler Suggestions for unplaced words */}
                    {generatedPuzzle.fillerSuggestions.length > 0 && (
                      <FillerSuggestions
                        suggestions={generatedPuzzle.fillerSuggestions}
                        themeWords={themeWords}
                        onSwapWord={swapWord}
                        onUseVariant={useVariant}
                        onRemoveWord={removeWord}
                      />
                    )}

                    {/* Quick action */}
                    <Card className="bg-[#D4AF37]/20 border-[#D4AF37]/50">
                      <CardContent className="p-3 flex items-center justify-between">
                        <div>
                          <div className="text-white font-medium text-sm">Looks good?</div>
                          <div className="text-[#D4AF37] text-xs">Clues are already filled in</div>
                        </div>
                        <Button
                          size="sm"
                          className="bg-[#D4AF37] hover:bg-[#c9a430] text-[#1A1A1A]"
                          onClick={() => setCurrentStep('review')}
                        >
                          Skip to Export →
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </>
            ) : (
              <Card className="bg-[#004d77]/50 border-[#4A90C2]/30">
                <CardContent className="p-6 text-center">
                  <div className="text-4xl mb-4">🧩</div>
                  <p className="text-[#b3d4ed] mb-4">Ready to generate your puzzle</p>
                  <Button onClick={handleGenerate} className="bg-[#4A90C2] hover:bg-[#3a7eb0] text-white px-8">
                    Generate Puzzle
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Step 4: Clues */}
        {currentStep === 'clues' && (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <h2 className="text-2xl font-bold text-white mb-2">Edit Clues</h2>
              <p className="text-[#b3d4ed] text-sm">Pre-filled from word list - edit if you'd like</p>
            </div>

            {/* Quick action */}
            <Card className="bg-[#D4AF37]/20 border-[#D4AF37]/50">
              <CardContent className="p-3 flex items-center justify-between">
                <div>
                  <div className="text-white font-medium text-sm">Clues look good?</div>
                  <div className="text-[#D4AF37] text-xs">You can always edit later</div>
                </div>
                <Button
                  size="sm"
                  className="bg-[#D4AF37] hover:bg-[#c9a430] text-[#1A1A1A]"
                  onClick={() => setCurrentStep('review')}
                >
                  Finish →
                </Button>
              </CardContent>
            </Card>

            <div className="space-y-3">
              {themeWords
                .filter((w) => !generatedPuzzle || generatedPuzzle.placedWordIds.includes(w.id))
                .map((word, i) => (
                  <Card key={word.id} className="bg-[#004d77]/50 border-[#4A90C2]/30">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-[#4A90C2]">{i + 1}</Badge>
                          <span className="font-bold text-white">{word.activeSpelling}</span>
                          {word.arabicScript && (
                            <span className="text-[#8fc1e3] text-sm">{word.arabicScript}</span>
                          )}
                        </div>
                        <Button variant="ghost" size="sm" className="text-[#8fc1e3] h-8 hover:text-white hover:bg-[#4A90C2]/20">
                          ✨ AI Suggest
                        </Button>
                      </div>
                      <Textarea
                        value={clues[word.id] || word.clue || ''}
                        onChange={(e) => setClues({ ...clues, [word.id]: e.target.value })}
                        className="bg-[#003B5C]/50 border-[#4A90C2]/50 text-white min-h-[60px] placeholder:text-[#6ba8d4]"
                        placeholder="Enter clue..."
                      />
                    </CardContent>
                  </Card>
                ))}
            </div>
          </div>
        )}

        {/* Step 5: Review */}
        {currentStep === 'review' && (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <h2 className="text-2xl font-bold text-white mb-2">🎉 Your Puzzle is Ready!</h2>
              <p className="text-[#b3d4ed] text-sm">{themeTitle}</p>
            </div>

            <Card className="bg-[#F8FBFD]">
              <CardContent className="p-4">
                {generatedPuzzle && (
                  <CrosswordGrid
                    grid={generatedPuzzle.grid}
                    theme="newspaper"
                    cellSize="sm"
                    compact={true}
                    showControls={false}
                    showNumbers={true}
                    showLetters={true}
                  />
                )}

                <div className="space-y-4 text-sm mt-4">
                  {generatedPuzzle && generatedPuzzle.clues.across.length > 0 && (
                    <div>
                      <h4 className="font-bold text-[#003B5C] mb-2">Across</h4>
                      {generatedPuzzle.clues.across.map((clue) => {
                        const word = themeWords.find((w) => w.activeSpelling.toUpperCase() === clue.answer);
                        return (
                          <div key={clue.number} className="text-[#1A1A1A] mb-1">
                            <span className="font-medium">{clue.number}.</span>{' '}
                            {word ? clues[word.id] || word.clue || clue.clue : clue.clue}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {generatedPuzzle && generatedPuzzle.clues.down.length > 0 && (
                    <div>
                      <h4 className="font-bold text-[#003B5C] mb-2">Down</h4>
                      {generatedPuzzle.clues.down.map((clue) => {
                        const word = themeWords.find((w) => w.activeSpelling.toUpperCase() === clue.answer);
                        return (
                          <div key={clue.number} className="text-[#1A1A1A] mb-1">
                            <span className="font-medium">{clue.number}.</span>{' '}
                            {word ? clues[word.id] || word.clue || clue.clue : clue.clue}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="bg-[#F8FBFD] hover:bg-white text-[#003B5C] border-[#4A90C2]/30">
                📄 Export PDF
              </Button>
              <Button variant="outline" className="bg-[#F8FBFD] hover:bg-white text-[#003B5C] border-[#4A90C2]/30">
                🌐 Export HTML
              </Button>
              <Button variant="outline" className="bg-[#F8FBFD] hover:bg-white text-[#003B5C] border-[#4A90C2]/30">
                📋 Copy JSON
              </Button>
              <Button className="bg-[#4A90C2] text-white hover:bg-[#3a7eb0]">🚀 Publish</Button>
            </div>

            {/* Success message */}
            <Card className="bg-gradient-to-r from-[#D4AF37] to-[#c9a430] border-none">
              <CardContent className="p-4 text-center text-white">
                <div className="text-2xl mb-2">✨</div>
                <div className="font-bold">Puzzle created!</div>
                <div className="text-sm opacity-90">Create another one?</div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 bg-white/20 border-white/50 text-white hover:bg-white/30"
                  onClick={startNewPuzzle}
                >
                  + New Puzzle
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-[#003B5C]/95 backdrop-blur-lg p-4 border-t border-[#4A90C2]/30">
          <div className="container mx-auto max-w-lg flex gap-3">
            {currentStepIndex > 0 && (
              <Button
                variant="outline"
                className="flex-1 border-[#4A90C2] bg-[#004d77] text-white hover:bg-[#4A90C2]/20"
                onClick={() => setCurrentStep(steps[currentStepIndex - 1].id)}
              >
                ← Back
              </Button>
            )}
            {currentStepIndex < steps.length - 1 && (
              <Button className="flex-1 font-bold bg-white text-[#003B5C] hover:bg-[#F8FBFD]" onClick={handleContinue}>
                Continue →
              </Button>
            )}
            {currentStepIndex === steps.length - 1 && (
              <Button
                className="flex-1 font-bold bg-[#D4AF37] text-[#1A1A1A] hover:bg-[#c9a430]"
                onClick={() => {
                  alert('Puzzle exported! 🎉');
                }}
              >
                ✨ Export Puzzle
              </Button>
            )}
          </div>
        </div>

        {/* Bottom spacing for fixed nav */}
        <div className="h-24" />
      </main>
    </div>
  );
}
