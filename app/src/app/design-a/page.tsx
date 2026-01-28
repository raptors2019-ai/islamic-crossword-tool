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

// Design A: "Neon Terminal" - Dark theme with luminous, high-contrast text
// Aesthetic: Cyberpunk command center with glowing holographic elements

const presetThemes = [
  { id: 'surprise', name: 'Surprise Me!', icon: '🎲' },
  { id: 'ramadan', name: 'Ramadan', icon: '🌙' },
  { id: 'prophets', name: 'Prophets', icon: '📖' },
  { id: 'names', name: '99 Names', icon: '✨' },
  { id: 'pillars', name: '5 Pillars', icon: '🕌' },
];

export default function DesignA() {
  const [selectedTheme, setSelectedTheme] = useState<string>('surprise');
  const [customTitle, setCustomTitle] = useState('');
  const [themeWords, setThemeWords] = useState<ThemeWord[]>([]);
  const [clues, setClues] = useState<Record<string, string>>({});
  const [wordSearch, setWordSearch] = useState('');
  const [customWordInput, setCustomWordInput] = useState('');
  const [generatedPuzzle, setGeneratedPuzzle] = useState<GeneratedPuzzle | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [expandedClue, setExpandedClue] = useState<string | null>(null);
  const [showExport, setShowExport] = useState(false);

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
    <div
      className="min-h-screen"
      style={{
        background: 'linear-gradient(180deg, #030810 0%, #0a1628 50%, #061018 100%)',
        color: '#e8f4f8'
      }}
    >
      {/* Subtle grid pattern overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0, 200, 255, 0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 200, 255, 0.5) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }}
      />

      {/* Header */}
      <header
        className="sticky top-0 z-50 px-4 py-3 border-b"
        style={{
          background: 'linear-gradient(180deg, rgba(10, 25, 47, 0.98) 0%, rgba(8, 20, 40, 0.95) 100%)',
          borderColor: 'rgba(0, 200, 255, 0.2)',
          boxShadow: '0 4px 30px rgba(0, 0, 0, 0.5), 0 1px 0 rgba(0, 200, 255, 0.1)'
        }}
      >
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🕌</span>
            <span
              className="font-black text-xl tracking-tight"
              style={{
                color: '#ffd700',
                textShadow: '0 0 20px rgba(255, 215, 0, 0.5), 0 0 40px rgba(255, 215, 0, 0.2)'
              }}
            >
              CrosswordForge
            </span>
          </div>
          <div className="flex items-center gap-2">
            {presetThemes.map((t) => (
              <button
                key={t.id}
                onClick={() => { setSelectedTheme(t.id); setCustomTitle(''); }}
                className={cn(
                  'w-9 h-9 rounded-lg text-lg transition-all duration-200',
                  selectedTheme === t.id && !customTitle
                    ? 'scale-110'
                    : 'opacity-60 hover:opacity-100'
                )}
                style={selectedTheme === t.id && !customTitle ? {
                  background: 'linear-gradient(135deg, #00c8ff 0%, #0080ff 100%)',
                  boxShadow: '0 0 20px rgba(0, 200, 255, 0.5), inset 0 1px 0 rgba(255,255,255,0.2)'
                } : {
                  background: 'rgba(0, 100, 150, 0.3)',
                }}
              >
                {t.icon}
              </button>
            ))}
            <Input
              placeholder="Custom title..."
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              className="w-36 h-9 text-sm font-medium border-0"
              style={{
                background: 'rgba(0, 50, 80, 0.5)',
                color: '#a8e6ff',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3), 0 0 0 1px rgba(0, 200, 255, 0.2)'
              }}
            />
          </div>
        </div>
      </header>

      {/* Main 3-Column Layout */}
      <div className="max-w-7xl mx-auto p-4 grid grid-cols-[300px_1fr_300px] gap-5 h-[calc(100vh-64px)]">
        {/* Left: Word Bank */}
        <div className="flex flex-col gap-4 overflow-hidden">
          <Card
            className="border-0 flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, rgba(10, 40, 70, 0.8) 0%, rgba(5, 25, 45, 0.9) 100%)',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(0, 200, 255, 0.1)'
            }}
          >
            <CardContent className="p-3">
              <Input
                placeholder="Search or add word..."
                value={wordSearch || customWordInput}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val.includes(' ')) {
                    setCustomWordInput(val);
                    setWordSearch('');
                  } else {
                    setWordSearch(val);
                    setCustomWordInput('');
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (customWordInput || wordSearch)) {
                    if (customWordInput) {
                      addCustomWord();
                    } else if (filteredWordBank.length > 0) {
                      addWord(filteredWordBank[0]);
                      setWordSearch('');
                    }
                  }
                }}
                className="text-sm h-10 border-0 font-medium"
                style={{
                  background: 'rgba(0, 30, 50, 0.8)',
                  color: '#ffffff',
                  boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.4), 0 0 0 1px rgba(0, 200, 255, 0.15)'
                }}
              />
            </CardContent>
          </Card>

          <Card
            className="border-0 flex-1 overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(10, 40, 70, 0.8) 0%, rgba(5, 25, 45, 0.9) 100%)',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(0, 200, 255, 0.1)'
            }}
          >
            <CardHeader className="p-3 pb-2">
              <CardTitle
                className="text-xs font-black uppercase tracking-widest"
                style={{ color: '#00d4ff', textShadow: '0 0 10px rgba(0, 212, 255, 0.5)' }}
              >
                Word Bank
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 overflow-y-auto h-full">
              <div className="space-y-2">
                {filteredWordBank.slice(0, 20).map((word) => (
                  <button
                    key={word.id}
                    onClick={() => addWord(word)}
                    className="w-full p-3 rounded-lg text-left transition-all duration-200 group"
                    style={{
                      background: 'rgba(0, 40, 70, 0.5)',
                      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(0, 100, 150, 0.5)';
                      e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 200, 255, 0.2), inset 0 1px 0 rgba(255,255,255,0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(0, 40, 70, 0.5)';
                      e.currentTarget.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.05)';
                    }}
                  >
                    <div className="flex justify-between items-center">
                      <span
                        className="font-bold text-sm"
                        style={{ color: '#ffffff', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
                      >
                        {word.word}
                      </span>
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded"
                        style={{
                          background: 'rgba(0, 200, 255, 0.2)',
                          color: '#00e5ff',
                          textShadow: '0 0 8px rgba(0, 229, 255, 0.5)'
                        }}
                      >
                        {word.word.length}
                      </span>
                    </div>
                    <div
                      className="text-xs mt-1 truncate"
                      style={{ color: 'rgba(168, 218, 255, 0.8)' }}
                    >
                      {word.clue}
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Center: Grid + Actions */}
        <div className="flex flex-col gap-4">
          {/* Selected Words */}
          <Card
            className="border-0"
            style={{
              background: 'linear-gradient(135deg, rgba(10, 40, 70, 0.8) 0%, rgba(5, 25, 45, 0.9) 100%)',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(0, 200, 255, 0.1)'
            }}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span
                  className="text-sm font-black"
                  style={{ color: '#ffd700', textShadow: '0 0 15px rgba(255, 215, 0, 0.5)' }}
                >
                  {themeTitle}
                </span>
                <Badge
                  className="border-0 font-bold"
                  style={{
                    background: 'rgba(0, 200, 255, 0.2)',
                    color: '#00e5ff',
                    textShadow: '0 0 8px rgba(0, 229, 255, 0.5)'
                  }}
                >
                  {themeWords.length}/20
                </Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                {themeWords.map((word) => (
                  <div
                    key={word.id}
                    className="px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 group transition-all duration-200"
                    style={{
                      background: 'linear-gradient(135deg, rgba(0, 150, 200, 0.4) 0%, rgba(0, 100, 150, 0.4) 100%)',
                      boxShadow: '0 0 15px rgba(0, 200, 255, 0.2), inset 0 1px 0 rgba(255,255,255,0.1)',
                      border: '1px solid rgba(0, 200, 255, 0.3)'
                    }}
                  >
                    <span
                      className="font-bold"
                      style={{ color: '#ffffff', textShadow: '0 0 8px rgba(255, 255, 255, 0.3)' }}
                    >
                      {word.activeSpelling}
                    </span>
                    {word.spellingVariants && word.spellingVariants.length > 1 && (
                      <button
                        onClick={() => toggleSpelling(word.id)}
                        className="transition-colors"
                        style={{ color: '#00e5ff' }}
                        onMouseEnter={(e) => e.currentTarget.style.color = '#ffd700'}
                        onMouseLeave={(e) => e.currentTarget.style.color = '#00e5ff'}
                      >
                        ↔
                      </button>
                    )}
                    <button
                      onClick={() => removeWord(word.id)}
                      className="opacity-0 group-hover:opacity-100 transition-all"
                      style={{ color: '#ff6b6b' }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Puzzle Grid */}
          <Card
            className="border-0 flex-1 flex flex-col"
            style={{
              background: 'linear-gradient(135deg, rgba(10, 40, 70, 0.8) 0%, rgba(5, 25, 45, 0.9) 100%)',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(0, 200, 255, 0.1)'
            }}
          >
            <CardContent className="p-6 flex-1 flex flex-col items-center justify-center">
              {isGenerating ? (
                <div className="text-center">
                  <div className="text-5xl animate-pulse mb-3">🧩</div>
                  <p
                    className="text-sm font-bold"
                    style={{ color: '#00e5ff', textShadow: '0 0 10px rgba(0, 229, 255, 0.5)' }}
                  >
                    Generating...
                  </p>
                </div>
              ) : generatedPuzzle ? (
                <>
                  <CrosswordGrid
                    grid={generatedPuzzle.grid}
                    clues={generatedPuzzle.clues}
                    theme="neon"
                    cellSize="md"
                    showControls={true}
                    showNumbers={true}
                    showLetters={true}
                  />
                  {generatedPuzzle.unplacedWordIds.length > 0 && (
                    <div className="mt-4 text-center">
                      <span
                        className="text-xs font-bold"
                        style={{ color: '#ffd700', textShadow: '0 0 8px rgba(255, 215, 0, 0.5)' }}
                      >
                        Unplaced:{' '}
                      </span>
                      {generatedPuzzle.unplacedWordIds.map((id) => {
                        const w = themeWords.find((tw) => tw.id === id);
                        return w ? (
                          <Badge
                            key={id}
                            className="border-0 mx-1 font-bold"
                            style={{
                              background: 'rgba(255, 215, 0, 0.2)',
                              color: '#ffd700',
                              textShadow: '0 0 6px rgba(255, 215, 0, 0.5)'
                            }}
                          >
                            {w.activeSpelling}
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center" style={{ color: 'rgba(168, 218, 255, 0.5)' }}>
                  <div className="text-5xl mb-3 opacity-50">🧩</div>
                  <p className="text-sm font-medium">Click Generate to create puzzle</p>
                </div>
              )}
            </CardContent>
            <div
              className="p-4 flex gap-3 justify-center"
              style={{ borderTop: '1px solid rgba(0, 200, 255, 0.15)' }}
            >
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || themeWords.length === 0}
                className="font-black text-sm px-6 border-0 transition-all duration-200"
                style={{
                  background: 'linear-gradient(135deg, #00c8ff 0%, #0080ff 100%)',
                  color: '#000',
                  boxShadow: '0 0 25px rgba(0, 200, 255, 0.4), inset 0 1px 0 rgba(255,255,255,0.3)'
                }}
              >
                {generatedPuzzle ? '🔄 Regenerate' : '✨ Generate'}
              </Button>
              {generatedPuzzle && (
                <Button
                  onClick={() => setShowExport(!showExport)}
                  className="font-bold text-sm px-5 border-0 transition-all duration-200"
                  style={{
                    background: 'rgba(0, 100, 150, 0.5)',
                    color: '#a8e6ff',
                    boxShadow: '0 0 15px rgba(0, 200, 255, 0.15), inset 0 1px 0 rgba(255,255,255,0.1)'
                  }}
                >
                  📤 Export
                </Button>
              )}
            </div>
          </Card>

          {/* Export Panel */}
          {showExport && generatedPuzzle && (
            <Card
              className="border-0"
              style={{
                background: 'linear-gradient(135deg, rgba(10, 40, 70, 0.9) 0%, rgba(5, 25, 45, 0.95) 100%)',
                boxShadow: '0 0 30px rgba(0, 200, 255, 0.2), inset 0 1px 0 rgba(0, 200, 255, 0.2)',
                border: '1px solid rgba(0, 200, 255, 0.3)'
              }}
            >
              <CardContent className="p-4 flex gap-3 flex-wrap justify-center">
                {['📄 PDF', '🌐 HTML', '📋 JSON'].map((label) => (
                  <Button
                    key={label}
                    size="sm"
                    className="font-bold text-xs border-0"
                    style={{
                      background: 'rgba(0, 80, 120, 0.5)',
                      color: '#a8e6ff'
                    }}
                  >
                    {label}
                  </Button>
                ))}
                <Button
                  size="sm"
                  className="font-black text-xs border-0"
                  style={{
                    background: 'linear-gradient(135deg, #ffd700 0%, #ffaa00 100%)',
                    color: '#000',
                    boxShadow: '0 0 20px rgba(255, 215, 0, 0.4)'
                  }}
                >
                  🚀 Publish
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Clues */}
        <div className="flex flex-col gap-4 overflow-hidden">
          <Card
            className="border-0 flex-1 overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(10, 40, 70, 0.8) 0%, rgba(5, 25, 45, 0.9) 100%)',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(0, 200, 255, 0.1)'
            }}
          >
            <CardHeader className="p-3 pb-2">
              <CardTitle
                className="text-xs font-black uppercase tracking-widest"
                style={{ color: '#ffd700', textShadow: '0 0 10px rgba(255, 215, 0, 0.5)' }}
              >
                Clues
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 overflow-y-auto h-full">
              {generatedPuzzle ? (
                <div className="space-y-4">
                  {generatedPuzzle.clues.across.length > 0 && (
                    <div>
                      <div
                        className="text-[10px] font-black uppercase tracking-widest mb-2"
                        style={{ color: '#00d4ff', textShadow: '0 0 8px rgba(0, 212, 255, 0.5)' }}
                      >
                        Across
                      </div>
                      {generatedPuzzle.clues.across.map((clue) => {
                        const word = themeWords.find((w) => w.activeSpelling.toUpperCase() === clue.answer);
                        const isExpanded = expandedClue === `a-${clue.number}`;
                        return (
                          <div
                            key={`a-${clue.number}`}
                            onClick={() => setExpandedClue(isExpanded ? null : `a-${clue.number}`)}
                            className="p-2.5 rounded-lg mb-2 cursor-pointer transition-all duration-200"
                            style={{
                              background: isExpanded ? 'rgba(0, 100, 150, 0.4)' : 'rgba(0, 40, 70, 0.5)',
                              boxShadow: isExpanded ? '0 0 15px rgba(0, 200, 255, 0.2)' : 'none'
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <Badge
                                className="border-0 font-black text-[10px] px-2"
                                style={{
                                  background: 'rgba(0, 200, 255, 0.3)',
                                  color: '#00e5ff',
                                  textShadow: '0 0 6px rgba(0, 229, 255, 0.5)'
                                }}
                              >
                                {clue.number}
                              </Badge>
                              <span
                                className="text-xs truncate flex-1"
                                style={{ color: 'rgba(255, 255, 255, 0.9)' }}
                              >
                                {word ? clues[word.id] || word.clue || clue.clue : clue.clue}
                              </span>
                            </div>
                            {isExpanded && word && (
                              <Textarea
                                value={clues[word.id] || ''}
                                onChange={(e) => setClues({ ...clues, [word.id]: e.target.value })}
                                onClick={(e) => e.stopPropagation()}
                                className="mt-2 text-xs min-h-[60px] border-0"
                                style={{
                                  background: 'rgba(0, 30, 50, 0.8)',
                                  color: '#ffffff',
                                  boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.4)'
                                }}
                                placeholder="Edit clue..."
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {generatedPuzzle.clues.down.length > 0 && (
                    <div>
                      <div
                        className="text-[10px] font-black uppercase tracking-widest mb-2"
                        style={{ color: '#ffd700', textShadow: '0 0 8px rgba(255, 215, 0, 0.5)' }}
                      >
                        Down
                      </div>
                      {generatedPuzzle.clues.down.map((clue) => {
                        const word = themeWords.find((w) => w.activeSpelling.toUpperCase() === clue.answer);
                        const isExpanded = expandedClue === `d-${clue.number}`;
                        return (
                          <div
                            key={`d-${clue.number}`}
                            onClick={() => setExpandedClue(isExpanded ? null : `d-${clue.number}`)}
                            className="p-2.5 rounded-lg mb-2 cursor-pointer transition-all duration-200"
                            style={{
                              background: isExpanded ? 'rgba(0, 100, 150, 0.4)' : 'rgba(0, 40, 70, 0.5)',
                              boxShadow: isExpanded ? '0 0 15px rgba(0, 200, 255, 0.2)' : 'none'
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <Badge
                                className="border-0 font-black text-[10px] px-2"
                                style={{
                                  background: 'rgba(255, 215, 0, 0.3)',
                                  color: '#ffd700',
                                  textShadow: '0 0 6px rgba(255, 215, 0, 0.5)'
                                }}
                              >
                                {clue.number}
                              </Badge>
                              <span
                                className="text-xs truncate flex-1"
                                style={{ color: 'rgba(255, 255, 255, 0.9)' }}
                              >
                                {word ? clues[word.id] || word.clue || clue.clue : clue.clue}
                              </span>
                            </div>
                            {isExpanded && word && (
                              <Textarea
                                value={clues[word.id] || ''}
                                onChange={(e) => setClues({ ...clues, [word.id]: e.target.value })}
                                onClick={(e) => e.stopPropagation()}
                                className="mt-2 text-xs min-h-[60px] border-0"
                                style={{
                                  background: 'rgba(0, 30, 50, 0.8)',
                                  color: '#ffffff',
                                  boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.4)'
                                }}
                                placeholder="Edit clue..."
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8" style={{ color: 'rgba(168, 218, 255, 0.5)' }}>
                  <p className="text-xs font-medium">Generate puzzle to see clues</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stats Card */}
          {generatedPuzzle && (
            <Card
              className="border-0"
              style={{
                background: 'linear-gradient(135deg, rgba(0, 150, 200, 0.4) 0%, rgba(0, 80, 150, 0.4) 100%)',
                boxShadow: '0 0 30px rgba(0, 200, 255, 0.2), inset 0 1px 0 rgba(255,255,255,0.1)',
                border: '1px solid rgba(0, 200, 255, 0.3)'
              }}
            >
              <CardContent className="p-4 text-center">
                <div
                  className="text-lg font-black"
                  style={{ color: '#ffffff', textShadow: '0 0 15px rgba(255, 255, 255, 0.3)' }}
                >
                  {generatedPuzzle.placedWordIds.length}/{themeWords.length} words placed
                </div>
                <div
                  className="text-xs font-medium mt-1"
                  style={{ color: 'rgba(168, 230, 255, 0.8)' }}
                >
                  {generatedPuzzle.clues.across.length} across • {generatedPuzzle.clues.down.length} down
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
