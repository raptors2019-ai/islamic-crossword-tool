'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { ProphetKeyword, KeywordSource } from '@/lib/prophet-keywords';
import { checkWordFit, FitResult } from '@/lib/fit-checker';
import { GeneratedPuzzle } from '@/lib/types';

// Source badge styling
const SOURCE_BADGES: Record<KeywordSource, { color: string; short: string }> = {
  'puzzle-archive': { color: 'bg-amber-500/60', short: 'P' },
  'word-list': { color: 'bg-blue-500/60', short: 'W' },
  'scraped': { color: 'bg-slate-500/60', short: 'A' },
  'local': { color: 'bg-purple-500/60', short: 'L' },
};

interface KeywordPillsProps {
  keywords: ProphetKeyword[];
  onKeywordClick: (keyword: ProphetKeyword) => void;
  selectedWords: string[];
  puzzle: GeneratedPuzzle | null;
  maxVisible?: number;
  showFitIndicators?: boolean;
  className?: string;
}

export function KeywordPills({
  keywords,
  onKeywordClick,
  selectedWords,
  puzzle,
  maxVisible = 12,
  showFitIndicators = true,
  className,
}: KeywordPillsProps) {
  // Calculate fit results for all keywords
  const keywordsWithFit = useMemo(() => {
    return keywords.map((keyword) => {
      const isSelected = selectedWords.some(
        (w) => w.toUpperCase() === keyword.word.toUpperCase()
      );
      const fitResult = isSelected
        ? null
        : checkWordFit(keyword.word, puzzle, selectedWords);

      return {
        keyword,
        isSelected,
        fitResult,
      };
    });
  }, [keywords, selectedWords, puzzle]);

  // Sort by: selected first, then by fit quality, then by relevance
  const sortedKeywords = useMemo(() => {
    return [...keywordsWithFit].sort((a, b) => {
      // Selected words first
      if (a.isSelected && !b.isSelected) return -1;
      if (!a.isSelected && b.isSelected) return 1;

      // Then by fit quality (for non-selected)
      if (a.fitResult && b.fitResult) {
        const qualityOrder = { perfect: 0, good: 1, possible: 2, unlikely: 3, cannot_fit: 4 };
        const qualityDiff = qualityOrder[a.fitResult.quality] - qualityOrder[b.fitResult.quality];
        if (qualityDiff !== 0) return qualityDiff;
      }

      // Then by relevance
      return b.keyword.relevance - a.keyword.relevance;
    });
  }, [keywordsWithFit]);

  const visibleKeywords = sortedKeywords.slice(0, maxVisible);
  const hiddenCount = sortedKeywords.length - maxVisible;

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex flex-wrap gap-2">
        {visibleKeywords.map(({ keyword, isSelected, fitResult }) => (
          <KeywordPill
            key={keyword.word}
            keyword={keyword}
            isSelected={isSelected}
            fitResult={fitResult}
            showFitIndicator={showFitIndicators && !isSelected}
            onClick={() => onKeywordClick(keyword)}
          />
        ))}
      </div>

      {hiddenCount > 0 && (
        <button className="text-[#8fc1e3] text-sm hover:text-[#D4AF37] transition-colors">
          + {hiddenCount} more keywords
        </button>
      )}
    </div>
  );
}

interface KeywordPillProps {
  keyword: ProphetKeyword;
  isSelected: boolean;
  fitResult: FitResult | null;
  showFitIndicator: boolean;
  onClick: () => void;
}

function KeywordPill({
  keyword,
  isSelected,
  fitResult,
  showFitIndicator,
  onClick,
}: KeywordPillProps) {
  return (
    <button
      onClick={onClick}
      disabled={isSelected}
      className={cn(
        'group relative px-3 py-1.5 rounded-lg text-sm font-medium tracking-wide transition-all',
        'border flex items-center gap-1.5',
        isSelected
          ? 'bg-[#D4AF37]/30 text-[#D4AF37] border-[#D4AF37]/50 cursor-default'
          : fitResult?.canFit === false
          ? 'bg-[#001a2c]/40 text-[#6ba8d4] border-[#4A90C2]/20 opacity-50 cursor-not-allowed'
          : 'bg-[#001a2c]/60 text-white border-[#4A90C2]/30 hover:border-[#D4AF37]/50 hover:bg-[#001a2c]/80 cursor-pointer'
      )}
      title={keyword.clue}
    >
      {/* Fit indicator */}
      {showFitIndicator && fitResult && (
        <FitIndicator fitResult={fitResult} />
      )}

      {/* Word */}
      <span>{keyword.word}</span>

      {/* Source badge */}
      {keyword.source && keyword.source !== 'local' && (
        <span
          className={cn(
            'w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white',
            SOURCE_BADGES[keyword.source]?.color || 'bg-slate-500/60'
          )}
          title={`Source: ${keyword.source}${keyword.sourceDetails ? ` (${keyword.sourceDetails})` : ''}`}
        >
          {SOURCE_BADGES[keyword.source]?.short || '?'}
        </span>
      )}

      {/* Selected checkmark */}
      {isSelected && (
        <svg
          className="w-3.5 h-3.5 text-[#D4AF37]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      )}

      {/* Tooltip with clue on hover */}
      <div
        className={cn(
          'absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-lg',
          'bg-[#001a2c] border border-[#4A90C2]/30 shadow-lg',
          'text-xs text-[#b3d4ed] max-w-[200px] text-center',
          'opacity-0 invisible group-hover:opacity-100 group-hover:visible',
          'transition-all duration-200 z-50 pointer-events-none'
        )}
      >
        {keyword.clue}
        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
          <div className="border-4 border-transparent border-t-[#4A90C2]/30" />
        </div>
      </div>
    </button>
  );
}

function FitIndicator({ fitResult }: { fitResult: FitResult }) {
  return (
    <span
      className={cn(
        'w-2 h-2 rounded-full',
        fitResult.quality === 'perfect' || fitResult.quality === 'good'
          ? 'bg-emerald-400'
          : fitResult.quality === 'possible'
          ? 'bg-yellow-400'
          : 'bg-red-400'
      )}
    />
  );
}

// Export a simple version for inline use
export function KeywordBadge({
  word,
  clue,
  onClick,
  isSelected,
}: {
  word: string;
  clue: string;
  onClick?: () => void;
  isSelected?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-2.5 py-1 rounded-md text-xs font-medium transition-all',
        isSelected
          ? 'bg-[#D4AF37] text-[#001a2c]'
          : 'bg-[#4A90C2]/20 text-[#8fc1e3] hover:bg-[#4A90C2]/30 hover:text-white'
      )}
      title={clue}
    >
      {word}
    </button>
  );
}
