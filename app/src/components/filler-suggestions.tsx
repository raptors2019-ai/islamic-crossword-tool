'use client';

import { FillerSuggestion, ThemeWord } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface FillerSuggestionsProps {
  suggestions: FillerSuggestion[];
  themeWords: ThemeWord[];
  onSwapWord: (originalWordId: string, newWord: string, newClue: string) => void;
  onUseVariant: (wordId: string, variant: string) => void;
  onRemoveWord: (wordId: string) => void;
  className?: string;
}

function getReasonLabel(reason: FillerSuggestion['reason']): string {
  switch (reason) {
    case 'too_long':
      return 'Word too long for grid';
    case 'conflicts':
      return 'Conflicts with placed words';
    case 'no_fit':
    default:
      return 'Could not find placement';
  }
}

function getReasonIcon(reason: FillerSuggestion['reason']): string {
  switch (reason) {
    case 'too_long':
      return '📏';
    case 'conflicts':
      return '⚠️';
    case 'no_fit':
    default:
      return '🧩';
  }
}

export function FillerSuggestions({
  suggestions,
  themeWords,
  onSwapWord,
  onUseVariant,
  onRemoveWord,
  className,
}: FillerSuggestionsProps) {
  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center gap-2">
        <span className="text-lg">⚠️</span>
        <h3 className="text-[#D4AF37] font-semibold">
          Could not place ({suggestions.length} word{suggestions.length !== 1 ? 's' : ''})
        </h3>
      </div>

      {suggestions.map((suggestion) => {
        const themeWord = themeWords.find(w => w.id === suggestion.wordId);
        const hasVariants = suggestion.variants && suggestion.variants.length > 0;
        const hasSuggestions = suggestion.suggestions.length > 0;

        return (
          <div
            key={suggestion.wordId}
            className="bg-[#004d77]/50 rounded-xl p-4 border border-[#D4AF37]/30"
          >
            {/* Header with word info */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-white font-bold">{suggestion.originalWord}</span>
                <Badge variant="outline" className="text-[#8fc1e3] border-[#4A90C2]/50 text-xs">
                  {suggestion.originalLength} letters
                </Badge>
                {themeWord?.arabicScript && (
                  <span className="text-[#6ba8d4] text-sm">{themeWord.arabicScript}</span>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemoveWord(suggestion.wordId)}
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-7 px-2"
              >
                Remove
              </Button>
            </div>

            {/* Reason */}
            <div className="text-[#8fc1e3] text-xs mb-3 flex items-center gap-1">
              <span>{getReasonIcon(suggestion.reason)}</span>
              <span>{getReasonLabel(suggestion.reason)}</span>
            </div>

            {/* Suggestions */}
            {hasSuggestions && (
              <div className="mb-3">
                <div className="text-[#b3d4ed] text-xs uppercase tracking-wide mb-2">
                  Try instead:
                </div>
                <div className="flex flex-wrap gap-2">
                  {suggestion.suggestions.map((alt, i) => (
                    <button
                      key={`${alt.word}-${i}`}
                      onClick={() => onSwapWord(suggestion.wordId, alt.word, alt.clue)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                        'bg-[#4A90C2]/20 text-white hover:bg-[#4A90C2]/40',
                        'border border-[#4A90C2]/30 hover:border-[#4A90C2]'
                      )}
                      title={alt.clue}
                    >
                      <span>{alt.word}</span>
                      <span className="text-[#6ba8d4] text-xs ml-1">({alt.length})</span>
                      {alt.source === 'islamic' && (
                        <span className="ml-1 text-[10px]">🕌</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Spelling variants */}
            {hasVariants && (
              <div>
                <div className="text-[#b3d4ed] text-xs uppercase tracking-wide mb-2">
                  Or use shorter spelling:
                </div>
                <div className="flex flex-wrap gap-2">
                  {suggestion.variants!.map((variant, i) => (
                    <button
                      key={`${variant.word}-${i}`}
                      onClick={() => onUseVariant(suggestion.wordId, variant.word)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                        'bg-[#D4AF37]/20 text-[#D4AF37] hover:bg-[#D4AF37]/30',
                        'border border-[#D4AF37]/30 hover:border-[#D4AF37]'
                      )}
                    >
                      <span>{variant.word}</span>
                      <span className="text-[#c9a430] text-xs ml-1">({variant.length})</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* No alternatives found */}
            {!hasSuggestions && !hasVariants && (
              <div className="flex items-center gap-2 text-red-400 text-sm">
                <span>❌</span>
                <span>No alternatives found - consider removing this word</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default FillerSuggestions;
