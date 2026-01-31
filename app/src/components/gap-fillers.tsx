'use client';

import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { FillerSuggestion, ThemeWord, GeneratedPuzzle } from '@/lib/types';
import { sampleWords } from '@/lib/sample-data';
import { checkWordFit, FitQuality } from '@/lib/fit-checker';

interface GapFillersProps {
  suggestions: FillerSuggestion[];
  themeWords: ThemeWord[];
  puzzle: GeneratedPuzzle | null;
  onSwapWord: (originalWordId: string, newWord: string, newClue: string) => void;
  onRemoveWord: (wordId: string) => void;
  onAddWord: (word: string, clue: string) => void;
  className?: string;
}

interface ScoredSuggestion {
  word: string;
  clue: string;
  length: number;
  fitQuality: FitQuality;
  isIslamic: boolean;
}

function getReasonLabel(reason: FillerSuggestion['reason']): string {
  switch (reason) {
    case 'too_long':
      return 'Too long for 5x5 grid';
    case 'conflicts':
      return 'Conflicts with placed words';
    case 'no_fit':
    default:
      return 'Could not find placement';
  }
}

export function GapFillers({
  suggestions,
  themeWords,
  puzzle,
  onSwapWord,
  onRemoveWord,
  onAddWord,
  className,
}: GapFillersProps) {
  // Get words that could fill empty grid cells
  const cellFillers = useMemo(() => {
    if (!puzzle) return [];

    const usedWords = new Set(themeWords.map((w) => w.activeSpelling.toUpperCase()));
    const placedWordStrings = themeWords.map((w) => w.activeSpelling.toUpperCase());

    // Get Islamic-tagged words from sample data that are not already used
    const islamicWords = sampleWords.filter(
      (w) => w.word.length <= 5 && w.word.length >= 2 && !usedWords.has(w.word.toUpperCase())
    );

    // Score each word based on fit
    const scored: ScoredSuggestion[] = islamicWords.map((w) => {
      const fitResult = checkWordFit(w.word, puzzle, placedWordStrings);
      return {
        word: w.word,
        clue: w.clue,
        length: w.word.length,
        fitQuality: fitResult.quality,
        isIslamic: ['prophets', 'names-of-allah', 'quran', 'companions'].includes(w.category || ''),
      };
    });

    // Filter to only words that can fit, sorted by quality
    const canFit = scored.filter(
      (s) => s.fitQuality !== 'cannot_fit' && s.fitQuality !== 'unlikely'
    );

    // Sort: perfect first, then good, then possible
    const qualityOrder: Record<FitQuality, number> = {
      perfect: 0,
      good: 1,
      possible: 2,
      unlikely: 3,
      cannot_fit: 4,
    };

    return canFit.sort((a, b) => {
      // Islamic words first within same quality
      if (qualityOrder[a.fitQuality] !== qualityOrder[b.fitQuality]) {
        return qualityOrder[a.fitQuality] - qualityOrder[b.fitQuality];
      }
      if (a.isIslamic !== b.isIslamic) {
        return a.isIslamic ? -1 : 1;
      }
      return 0;
    });
  }, [puzzle, themeWords]);

  // Group cell fillers by length
  const fillersByLength = useMemo(() => {
    const groups: Record<number, ScoredSuggestion[]> = {};
    for (const filler of cellFillers.slice(0, 30)) {
      if (!groups[filler.length]) {
        groups[filler.length] = [];
      }
      groups[filler.length].push(filler);
    }
    return groups;
  }, [cellFillers]);

  const hasUnplacedWords = suggestions.length > 0;
  const hasCellFillers = cellFillers.length > 0;

  if (!hasUnplacedWords && !hasCellFillers && !puzzle) {
    // Empty state - no puzzle yet
    return (
      <Card className={cn('bg-[#004d77]/40 backdrop-blur-sm border-[#4A90C2]/20 overflow-hidden border-t-2 border-t-[#D4AF37]', className)}>
        <CardContent className="p-5">
          <h3 className="text-[#D4AF37] text-lg mb-4 font-serif font-semibold tracking-wide">
            Fill Gaps
          </h3>
          <div className="text-center py-8">
            <div className="text-3xl mb-3">🧩</div>
            <p className="text-[#8fc1e3] text-sm">
              Generate a puzzle to see gap-filling suggestions
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('bg-[#004d77]/40 backdrop-blur-sm border-[#4A90C2]/20 overflow-hidden border-t-2 border-t-[#D4AF37]', className)}>
      <CardContent className="p-5">
        <h3 className="text-[#D4AF37] text-lg mb-4 font-serif font-semibold tracking-wide">
          Fill Gaps
        </h3>

        {/* Unplaced word suggestions */}
        {hasUnplacedWords && (
          <div className="space-y-4 mb-6">
            {suggestions.map((suggestion) => {
              const themeWord = themeWords.find((w) => w.id === suggestion.wordId);
              const hasAlternatives = suggestion.suggestions.length > 0;
              const hasVariants = suggestion.variants && suggestion.variants.length > 0;

              return (
                <div
                  key={suggestion.wordId}
                  className="bg-[#001a2c]/60 rounded-lg p-3 border border-amber-500/30"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-amber-400">⚠️</span>
                      <span className="text-white font-semibold text-sm">{suggestion.originalWord}</span>
                      <span className="text-[#6ba8d4] text-xs">
                        {getReasonLabel(suggestion.reason)}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemoveWord(suggestion.wordId)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-6 px-2 text-xs"
                    >
                      Remove
                    </Button>
                  </div>

                  {hasAlternatives && (
                    <div className="mb-2">
                      <span className="text-[#8fc1e3] text-xs">Try:</span>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {suggestion.suggestions.slice(0, 4).map((alt, i) => (
                          <button
                            key={`${alt.word}-${i}`}
                            onClick={() => onSwapWord(suggestion.wordId, alt.word, alt.clue)}
                            className="px-2 py-1 rounded text-xs font-medium bg-[#4A90C2]/20 text-white hover:bg-[#4A90C2]/40 border border-[#4A90C2]/30 transition-colors"
                            title={alt.clue}
                          >
                            {alt.word}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {hasVariants && (
                    <div>
                      <span className="text-[#8fc1e3] text-xs">Shorter spelling:</span>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {suggestion.variants!.map((variant, i) => (
                          <button
                            key={`${variant.word}-${i}`}
                            onClick={() => onSwapWord(suggestion.wordId, variant.word, themeWord?.clue || '')}
                            className="px-2 py-1 rounded text-xs font-medium bg-[#D4AF37]/20 text-[#D4AF37] hover:bg-[#D4AF37]/40 border border-[#D4AF37]/30 transition-colors"
                          >
                            {variant.word}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {!hasAlternatives && !hasVariants && (
                    <p className="text-red-400 text-xs flex items-center gap-1">
                      <span>❌</span>
                      No alternatives found
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Suggestions for empty cells */}
        {hasCellFillers && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-[#8fc1e3] text-xs uppercase tracking-widest">
                Suggestions for Grid
              </span>
            </div>

            {Object.entries(fillersByLength)
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([length, fillers]) => (
                <div key={length}>
                  <span className="text-[#6ba8d4] text-xs mb-1.5 block">
                    {length}-letter words:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {fillers.slice(0, 8).map((filler, i) => (
                      <button
                        key={`${filler.word}-${i}`}
                        onClick={() => onAddWord(filler.word, filler.clue)}
                        className={cn(
                          'group relative px-2 py-1 rounded text-xs font-medium transition-all',
                          'bg-[#001a2c]/60 hover:bg-[#001a2c] border',
                          filler.fitQuality === 'perfect'
                            ? 'text-emerald-300 border-emerald-500/30 hover:border-emerald-500/50'
                            : filler.fitQuality === 'good'
                            ? 'text-yellow-300 border-yellow-500/30 hover:border-yellow-500/50'
                            : 'text-[#8fc1e3] border-[#4A90C2]/30 hover:border-[#4A90C2]/50'
                        )}
                      >
                        <span className="flex items-center gap-1">
                          {filler.fitQuality === 'perfect' && (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          )}
                          {filler.fitQuality === 'good' && (
                            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                          )}
                          {filler.fitQuality === 'possible' && (
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                          )}
                          {filler.word}
                          {filler.isIslamic && <span className="text-[10px]">🕌</span>}
                        </span>
                        {/* Tooltip */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 rounded bg-[#001a2c] border border-[#4A90C2]/30 text-[10px] text-[#b3d4ed] max-w-[180px] text-center opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 whitespace-normal">
                          {filler.clue}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}

        {!hasUnplacedWords && !hasCellFillers && puzzle && (
          <div className="text-center py-6">
            <div className="text-2xl mb-2">✓</div>
            <p className="text-emerald-400 text-sm font-medium">
              All words placed!
            </p>
            <p className="text-[#6ba8d4] text-xs mt-1">
              Puzzle is complete
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default GapFillers;
