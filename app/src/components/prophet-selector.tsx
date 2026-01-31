'use client';

import { useState, useCallback, useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  PROPHET_KEYWORDS,
  PROPHET_IDS,
  getKeywordsForProphet,
  ProphetKeyword,
  KeywordSource,
} from '@/lib/prophet-keywords';
import { GeneratedPuzzle, ThemeWord } from '@/lib/types';
import {
  scoreKeywords,
  ScoredKeyword,
  getFitIndicatorStyle,
  getScoredKeywordTooltip,
} from '@/lib/keyword-scorer';

interface ProphetSelectorProps {
  onKeywordSelect: (keyword: ProphetKeyword) => void;
  onKeywordDeselect?: (word: string) => void;
  selectedWords: ThemeWord[];
  puzzle: GeneratedPuzzle | null;
  className?: string;
}

// Source badge colors - more visible
const SOURCE_STYLES: Record<KeywordSource, { bg: string; text: string; label: string }> = {
  'puzzle-archive': { bg: 'bg-amber-500', text: 'text-amber-950', label: 'Proven' },
  'word-list': { bg: 'bg-sky-500', text: 'text-sky-950', label: 'Curated' },
  'scraped': { bg: 'bg-violet-500', text: 'text-violet-950', label: 'AI' },
  'local': { bg: 'bg-slate-500', text: 'text-slate-950', label: 'Local' },
};

