'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { AppHeader } from '@/components/app-header';
import { PuzzleExplorerCard } from '@/components/puzzle-explorer-card';
import { CrosswordGrid } from '@/components/crossword-grid';
import { toGeneratedPuzzleGrid, calculateCellNumbers } from '@/lib/editable-grid';
import { getKeywordsForProphet } from '@/lib/prophet-keywords';
import {
  ProphetPuzzleResult,
  generateForProphet,
  PROPHET_IDS,
} from '@/lib/puzzle-explorer-helpers';

/** Stars string for a keyword count, e.g. 5 → "★★★★★" */
function stars(count: number): string {
  return '★'.repeat(count);
}

/** Carousel with left/right arrow buttons */
function Carousel({ children }: { children: React.ReactNode }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', checkScroll, { passive: true });
    const observer = new ResizeObserver(checkScroll);
    observer.observe(el);
    return () => {
      el.removeEventListener('scroll', checkScroll);
      observer.disconnect();
    };
  }, [checkScroll, children]);

  const scroll = (direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = 276; // 260px card + 16px gap
    el.scrollBy({ left: direction === 'left' ? -cardWidth * 2 : cardWidth * 2, behavior: 'smooth' });
  };

  return (
    <div className="relative flex items-center gap-2">
      {/* Left arrow */}
      <button
        onClick={() => scroll('left')}
        disabled={!canScrollLeft}
        className={cn(
          'shrink-0 w-10 h-10 rounded-full border flex items-center justify-center transition-all',
          canScrollLeft
            ? 'bg-[#002a42] border-[#4A90C2]/40 text-[#8fc1e3] hover:text-white hover:border-[#D4AF37]/60 hover:bg-[#003B5C]'
            : 'bg-[#001a2c]/40 border-[#4A90C2]/10 text-[#4A90C2]/20 cursor-default'
        )}
        aria-label="Scroll left"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Scrollable container */}
      <div
        ref={scrollRef}
        className="flex-1 flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2 scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {children}
      </div>

      {/* Right arrow */}
      <button
        onClick={() => scroll('right')}
        disabled={!canScrollRight}
        className={cn(
          'shrink-0 w-10 h-10 rounded-full border flex items-center justify-center transition-all',
          canScrollRight
            ? 'bg-[#002a42] border-[#4A90C2]/40 text-[#8fc1e3] hover:text-white hover:border-[#D4AF37]/60 hover:bg-[#003B5C]'
            : 'bg-[#001a2c]/40 border-[#4A90C2]/10 text-[#4A90C2]/20 cursor-default'
        )}
        aria-label="Scroll right"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}

