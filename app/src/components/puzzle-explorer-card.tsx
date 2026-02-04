'use client';

import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { CrosswordGrid } from '@/components/crossword-grid';
import { toGeneratedPuzzleGrid, calculateCellNumbers } from '@/lib/editable-grid';
import { ProphetPuzzleResult } from '@/lib/puzzle-explorer-helpers';
import { getKeywordsForProphet } from '@/lib/prophet-keywords';

interface PuzzleExplorerCardProps {
  result: ProphetPuzzleResult;
  onExpand?: (result: ProphetPuzzleResult) => void;
}

export function PuzzleExplorerCard({ result, onExpand }: PuzzleExplorerCardProps) {
  const { displayName, arabicName, result: genResult } = result;
  const themeWordsPlaced = genResult?.stats.themeWordsPlaced || 0;
  const islamicPct = genResult?.stats.islamicPercentage || 0;
  const gridFillPct = genResult?.stats.gridFillPercentage || 0;

  // All keywords for this prophet (to show placed vs unplaced)
  const allKeywords = getKeywordsForProphet(result.prophetId);
  const placedWordSet = new Set(genResult?.placedWords.map(pw => pw.word.toUpperCase()) || []);

  // Failed state
  if (result.status === 'failed' && !genResult) {
    return (
      <Card className="w-[260px] shrink-0 snap-start bg-[#004d77]/40 backdrop-blur-sm border-red-500/20 overflow-hidden">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-[#D4AF37] font-serif font-semibold text-sm truncate">{displayName}</h3>
            {arabicName && <span className="text-[#8fc1e3] text-xs">{arabicName}</span>}
          </div>
          <div className="w-full aspect-square bg-[#001a2c]/60 rounded-lg flex items-center justify-center mb-2">
            <span className="text-red-400 text-xs">Failed</span>
          </div>
          <p className="text-[#8fc1e3] text-[10px]">Not enough valid keywords or no grid solutions found.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className="w-[260px] shrink-0 snap-start bg-[#004d77]/40 backdrop-blur-sm border-[#4A90C2]/20 overflow-hidden cursor-pointer hover:border-[#D4AF37]/40 transition-colors"
      onClick={() => onExpand?.(result)}
    >
      <CardContent className="p-3">
        {/* Header: Prophet name + Arabic + expand icon */}
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-[#D4AF37] font-serif font-semibold text-sm truncate">{displayName}</h3>
          {arabicName && <span className="text-[#8fc1e3] text-xs">{arabicName}</span>}
          <span className="ml-auto shrink-0">
            <svg className="w-3.5 h-3.5 text-[#6ba8d4] hover:text-[#D4AF37] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
            </svg>
          </span>
        </div>

        {/* Grid Preview */}
        <div className="flex justify-center mb-2">
          {genResult && (
            <CrosswordGrid
              grid={toGeneratedPuzzleGrid(calculateCellNumbers(genResult.grid))}
              theme="dark"
              cellSize="xs"
              showControls={false}
              showNumbers={false}
              showLetters={true}
              compact={true}
            />
          )}
        </div>

        {/* Keyword pills */}
        <div className="flex flex-wrap gap-1 mb-2">
          {allKeywords.slice(0, 10).map((kw, i) => {
            const isPlaced = placedWordSet.has(kw.word.toUpperCase());
            return (
              <span
                key={`${kw.word}-${i}`}
                className={cn(
                  'px-1.5 py-0.5 rounded text-[10px] font-mono',
                  isPlaced
                    ? 'bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30'
                    : 'bg-[#001a2c]/40 text-[#6ba8d4]/40 border border-[#4A90C2]/10'
                )}
              >
                {kw.word}
              </span>
            );
          })}
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-3 text-[10px]">
          <span className={cn(
            'font-medium',
            islamicPct >= 50 ? 'text-emerald-400' : islamicPct >= 25 ? 'text-[#D4AF37]' : 'text-red-400'
          )}>
            {islamicPct.toFixed(0)}% Islamic
          </span>
          <span className={cn(
            'font-medium',
            gridFillPct >= 99 ? 'text-emerald-400' : 'text-orange-400'
          )}>
            {gridFillPct.toFixed(0)}% Fill
          </span>
          <span className="text-[#6ba8d4]">
            {themeWordsPlaced} keywords
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
