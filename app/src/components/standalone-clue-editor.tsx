'use client';

import { useState, useCallback } from 'react';
import { useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Difficulty = 'easy' | 'medium' | 'hard';

interface ClueResult {
  word: string;
  easy: string[];
  medium: string[];
  hard: string[];
  error?: string;
}

/**
 * Parse words from input text.
 * Accepts words separated by newlines or commas.
 * Auto-uppercases and validates (2-10 letters, alphabetic only).
 */
function parseWords(text: string): string[] {
  return text
    .split(/[\n,]+/)
    .map(w => w.trim().toUpperCase())
    .filter(w => w.length >= 2 && w.length <= 10 && /^[A-Z]+$/.test(w))
    .filter((w, i, arr) => arr.indexOf(w) === i); // dedupe
}

export function StandaloneClueEditor() {
  const [inputText, setInputText] = useState('');
  const [clueResults, setClueResults] = useState<Record<string, ClueResult>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [selectedDifficulties, setSelectedDifficulties] = useState<Record<string, Difficulty>>({});

  const generateClues = useAction(api.clueGeneration.generateClues);

  const parsedWords = parseWords(inputText);

  const handleGenerate = useCallback(async () => {
    if (parsedWords.length === 0) return;

    setIsGenerating(true);
    setProgress({ current: 0, total: parsedWords.length });

    // Generate clues sequentially to avoid API rate limits
    for (let i = 0; i < parsedWords.length; i++) {
      const word = parsedWords[i];
      setProgress({ current: i + 1, total: parsedWords.length });

      try {
        const result = await generateClues({ word });
        setClueResults(prev => ({
          ...prev,
          [word]: {
            word,
            easy: Array.isArray(result.easy) ? result.easy : [],
            medium: Array.isArray(result.medium) ? result.medium : [],
            hard: Array.isArray(result.hard) ? result.hard : [],
            error: result.error,
          },
        }));
        // Initialize difficulty selection
        setSelectedDifficulties(prev => ({
          ...prev,
          [word]: prev[word] || 'easy',
        }));
      } catch (error) {
        setClueResults(prev => ({
          ...prev,
          [word]: {
            word,
            easy: [],
            medium: [],
            hard: [],
            error: String(error),
          },
        }));
      }
    }

    setIsGenerating(false);
  }, [parsedWords, generateClues]);

  const handleCopyClue = useCallback((clue: string) => {
    navigator.clipboard.writeText(clue);
  }, []);

  const handleCopyAllForWord = useCallback((word: string) => {
    const result = clueResults[word];
    if (!result) return;

    const difficulty = selectedDifficulties[word] || 'easy';
    const clues = result[difficulty];
    const text = clues.map((c, i) => `${i + 1}. ${c}`).join('\n');
    navigator.clipboard.writeText(`${word} (${difficulty}):\n${text}`);
  }, [clueResults, selectedDifficulties]);

  const wordsWithResults = Object.keys(clueResults);

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <Card className="bg-[#001a2c]/60 border-[#4A90C2]/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-base font-medium">
            Enter words (one per line or comma-separated)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="MUSA&#10;QURAN, HAJJ, SALAH&#10;IBRAHIM"
            className="min-h-[120px] bg-[#002a42]/80 border-[#4A90C2]/30 text-white placeholder:text-[#6ba8d4] font-mono"
          />
          <div className="flex items-center justify-between">
            <span className="text-[#8fc1e3] text-sm">
              {parsedWords.length} word{parsedWords.length !== 1 ? 's' : ''} parsed
            </span>
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || parsedWords.length === 0}
              className={cn(
                "px-6 py-2 transition-all",
                isGenerating
                  ? "bg-violet-600/30 text-violet-300"
                  : "bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:from-violet-500 hover:to-purple-500"
              )}
            >
              {isGenerating ? (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Generating {progress.current}/{progress.total}...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                  Generate Clues ({parsedWords.length} word{parsedWords.length !== 1 ? 's' : ''})
                </span>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results Section */}
      {wordsWithResults.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-[#D4AF37] font-semibold uppercase tracking-wider text-sm flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Generated Clues
          </h2>

          {wordsWithResults.map(word => {
            const result = clueResults[word];
            const currentDifficulty = selectedDifficulties[word] || 'easy';
            const currentClues = result[currentDifficulty];

            return (
              <Card key={word} className="bg-[#001a2c]/60 border-[#4A90C2]/30">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-white text-lg font-bold tracking-wider font-mono">
                      {word}
                    </CardTitle>
                    <span className="text-[#6ba8d4] text-xs">
                      ({word.length} letters)
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Difficulty tabs */}
                  <div className="flex items-center gap-2">
                    {(['easy', 'medium', 'hard'] as Difficulty[]).map((diff) => {
                      const hasClues = result[diff] && result[diff].length > 0;
                      const isActive = currentDifficulty === diff;
                      return (
                        <button
                          key={diff}
                          onClick={() => setSelectedDifficulties(prev => ({ ...prev, [word]: diff }))}
                          className={cn(
                            'px-3 py-1 rounded text-xs uppercase tracking-wider transition-all',
                            isActive
                              ? diff === 'easy'
                                ? 'bg-green-500/30 text-green-300 border border-green-500/40'
                                : diff === 'medium'
                                ? 'bg-amber-500/30 text-amber-300 border border-amber-500/40'
                                : 'bg-red-500/30 text-red-300 border border-red-500/40'
                              : hasClues
                              ? 'bg-[#001a2c]/60 text-[#8fc1e3] hover:text-white border border-[#4A90C2]/20'
                              : 'bg-[#001a2c]/40 text-[#4A90C2] hover:text-[#6ba8d4] border border-transparent'
                          )}
                        >
                          {diff}
                          {hasClues && !isActive && <span className="ml-1 text-[8px]">({result[diff].length})</span>}
                        </button>
                      );
                    })}
                  </div>

                  {/* Error message */}
                  {result.error && (
                    <div className="text-red-400 text-sm bg-red-500/10 px-3 py-2 rounded border border-red-500/20">
                      Error: {result.error}
                    </div>
                  )}

                  {/* Clues list */}
                  {currentClues && currentClues.length > 0 ? (
                    <div className="space-y-2">
                      {currentClues.map((clue, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-3 group"
                        >
                          <span className="text-[#6ba8d4] text-sm font-mono w-4 shrink-0">
                            {idx + 1}.
                          </span>
                          <span className="text-[#c0d8e8] text-sm flex-1">
                            {clue}
                          </span>
                          <button
                            onClick={() => handleCopyClue(clue)}
                            className="text-[#6ba8d4] hover:text-[#D4AF37] transition-colors opacity-0 group-hover:opacity-100 p-1"
                            title="Copy clue"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : !result.error ? (
                    <p className="text-[#6ba8d4] text-sm italic">
                      No {currentDifficulty} clues generated
                    </p>
                  ) : null}

                  {/* Copy All button */}
                  {currentClues && currentClues.length > 0 && (
                    <div className="pt-2 border-t border-[#4A90C2]/20">
                      <button
                        onClick={() => handleCopyAllForWord(word)}
                        className="text-[#8fc1e3] hover:text-[#D4AF37] text-xs transition-colors flex items-center gap-1"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Copy All for {word}
                      </button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
