'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { getSuggestionsForPattern, WordSuggestion } from '@/lib/constraint-suggester';

interface ConstraintSuggestionsProps {
  pattern: string | null;
  direction: 'across' | 'down';
  onSelectWord: (word: string, clue: string) => void;
  className?: string;
}

export function ConstraintSuggestions({
  pattern,
  direction,
  onSelectWord,
  className,
}: ConstraintSuggestionsProps) {
  const suggestions = useMemo(() => {
    if (!pattern) return [];
    return getSuggestionsForPattern(pattern, 8);
  }, [pattern]);

  if (!pattern || suggestions.length === 0) {
    return (
      <div className={cn('bg-[#001a2c]/60 rounded-xl p-4 border border-[#4A90C2]/20', className)}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-[#8fc1e3] text-xs uppercase tracking-widest">
            Live Suggestions
          </span>
          <span className="text-[#6ba8d4] text-xs">
            {direction === 'across' ? '→' : '↓'}
          </span>
        </div>

        <div className="text-center py-6">
          <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-[#001a2c]/40 flex items-center justify-center">
            <svg className="w-6 h-6 text-[#6ba8d4]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <p className="text-[#6ba8d4] text-sm">
            Type letters in the grid to see suggestions
          </p>
        </div>
      </div>
    );
  }

  // Format pattern for display (replace _ with dots)
  const displayPattern = pattern.replace(/_/g, '·').replace(/#/g, ' ');

  return (
    <div className={cn('bg-[#001a2c]/60 rounded-xl p-4 border border-[#4A90C2]/20', className)}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[#8fc1e3] text-xs uppercase tracking-widest">
          Live Suggestions
        </span>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[#D4AF37] text-sm tracking-wider">
            {displayPattern}
          </span>
          <span className="text-[#6ba8d4] text-xs">
            {direction === 'across' ? '→' : '↓'}
          </span>
        </div>
      </div>

      <div className="space-y-1.5">
        {suggestions.map((suggestion, index) => (
          <SuggestionItem
            key={`${suggestion.word}-${index}`}
            suggestion={suggestion}
            pattern={pattern}
            onSelect={() => onSelectWord(suggestion.word, suggestion.clue)}
          />
        ))}
      </div>

      {suggestions.length > 0 && (
        <p className="text-[#6ba8d4] text-xs mt-3 text-center">
          Click to fill word in grid
        </p>
      )}
    </div>
  );
}

interface SuggestionItemProps {
  suggestion: WordSuggestion;
  pattern: string;
  onSelect: () => void;
}

function SuggestionItem({ suggestion, pattern, onSelect }: SuggestionItemProps) {
  // Highlight the letters that match the pattern
  const renderWord = () => {
    const patternChars = pattern.replace(/#.*/, ''); // Portion before #
    return suggestion.word.split('').map((char, i) => {
      const isMatch = patternChars[i] && patternChars[i].toUpperCase() === char;
      return (
        <span
          key={i}
          className={cn(
            'font-mono',
            isMatch ? 'text-[#D4AF37]' : 'text-white'
          )}
        >
          {char}
        </span>
      );
    });
  };

  const categoryColors: Record<string, string> = {
    'prophets': 'bg-emerald-500/20 text-emerald-400',
    'names-of-allah': 'bg-amber-500/20 text-amber-400',
    'quran': 'bg-sky-500/20 text-sky-400',
    'companions': 'bg-violet-500/20 text-violet-400',
    'general': 'bg-slate-500/20 text-slate-400',
  };

  return (
    <button
      onClick={onSelect}
      className="w-full flex items-center gap-3 p-2 rounded-lg bg-[#002a42]/60 hover:bg-[#003B5C] border border-[#4A90C2]/20 hover:border-[#D4AF37]/50 transition-all group"
    >
      {/* Word */}
      <span className="font-medium tracking-wide flex-shrink-0">
        {renderWord()}
      </span>

      {/* Category badge */}
      {suggestion.category && (
        <span
          className={cn(
            'text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0',
            categoryColors[suggestion.category] || categoryColors['general']
          )}
        >
          {suggestion.category === 'names-of-allah' ? 'Names' :
           suggestion.category.charAt(0).toUpperCase() + suggestion.category.slice(1)}
        </span>
      )}

      {/* Clue preview (truncated) */}
      <span className="text-[#8fc1e3] text-xs truncate flex-1 text-left">
        {suggestion.clue}
      </span>

      {/* Fill indicator */}
      <svg
        className="w-4 h-4 text-[#6ba8d4] group-hover:text-[#D4AF37] flex-shrink-0 transition-colors"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 5l7 7-7 7"
        />
      </svg>
    </button>
  );
}

export default ConstraintSuggestions;