/** Expanded puzzle modal */
function PuzzleModal({
  result,
  onClose,
}: {
  result: ProphetPuzzleResult;
  onClose: () => void;
}) {
  const { displayName, arabicName, result: genResult } = result;
  const themeWordsPlaced = genResult?.stats.themeWordsPlaced || 0;
  const islamicPct = genResult?.stats.islamicPercentage || 0;
  const gridFillPct = genResult?.stats.gridFillPercentage || 0;

  const allKeywords = getKeywordsForProphet(result.prophetId);
  const placedWordSet = new Set(
    genResult?.placedWords.map(pw => pw.word.toUpperCase()) || []
  );

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative bg-[#003B5C] border border-[#4A90C2]/30 rounded-2xl shadow-2xl p-6 md:p-8 max-w-lg w-full mx-4"
        onClick={e => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-[#001a2c]/60 border border-[#4A90C2]/20 text-[#8fc1e3] hover:text-white hover:border-[#D4AF37]/50 flex items-center justify-center transition-all"
          aria-label="Close"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-[#D4AF37] font-serif font-bold text-xl">{displayName}</h2>
          {arabicName && <span className="text-[#8fc1e3] text-base">{arabicName}</span>}
        </div>

        {/* Large grid */}
        <div className="flex justify-center mb-5">
          {genResult && (
            <CrosswordGrid
              grid={toGeneratedPuzzleGrid(calculateCellNumbers(genResult.grid))}
              theme="dark"
              cellSize="md"
              showControls={false}
              showNumbers={false}
              showLetters={true}
              compact={true}
            />
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 mb-4 text-sm">
          <div>
            <span className="text-[#8fc1e3]">Islamic: </span>
            <span className={cn(
              'font-semibold',
              islamicPct >= 50 ? 'text-emerald-400' : islamicPct >= 25 ? 'text-[#D4AF37]' : 'text-red-400'
            )}>
              {islamicPct.toFixed(0)}%
            </span>
          </div>
          <div>
            <span className="text-[#8fc1e3]">Grid Fill: </span>
            <span className={cn(
              'font-semibold',
              gridFillPct >= 99 ? 'text-emerald-400' : 'text-orange-400'
            )}>
              {gridFillPct.toFixed(0)}%
            </span>
          </div>
          <div>
            <span className="text-[#8fc1e3]">Keywords: </span>
            <span className="text-white font-semibold">{themeWordsPlaced}</span>
          </div>
        </div>

        {/* All keyword pills */}
        <div className="flex flex-wrap gap-1.5">
          {allKeywords.map((kw, i) => {
            const isPlaced = placedWordSet.has(kw.word.toUpperCase());
            return (
              <span
                key={`${kw.word}-${i}`}
                className={cn(
                  'px-2 py-1 rounded text-xs font-mono',
                  isPlaced
                    ? 'bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30'
                    : 'bg-[#001a2c]/40 text-[#6ba8d4]/50 border border-[#4A90C2]/10'
                )}
              >
                {kw.word}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function PuzzleExplorerPage() {
  const [results, setResults] = useState<ProphetPuzzleResult[] | null>(null);
  const [expanded, setExpanded] = useState<ProphetPuzzleResult | null>(null);
  const hasStarted = useRef(false);

  // Generate all 25 prophets on mount in one batch
  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    // setTimeout lets the loading screen paint before we block on generation
    setTimeout(() => {
      const all = PROPHET_IDS.map(id => generateForProphet(id));
      setResults(all);
    }, 0);
  }, []);

  // Group results by themeWordsPlaced count
  const grouped = useMemo(() => {
    if (!results) return [];
    const map = new Map<number, ProphetPuzzleResult[]>();
    for (const r of results) {
      if (r.status !== 'success' && r.status !== 'failed') continue;
      const count = r.result?.stats.themeWordsPlaced || 0;
      if (!map.has(count)) map.set(count, []);
      map.get(count)!.push(r);
    }
    // Sort groups by keyword count descending
    return [...map.entries()].sort((a, b) => b[0] - a[0]);
  }, [results]);

  const isLoading = results === null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#001a2c] via-[#003B5C] to-[#002a42]">
      <AppHeader />

      <main className="container mx-auto px-4 md:px-6 py-6 md:py-8">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <svg className="w-8 h-8 text-[#D4AF37] animate-spin mb-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-[#8fc1e3] text-sm">Loading puzzles...</p>
          </div>
        ) : (
          <div className="space-y-8">
            {grouped.map(([keywordCount, puzzles]) => (
              <section key={keywordCount}>
                {/* Section Header */}
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-[#D4AF37] text-lg tracking-wider">
                    {stars(keywordCount)}
                  </span>
                  <h2 className="text-white font-serif text-base font-semibold">
                    {keywordCount} Keyword{keywordCount !== 1 ? 's' : ''}
                  </h2>
                  <span className="text-[#8fc1e3] text-sm">
                    ({puzzles.length} puzzle{puzzles.length !== 1 ? 's' : ''})
                  </span>
                </div>

                {/* Carousel */}
                <Carousel>
                  {puzzles.map(result => (
                    <PuzzleExplorerCard
                      key={result.prophetId}
                      result={result}
                      onExpand={setExpanded}
                    />
                  ))}
                </Carousel>
              </section>
            ))}
          </div>
        )}
      </main>

      {/* Expanded modal */}
      {expanded && (
        <PuzzleModal result={expanded} onClose={() => setExpanded(null)} />
      )}

      {/* Hide scrollbar globally for the carousels */}
      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
