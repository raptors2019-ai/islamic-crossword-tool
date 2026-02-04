'use client';

import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CrosswordGrid } from '@/components/crossword-grid';
import { toGeneratedPuzzleGrid, calculateCellNumbers } from '@/lib/editable-grid';
import { ProphetPuzzleResult } from '@/lib/puzzle-explorer-helpers';

interface PuzzleExplorerCardProps {
  result: ProphetPuzzleResult;
  onRegenerate: (prophetId: string) => void;
  isRegenerating?: boolean;
}

function getMasteryColor(themeWords: number): string {
  if (themeWords >= 5) return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
  if (themeWords >= 3) return 'bg-[#D4AF37]/20 text-[#D4AF37] border-[#D4AF37]/30';
  if (themeWords >= 1) return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
  return 'bg-red-500/20 text-red-400 border-red-500/30';
}

function getMasteryLabel(themeWords: number): string {
  if (themeWords >= 5) return 'Excellent';
  if (themeWords >= 3) return 'Good';
  if (themeWords >= 1) return 'Fair';
  return 'Poor';
}

export function PuzzleExplorerCard({ result, onRegenerate, isRegenerating }: PuzzleExplorerCardProps) {
  const { prophetId, displayName, arabicName, status, result: genResult, keywordsUsed, keywordsTotal, generationTimeMs } = result;
  const themeWordsPlaced = genResult?.stats.themeWordsPlaced || 0;
  const islamicPct = genResult?.stats.islamicPercentage || 0;
  const gridFillPct = genResult?.stats.gridFillPercentage || 0;

  // Pending/generating skeleton
  if (status === 'pending' || status === 'generating') {
    return (
      <Card className="bg-[#004d77]/40 backdrop-blur-sm border-[#4A90C2]/20 overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-6 w-32 bg-[#4A90C2]/20 rounded animate-pulse" />
            {arabicName && (
              <span className="text-[#8fc1e3]/50 text-sm">{arabicName}</span>
            )}
          </div>
          <div className="flex gap-4">
            {/* Grid skeleton */}
            <div className="w-[150px] h-[150px] bg-[#001a2c]/60 rounded-lg flex items-center justify-center">
              {status === 'generating' ? (
                <svg className="w-8 h-8 text-[#D4AF37] animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <div className="w-16 h-16 bg-[#4A90C2]/10 rounded" />
              )}
            </div>
            {/* Stats skeleton */}
            <div className="flex-1 space-y-2">
              <div className="h-4 w-24 bg-[#4A90C2]/20 rounded animate-pulse" />
              <div className="h-4 w-20 bg-[#4A90C2]/20 rounded animate-pulse" />
              <div className="h-4 w-28 bg-[#4A90C2]/20 rounded animate-pulse" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Failed state
  if (status === 'failed' && !genResult) {
    return (
      <Card className="bg-[#004d77]/40 backdrop-blur-sm border-red-500/20 overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h3 className="text-[#D4AF37] font-serif font-semibold text-sm">{displayName}</h3>
              {arabicName && <span className="text-[#8fc1e3] text-xs">{arabicName}</span>}
            </div>
            <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">
              Failed
            </Badge>
          </div>
          <p className="text-[#8fc1e3] text-xs mb-3">Generation failed. Not enough valid keywords or no grid solutions found.</p>
          <Button
            onClick={() => onRegenerate(prophetId)}
            disabled={isRegenerating}
            size="sm"
            variant="outline"
            className="border-[#4A90C2]/40 text-[#8fc1e3] hover:bg-[#4A90C2]/20 hover:text-white text-xs"
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Placed keywords set for highlighting
  const placedWordSet = new Set(genResult?.placedWords.map(pw => pw.word.toUpperCase()) || []);

  return (
    <Card className="bg-[#004d77]/40 backdrop-blur-sm border-[#4A90C2]/20 overflow-hidden">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-[#D4AF37] font-serif font-semibold text-sm">{displayName}</h3>
            {arabicName && <span className="text-[#8fc1e3] text-xs">{arabicName}</span>}
          </div>
          <Badge variant="outline" className={cn('text-xs border', getMasteryColor(themeWordsPlaced))}>
            {themeWordsPlaced}/{keywordsTotal} keywords
          </Badge>
        </div>

        {/* Body: Grid + Stats */}
        <div className="flex gap-4">
          {/* Grid Preview */}
          <div className="shrink-0">
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

          {/* Stats */}
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[#8fc1e3] text-xs">Theme Words</span>
              <span className="text-white text-xs font-medium">{themeWordsPlaced}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#8fc1e3] text-xs">Islamic %</span>
              <span className={cn(
                'text-xs font-medium',
                islamicPct >= 50 ? 'text-emerald-400' : islamicPct >= 25 ? 'text-[#D4AF37]' : 'text-red-400'
              )}>
                {islamicPct.toFixed(0)}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#8fc1e3] text-xs">Grid Fill</span>
              <span className={cn(
                'text-xs font-medium',
                gridFillPct >= 99 ? 'text-emerald-400' : 'text-orange-400'
              )}>
                {gridFillPct.toFixed(0)}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#8fc1e3] text-xs">Mastery</span>
              <span className={cn('text-xs font-medium', getMasteryColor(themeWordsPlaced).split(' ')[1])}>
                {getMasteryLabel(themeWordsPlaced)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#8fc1e3] text-xs">Time</span>
              <span className="text-[#6ba8d4] text-xs">{(generationTimeMs / 1000).toFixed(1)}s</span>
            </div>
          </div>
        </div>

        {/* Keywords */}
        <div className="mt-3">
          <div className="flex flex-wrap gap-1">
            {result.keywordsUsed.length > 0 ? (
              // Show all keywords from the prophet, highlighting placed ones
              (() => {
                // Get all keywords for this prophet (not just used ones)
                const allKeywords = result.keywordsUsed;
                return allKeywords.map((kw, i) => {
                  const isPlaced = placedWordSet.has(kw.word.toUpperCase());
                  return (
                    <span
                      key={`${kw.word}-${i}`}
                      className={cn(
                        'px-1.5 py-0.5 rounded text-[10px] font-mono',
                        isPlaced
                          ? 'bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30'
                          : 'bg-[#001a2c]/40 text-[#6ba8d4]/50 border border-[#4A90C2]/10'
                      )}
                    >
                      {kw.word}
                    </span>
                  );
                });
              })()
            ) : null}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-3 flex items-center gap-2">
          <Button
            onClick={() => onRegenerate(prophetId)}
            disabled={isRegenerating}
            size="sm"
            variant="outline"
            className="border-[#4A90C2]/40 text-[#8fc1e3] hover:bg-[#4A90C2]/20 hover:text-white text-xs h-7"
          >
            {isRegenerating ? (
              <>
                <svg className="w-3 h-3 mr-1 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Regenerating...
              </>
            ) : (
              'Regenerate'
            )}
          </Button>
          <a
            href={`/?prophet=${prophetId}`}
            className="text-[#4A90C2] hover:text-[#D4AF37] text-xs transition-colors"
          >
            Open in Builder
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