export function ProphetSelector({
  onKeywordSelect,
  onKeywordDeselect,
  selectedWords,
  puzzle,
  className,
}: ProphetSelectorProps) {
  const [selectedProphet, setSelectedProphet] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  // Query Convex for keywords when a prophet is selected
  const convexKeywords = useQuery(
    api.prophetKeywords.listByProphet,
    selectedProphet ? { prophetId: selectedProphet } : 'skip'
  );

  const handleProphetChange = useCallback((prophetId: string) => {
    setSelectedProphet(prophetId);
    setShowAll(false);
  }, []);

  // Use Convex keywords if available, fall back to local data
  const keywords: ProphetKeyword[] = useMemo(() => {
    if (convexKeywords && convexKeywords.length > 0) {
      return convexKeywords.map((kw) => ({
        word: kw.word,
        clue: kw.clue,
        relevance: kw.relevance,
        source: kw.source as KeywordSource,
        sourceDetails: kw.sourceDetails,
        isApproved: kw.isApproved,
      }));
    }
    return selectedProphet
      ? getKeywordsForProphet(selectedProphet).map((kw) => ({
          ...kw,
          source: 'local' as KeywordSource,
        }))
      : [];
  }, [convexKeywords, selectedProphet]);

  // Score and sort keywords based on grid fit
  const scoredKeywords: ScoredKeyword[] = useMemo(() => {
    if (keywords.length === 0) return [];
    return scoreKeywords(keywords, puzzle, selectedWords);
  }, [keywords, puzzle, selectedWords]);

  const prophetData = selectedProphet
    ? PROPHET_KEYWORDS[selectedProphet]
    : null;

  const selectedWordStrings = selectedWords.map((w) => w.activeSpelling.toUpperCase());

  // Show more keywords when expanded
  const visibleCount = showAll ? scoredKeywords.length : 20;
  const visibleKeywords = scoredKeywords.slice(0, visibleCount);
  const hasMore = scoredKeywords.length > visibleCount;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Prophet Dropdown */}
      <Select
        value={selectedProphet || ''}
        onValueChange={handleProphetChange}
      >
        <SelectTrigger className="w-full bg-[#002a42]/80 border-[#4A90C2]/30 text-white hover:border-[#D4AF37]/50 transition-colors h-12 text-base">
          <SelectValue placeholder="Choose a Prophet to see keywords..." />
        </SelectTrigger>
        <SelectContent className="bg-[#002a42] border-[#4A90C2]/30 max-h-[400px]">
          {PROPHET_IDS.map((prophetId) => {
            const prophet = PROPHET_KEYWORDS[prophetId];
            return (
              <SelectItem
                key={prophetId}
                value={prophetId}
                className="text-white data-[highlighted]:bg-[#D4AF37] data-[highlighted]:text-[#001a2c] py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="font-medium">{prophet.displayName}</span>
                  {prophet.arabicName && (
                    <span className="text-[#D4AF37] text-lg">
                      {prophet.arabicName}
                    </span>
                  )}
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>

      {/* Keywords Display */}
      {selectedProphet && prophetData && (
        <div className="bg-[#001a2c]/60 rounded-xl p-5 border border-[#4A90C2]/20">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h4 className="text-[#D4AF37] font-semibold text-lg font-serif">
                {prophetData.displayName}
              </h4>
              {prophetData.arabicName && (
                <span className="text-2xl text-[#D4AF37]/80">{prophetData.arabicName}</span>
              )}
            </div>
            <span className="text-[#8fc1e3] text-sm bg-[#4A90C2]/20 px-3 py-1 rounded-full">
              {scoredKeywords.length} keywords
            </span>
          </div>

          {/* Keywords Grid */}
          <div className="flex flex-wrap gap-2 mb-4">
            {visibleKeywords.map((scored) => {
              const { keyword, fitResult } = scored;
              const isSelected = selectedWordStrings.includes(keyword.word.toUpperCase());
              const sourceStyle = SOURCE_STYLES[keyword.source || 'local'];
              const fitStyle = getFitIndicatorStyle(fitResult.quality);
              const tooltipText = getScoredKeywordTooltip(scored);

              const handleClick = () => {
                if (isSelected && onKeywordDeselect) {
                  onKeywordDeselect(keyword.word);
                } else if (!isSelected && fitResult.canFit) {
                  onKeywordSelect(keyword);
                }
              };

              return (
                <button
                  key={`${keyword.word}-${keyword.source}`}
                  onClick={handleClick}
                  disabled={!isSelected && !fitResult.canFit}
                  className={cn(
                    'group relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                    isSelected
                      ? 'bg-[#D4AF37] text-[#001a2c] cursor-pointer hover:bg-[#e5c86b]'
                      : fitResult.canFit
                        ? 'bg-[#002a42] text-white hover:bg-[#003B5C] hover:scale-105 cursor-pointer border border-[#4A90C2]/30 hover:border-[#D4AF37]/50'
                        : 'bg-[#002a42]/50 text-white/40 cursor-not-allowed border border-[#4A90C2]/10',
                    !isSelected && fitStyle.opacity
                  )}
                >
                  {/* Fit indicator dot */}
                  {!isSelected && fitResult.canFit && fitStyle.dotColor && (
                    <span
                      className={cn(
                        'w-2 h-2 rounded-full flex-shrink-0',
                        fitStyle.dotColor
                      )}
                    />
                  )}

                  {/* Word */}
                  <span className="font-mono font-bold tracking-wide">{keyword.word}</span>

                  {/* Source indicator */}
                  {keyword.source && keyword.source !== 'local' && !isSelected && fitResult.canFit && (
                    <span
                      className={cn(
                        'text-[10px] font-bold px-1.5 py-0.5 rounded',
                        sourceStyle.bg,
                        sourceStyle.text
                      )}
                    >
                      {keyword.source === 'puzzle-archive' ? 'P' : keyword.source === 'word-list' ? 'W' : 'AI'}
                    </span>
                  )}

                  {/* Selected checkmark */}
                  {isSelected && (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                    </svg>
                  )}

                  {/* Tooltip with clue and fit info */}
                  {!isSelected && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-lg bg-[#001a2c] border border-[#4A90C2]/30 shadow-xl text-xs text-[#b3d4ed] max-w-[250px] text-center opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none whitespace-normal">
                      {tooltipText}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Show more button */}
          {hasMore && !showAll && (
            <button
              onClick={() => setShowAll(true)}
              className="w-full py-2 text-sm text-[#D4AF37] hover:text-[#e5c86b] transition-colors"
            >
              Show {scoredKeywords.length - visibleCount} more keywords...
            </button>
          )}

          {/* Legend */}
          <div className="pt-4 border-t border-[#4A90C2]/20 space-y-2">
            {/* Fit indicators legend */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-[#8fc1e3]">
              <span>Fit:</span>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Perfect</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-yellow-400" />
                <span>Good</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                <span>Possible</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-white/40">Dimmed</span>
                <span>= Cannot fit</span>
              </div>
            </div>
            {/* Source indicators legend */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-[#8fc1e3]">
              <span>Source:</span>
              <div className="flex items-center gap-1">
                <span className="bg-amber-500 text-amber-950 px-1.5 py-0.5 rounded font-bold">P</span>
                <span>Proven</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="bg-sky-500 text-sky-950 px-1.5 py-0.5 rounded font-bold">W</span>
                <span>Curated</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="bg-violet-500 text-violet-950 px-1.5 py-0.5 rounded font-bold">AI</span>
                <span>AI-Generated</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!selectedProphet && (
        <div className="bg-[#001a2c]/40 rounded-xl p-8 border border-[#4A90C2]/20 text-center">
          <div className="text-4xl mb-3">📖</div>
          <p className="text-[#8fc1e3]">Select a prophet above to see story keywords</p>
        </div>
      )}
    </div>
  );
}

// Compact version for inline display
export function ProphetSelectorCompact({
  onProphetChange,
  selectedProphet,
  className,
}: {
  onProphetChange: (prophetId: string | null) => void;
  selectedProphet: string | null;
  className?: string;
}) {
  return (
    <Select
      value={selectedProphet || ''}
      onValueChange={(v) => onProphetChange(v || null)}
    >
      <SelectTrigger
        className={cn(
          'bg-[#002a42]/80 border-[#4A90C2]/30 text-white hover:border-[#D4AF37]/50 transition-colors',
          className
        )}
      >
        <SelectValue placeholder="Select Prophet..." />
      </SelectTrigger>
      <SelectContent className="bg-[#002a42] border-[#4A90C2]/30 max-h-[250px]">
        <SelectItem value="" className="text-[#8fc1e3] data-[highlighted]:bg-[#D4AF37] data-[highlighted]:text-[#001a2c]">
          All Prophets
        </SelectItem>
        {PROPHET_IDS.map((prophetId) => {
          const prophet = PROPHET_KEYWORDS[prophetId];
          return (
            <SelectItem
              key={prophetId}
              value={prophetId}
              className="text-white data-[highlighted]:bg-[#D4AF37] data-[highlighted]:text-[#001a2c]"
            >
              {prophet.displayName}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
