'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { sampleWords } from '@/lib/sample-data';
import { ThemeWord, GeneratedPuzzle, Word } from '@/lib/types';
import { generatePuzzle, wordToThemeWord } from '@/lib/generator-api';
import { CrosswordGrid } from '@/components/crossword-grid';

// Design B: "Analytics Dashboard" - Stats-focused, horizontal layout
// Colors: Coral #E8634A, Slate #334155, Cream #FEF7ED, Warm Gray #78716C

const presetThemes = [
  { id: 'surprise', name: 'Surprise Me!', icon: '🎲' },
  { id: 'ramadan', name: 'Ramadan', icon: '🌙' },
  { id: 'prophets', name: 'Prophets', icon: '📖' },
  { id: 'names', name: '99 Names', icon: '✨' },
  { id: 'pillars', name: '5 Pillars', icon: '🕌' },
];

export default function DesignB() {
  const [selectedTheme, setSelectedTheme] = useState<string>('surprise');
  const [customTitle, setCustomTitle] = useState('');
  const [themeWords, setThemeWords] = useState<ThemeWord[]>([]);
  const [clues, setClues] = useState<Record<string, string>>({});
  const [wordSearch, setWordSearch] = useState('');
  const [customWordInput, setCustomWordInput] = useState('');
  const [generatedPuzzle, setGeneratedPuzzle] = useState<GeneratedPuzzle | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showClueEditor, setShowClueEditor] = useState(false);
  const [editingClueId, setEditingClueId] = useState<string | null>(null);

  useEffect(() => {
    if (themeWords.length === 0) {
      const recommended = sampleWords.slice(0, 7);
      setThemeWords(recommended.map(wordToThemeWord));
      const newClues: Record<string, string> = {};
      recommended.forEach((w) => { newClues[w.id] = w.clue; });
      setClues(newClues);
    }
  }, []);

  const themeTitle = useMemo(() => {
    if (customTitle) return customTitle;
    const preset = presetThemes.find((t) => t.id === selectedTheme);
    return preset ? `${preset.name} Crossword` : 'Islamic Crossword';
  }, [selectedTheme, customTitle]);

  const filteredWordBank = useMemo(() => {
    const usedIds = new Set(themeWords.map((w) => w.id));
    return sampleWords.filter((word) => {
      if (usedIds.has(word.id)) return false;
      return wordSearch === '' ||
        word.word.toLowerCase().includes(wordSearch.toLowerCase()) ||
        word.clue.toLowerCase().includes(wordSearch.toLowerCase());
    });
  }, [wordSearch, themeWords]);

  // Stats calculations
  const stats = useMemo(() => {
    const totalLetters = themeWords.reduce((sum, w) => sum + w.activeSpelling.length, 0);
    const avgLength = themeWords.length > 0 ? (totalLetters / themeWords.length).toFixed(1) : '0';
    const lengthDistribution: Record<number, number> = {};
    themeWords.forEach(w => {
      const len = w.activeSpelling.length;
      lengthDistribution[len] = (lengthDistribution[len] || 0) + 1;
    });
    const letterFreq: Record<string, number> = {};
    themeWords.forEach(w => {
      w.activeSpelling.split('').forEach(letter => {
        letterFreq[letter] = (letterFreq[letter] || 0) + 1;
      });
    });
    const topLetters = Object.entries(letterFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return { totalLetters, avgLength, lengthDistribution, topLetters };
  }, [themeWords]);

  const addWord = (word: Word) => {
    if (themeWords.length >= 20) return;
    setThemeWords([...themeWords, wordToThemeWord(word)]);
    setClues({ ...clues, [word.id]: word.clue });
    setGeneratedPuzzle(null);
  };

  const addCustomWord = () => {
    if (!customWordInput.trim()) return;
    const word = customWordInput.trim().toUpperCase();
    const id = `custom-${Date.now()}`;
    setThemeWords([...themeWords, { id, word, clue: '', activeSpelling: word }]);
    setClues({ ...clues, [id]: '' });
    setCustomWordInput('');
    setGeneratedPuzzle(null);
  };

  const removeWord = (id: string) => {
    setThemeWords(themeWords.filter((w) => w.id !== id));
    const newClues = { ...clues };
    delete newClues[id];
    setClues(newClues);
    setGeneratedPuzzle(null);
  };

  const toggleSpelling = (id: string) => {
    setThemeWords(themeWords.map((w) => {
      if (w.id !== id || !w.spellingVariants || w.spellingVariants.length <= 1) return w;
      const currentIndex = w.spellingVariants.indexOf(w.activeSpelling);
      const nextIndex = (currentIndex + 1) % w.spellingVariants.length;
      return { ...w, activeSpelling: w.spellingVariants[nextIndex] };
    }));
    setGeneratedPuzzle(null);
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const puzzle = await generatePuzzle({ title: themeTitle, themeWords, targetWords: themeWords.length });
      setGeneratedPuzzle(puzzle);
    } catch (error) {
      console.error('Failed to generate puzzle:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: '#FEF7ED' }}>
      {/* Compact Header */}
      <header
        className="sticky top-0 z-50 px-6 py-2"
        style={{
          background: '#334155',
          boxShadow: '0 2px 12px rgba(51, 65, 85, 0.2)'
        }}
      >
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: '#E8634A' }}
              >
                <span className="text-sm">🕌</span>
              </div>
              <span className="font-bold text-white">Puzzle Analytics</span>
            </div>
            <div className="h-6 w-px bg-white/20" />
            <div className="flex items-center gap-1">
              {presetThemes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => { setSelectedTheme(t.id); setCustomTitle(''); }}
                  className={cn(
                    'w-7 h-7 rounded text-sm transition-all',
                    selectedTheme === t.id && !customTitle
                      ? 'bg-[#E8634A] scale-110'
                      : 'bg-white/10 hover:bg-white/20'
                  )}
                >
                  {t.icon}
                </button>
              ))}
            </div>
            <Input
              placeholder="Custom title..."
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              className="w-40 h-7 text-xs border-0 bg-white/10 text-white placeholder:text-white/40"
            />
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || themeWords.length === 0}
              size="sm"
              className="h-8 font-bold border-0"
              style={{ background: '#E8634A', color: 'white' }}
            >
              {isGenerating ? '⏳' : generatedPuzzle ? '🔄' : '✨'} Generate
            </Button>
            {generatedPuzzle && (
              <>
                <Button size="sm" className="h-8 text-xs bg-white/10 text-white border-0">📄 PDF</Button>
                <Button size="sm" className="h-8 text-xs bg-white/10 text-white border-0">🚀 Publish</Button>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-[1600px] mx-auto p-4 space-y-4">
        {/* Stats Row */}
        <div className="grid grid-cols-6 gap-3">
          <Card className="border-0" style={{ background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <CardContent className="p-3">
              <div className="text-[10px] uppercase tracking-wide font-bold" style={{ color: '#78716C' }}>Words</div>
              <div className="text-2xl font-black" style={{ color: '#334155' }}>{themeWords.length}</div>
              <div className="text-[10px]" style={{ color: '#78716C' }}>of 20 max</div>
            </CardContent>
          </Card>
          <Card className="border-0" style={{ background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <CardContent className="p-3">
              <div className="text-[10px] uppercase tracking-wide font-bold" style={{ color: '#78716C' }}>Letters</div>
              <div className="text-2xl font-black" style={{ color: '#334155' }}>{stats.totalLetters}</div>
              <div className="text-[10px]" style={{ color: '#78716C' }}>total chars</div>
            </CardContent>
          </Card>
          <Card className="border-0" style={{ background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <CardContent className="p-3">
              <div className="text-[10px] uppercase tracking-wide font-bold" style={{ color: '#78716C' }}>Avg Length</div>
              <div className="text-2xl font-black" style={{ color: '#334155' }}>{stats.avgLength}</div>
              <div className="text-[10px]" style={{ color: '#78716C' }}>letters/word</div>
            </CardContent>
          </Card>
          <Card className="border-0" style={{ background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <CardContent className="p-3">
              <div className="text-[10px] uppercase tracking-wide font-bold mb-1" style={{ color: '#78716C' }}>Length Dist.</div>
              <div className="flex items-end gap-0.5 h-6">
                {[3, 4, 5, 6, 7, 8, 9, 10].map(len => {
                  const count = stats.lengthDistribution[len] || 0;
                  const maxCount = Math.max(...Object.values(stats.lengthDistribution), 1);
                  return (
                    <div
                      key={len}
                      className="flex-1 rounded-t transition-all"
                      style={{
                        height: `${(count / maxCount) * 100}%`,
                        minHeight: count > 0 ? '4px' : '0',
                        background: count > 0 ? '#E8634A' : '#e5e5e5'
                      }}
                      title={`${len} letters: ${count}`}
                    />
                  );
                })}
              </div>
            </CardContent>
          </Card>
          <Card className="border-0" style={{ background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <CardContent className="p-3">
              <div className="text-[10px] uppercase tracking-wide font-bold mb-1" style={{ color: '#78716C' }}>Top Letters</div>
              <div className="flex gap-1">
                {stats.topLetters.map(([letter, count]) => (
                  <div
                    key={letter}
                    className="text-center px-1.5 py-0.5 rounded text-[10px] font-bold"
                    style={{ background: '#E8634A20', color: '#E8634A' }}
                  >
                    {letter}<span className="opacity-60">×{count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card className="border-0" style={{ background: generatedPuzzle ? '#E8634A' : '#334155', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <CardContent className="p-3 text-white">
              <div className="text-[10px] uppercase tracking-wide font-bold opacity-80">Status</div>
              <div className="text-lg font-black">
                {generatedPuzzle ? `${generatedPuzzle.placedWordIds.length} Placed` : 'Ready'}
              </div>
              <div className="text-[10px] opacity-80">
                {generatedPuzzle
                  ? `${generatedPuzzle.clues.across.length}→ ${generatedPuzzle.clues.down.length}↓`
                  : 'Click Generate'
                }
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content: 2 columns */}
        <div className="grid grid-cols-[1fr_400px] gap-4">
          {/* Left: Grid + Word Input */}
          <div className="space-y-3">
            {/* Word Input Bar */}
            <Card className="border-0" style={{ background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <CardContent className="p-3">
                <div className="flex gap-2 items-center">
                  <Input
                    placeholder="Search words or type custom..."
                    value={wordSearch || customWordInput}
                    onChange={(e) => {
                      setWordSearch(e.target.value);
                      setCustomWordInput(e.target.value);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (filteredWordBank.length > 0) {
                          addWord(filteredWordBank[0]);
                        } else if (customWordInput) {
                          addCustomWord();
                        }
                        setWordSearch('');
                        setCustomWordInput('');
                      }
                    }}
                    className="flex-1 h-9 text-sm border-0"
                    style={{ background: '#FEF7ED' }}
                  />
                  <Button
                    size="sm"
                    onClick={addCustomWord}
                    disabled={!customWordInput.trim()}
                    className="h-9 px-4 font-bold border-0"
                    style={{ background: '#334155', color: 'white' }}
                  >
                    + Add
                  </Button>
                </div>
                {/* Quick suggestions */}
                {wordSearch && filteredWordBank.length > 0 && (
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {filteredWordBank.slice(0, 6).map(word => (
                      <button
                        key={word.id}
                        onClick={() => { addWord(word); setWordSearch(''); }}
                        className="px-2 py-1 rounded text-xs font-medium transition-all hover:scale-105"
                        style={{ background: '#E8634A20', color: '#E8634A' }}
                      >
                        {word.word} <span className="opacity-50">({word.word.length})</span>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Grid Display */}
            <Card
              className="border-0 min-h-[400px] flex items-center justify-center"
              style={{ background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
            >
              <CardContent className="p-6 w-full">
                {isGenerating ? (
                  <div className="text-center py-12">
                    <div className="text-5xl animate-bounce mb-3">🧩</div>
                    <p className="font-bold" style={{ color: '#334155' }}>Generating puzzle...</p>
                  </div>
                ) : generatedPuzzle ? (
                  <div className="flex flex-col items-center">
                    <CrosswordGrid
                      grid={generatedPuzzle.grid}
                      clues={generatedPuzzle.clues}
                      theme="modern"
                      cellSize="md"
                      showControls={true}
                      showNumbers={true}
                      showLetters={true}
                    />
                    {generatedPuzzle.unplacedWordIds.length > 0 && (
                      <div className="mt-4 p-2 rounded-lg" style={{ background: '#FEF3C7' }}>
                        <span className="text-xs font-bold" style={{ color: '#B45309' }}>
                          ⚠️ Couldn't place: {generatedPuzzle.unplacedWordIds.map(id => {
                            const w = themeWords.find(tw => tw.id === id);
                            return w?.activeSpelling;
                          }).join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12" style={{ color: '#78716C' }}>
                    <div className="text-6xl mb-4 opacity-30">🧩</div>
                    <p className="font-bold text-lg" style={{ color: '#334155' }}>No puzzle yet</p>
                    <p className="text-sm mb-4">Add words and click Generate</p>
                    <Button
                      onClick={handleGenerate}
                      disabled={isGenerating || themeWords.length === 0}
                      className="font-bold border-0 px-6"
                      style={{ background: '#E8634A', color: 'white' }}
                    >
                      ✨ Generate Puzzle
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Clue Editor (collapsible) */}
            {generatedPuzzle && (
              <Card className="border-0" style={{ background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                <button
                  onClick={() => setShowClueEditor(!showClueEditor)}
                  className="w-full p-3 flex items-center justify-between text-left"
                >
                  <span className="font-bold text-sm" style={{ color: '#334155' }}>
                    📝 Clue Editor ({generatedPuzzle.clues.across.length + generatedPuzzle.clues.down.length} clues)
                  </span>
                  <span style={{ color: '#78716C' }}>{showClueEditor ? '▲' : '▼'}</span>
                </button>
                {showClueEditor && (
                  <CardContent className="px-3 pb-3 pt-0">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-[10px] uppercase font-bold mb-2" style={{ color: '#E8634A' }}>Across</div>
                        {generatedPuzzle.clues.across.map(clue => {
                          const word = themeWords.find(w => w.activeSpelling.toUpperCase() === clue.answer);
                          const isEditing = editingClueId === `a-${clue.number}`;
                          return (
                            <div key={`a-${clue.number}`} className="mb-2">
                              <div className="flex items-center gap-2">
                                <Badge className="border-0 text-[10px]" style={{ background: '#E8634A', color: 'white' }}>
                                  {clue.number}
                                </Badge>
                                <span className="text-xs font-bold" style={{ color: '#334155' }}>{clue.answer}</span>
                              </div>
                              {isEditing && word ? (
                                <Textarea
                                  autoFocus
                                  value={clues[word.id] || ''}
                                  onChange={(e) => setClues({ ...clues, [word.id]: e.target.value })}
                                  onBlur={() => setEditingClueId(null)}
                                  className="mt-1 text-xs min-h-[50px] border"
                                  style={{ borderColor: '#E8634A' }}
                                />
                              ) : (
                                <p
                                  onClick={() => setEditingClueId(`a-${clue.number}`)}
                                  className="text-xs mt-1 cursor-pointer hover:bg-gray-50 p-1 rounded"
                                  style={{ color: '#78716C' }}
                                >
                                  {word ? clues[word.id] || word.clue || 'Click to add clue...' : clue.clue}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <div>
                        <div className="text-[10px] uppercase font-bold mb-2" style={{ color: '#334155' }}>Down</div>
                        {generatedPuzzle.clues.down.map(clue => {
                          const word = themeWords.find(w => w.activeSpelling.toUpperCase() === clue.answer);
                          const isEditing = editingClueId === `d-${clue.number}`;
                          return (
                            <div key={`d-${clue.number}`} className="mb-2">
                              <div className="flex items-center gap-2">
                                <Badge className="border-0 text-[10px]" style={{ background: '#334155', color: 'white' }}>
                                  {clue.number}
                                </Badge>
                                <span className="text-xs font-bold" style={{ color: '#334155' }}>{clue.answer}</span>
                              </div>
                              {isEditing && word ? (
                                <Textarea
                                  autoFocus
                                  value={clues[word.id] || ''}
                                  onChange={(e) => setClues({ ...clues, [word.id]: e.target.value })}
                                  onBlur={() => setEditingClueId(null)}
                                  className="mt-1 text-xs min-h-[50px] border"
                                  style={{ borderColor: '#334155' }}
                                />
                              ) : (
                                <p
                                  onClick={() => setEditingClueId(`d-${clue.number}`)}
                                  className="text-xs mt-1 cursor-pointer hover:bg-gray-50 p-1 rounded"
                                  style={{ color: '#78716C' }}
                                >
                                  {word ? clues[word.id] || word.clue || 'Click to add clue...' : clue.clue}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            )}
          </div>

          {/* Right: Word List */}
          <div className="space-y-3">
            {/* Selected Words */}
            <Card className="border-0" style={{ background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <CardHeader className="p-3 pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold" style={{ color: '#334155' }}>
                    {themeTitle}
                  </CardTitle>
                  <Badge className="border-0 text-xs" style={{ background: '#E8634A', color: 'white' }}>
                    {themeWords.length}/20
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <div className="space-y-1 max-h-[200px] overflow-y-auto">
                  {themeWords.map((word, i) => (
                    <div
                      key={word.id}
                      className="flex items-center gap-2 p-2 rounded-lg group transition-all"
                      style={{ background: '#FEF7ED' }}
                    >
                      <span className="text-[10px] font-bold w-4" style={{ color: '#78716C' }}>{i + 1}</span>
                      <span className="font-bold flex-1 text-sm" style={{ color: '#334155' }}>
                        {word.activeSpelling}
                      </span>
                      <Badge className="text-[10px] border-0" style={{ background: '#33415520', color: '#334155' }}>
                        {word.activeSpelling.length}
                      </Badge>
                      {word.spellingVariants && word.spellingVariants.length > 1 && (
                        <button
                          onClick={() => toggleSpelling(word.id)}
                          className="text-xs opacity-50 hover:opacity-100"
                          style={{ color: '#E8634A' }}
                        >
                          ↔
                        </button>
                      )}
                      <button
                        onClick={() => removeWord(word.id)}
                        className="text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ color: '#EF4444' }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {themeWords.length === 0 && (
                    <p className="text-center py-4 text-xs" style={{ color: '#78716C' }}>
                      No words added yet
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Word Bank */}
            <Card className="border-0 flex-1" style={{ background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <CardHeader className="p-3 pb-2">
                <CardTitle className="text-sm font-bold" style={{ color: '#334155' }}>
                  Word Bank ({filteredWordBank.length} available)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <div className="space-y-1 max-h-[350px] overflow-y-auto">
                  {filteredWordBank.slice(0, 30).map((word) => (
                    <button
                      key={word.id}
                      onClick={() => addWord(word)}
                      className="w-full flex items-center gap-2 p-2 rounded-lg text-left transition-all hover:scale-[1.01]"
                      style={{ background: '#FEF7ED' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#E8634A15'}
                      onMouseLeave={(e) => e.currentTarget.style.background = '#FEF7ED'}
                    >
                      <span className="font-bold text-sm flex-1" style={{ color: '#334155' }}>
                        {word.word}
                      </span>
                      {word.arabicScript && (
                        <span className="text-[10px]" style={{ color: '#78716C' }}>{word.arabicScript}</span>
                      )}
                      <Badge className="text-[10px] border-0" style={{ background: '#E8634A20', color: '#E8634A' }}>
                        {word.word.length}
                      </Badge>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
