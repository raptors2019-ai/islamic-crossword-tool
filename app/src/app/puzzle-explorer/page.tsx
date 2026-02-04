'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PuzzleExplorerCard } from '@/components/puzzle-explorer-card';
import {
  ProphetPuzzleResult,
  ExplorerSummary,
  SortOption,
  createPendingResult,
  generateForProphet,
  calculateSummary,
  sortResults,
  PROPHET_IDS,
} from '@/lib/puzzle-explorer-helpers';

export default function PuzzleExplorerPage() {
  const [results, setResults] = useState<ProphetPuzzleResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('theme-words');
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const abortRef = useRef(false);

  // Initialize results as pending
  const initializeResults = useCallback(() => {
    const initial = PROPHET_IDS.map(id => createPendingResult(id));
    setResults(initial);
    setCurrentIndex(0);
    return initial;
  }, []);

  // Generate all prophets sequentially with setTimeout for UI responsiveness
  const generateAll = useCallback(() => {
    abortRef.current = false;
    setIsRunning(true);
    const initial = initializeResults();

    let index = 0;

    function generateNext() {
      if (abortRef.current || index >= PROPHET_IDS.length) {
        setIsRunning(false);
        return;
      }

      const prophetId = PROPHET_IDS[index];
      setCurrentIndex(index);

      // Mark as generating
      setResults(prev =>
        prev.map(r =>
          r.prophetId === prophetId ? { ...r, status: 'generating' as const } : r
        )
      );

      // Use setTimeout to keep UI responsive
      setTimeout(() => {
        if (abortRef.current) {
          setIsRunning(false);
          return;
        }

        const result = generateForProphet(prophetId);

        setResults(prev =>
          prev.map(r => (r.prophetId === prophetId ? result : r))
        );

        index++;
        generateNext();
      }, 0);
    }

    generateNext();
  }, [initializeResults]);

  // Regenerate a single prophet
  const handleRegenerate = useCallback((prophetId: string) => {
    setRegeneratingId(prophetId);

    // Mark as generating
    setResults(prev =>
      prev.map(r =>
        r.prophetId === prophetId ? { ...r, status: 'generating' as const } : r
      )
    );

    setTimeout(() => {
      const result = generateForProphet(prophetId);
      setResults(prev =>
        prev.map(r => (r.prophetId === prophetId ? result : r))
      );
      setRegeneratingId(null);
    }, 0);
  }, []);

  // Abort generation on unmount
  useEffect(() => {
    return () => {
      abortRef.current = true;
    };
  }, []);

  // Sorted results
  const sortedResults = useMemo(() => sortResults(results, sortBy), [results, sortBy]);

  // Summary stats
  const summary = useMemo(() => calculateSummary(results), [results]);

  // Progress
  const completedCount = results.filter(r => r.status === 'success' || r.status === 'failed').length;
  const progressPct = results.length > 0 ? (completedCount / results.length) * 100 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#001a2c] via-[#003B5C] to-[#002a42]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#004d77]/60 backdrop-blur-md border-b border-[#4A90C2]/20">
        <div className="container mx-auto px-4 md:px-6 py-3 md:py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-[#8fc1e3] hover:text-white transition-colors text-sm flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Builder
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-gradient-to-br from-[#D4AF37] to-[#b8952f] flex items-center justify-center shadow-lg">
                <span className="text-lg md:text-xl">☪</span>
              </div>
              <div>
                <h1 className="text-white text-base md:text-lg tracking-wide font-serif font-semibold">
                  Puzzle Explorer
                </h1>
                <p className="text-[#8fc1e3] text-[10px] md:text-xs tracking-widest uppercase">
                  All 25 Prophets
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-6 py-6 md:py-8">
        {/* Controls Bar */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <Button
            onClick={isRunning ? () => { abortRef.current = true; } : generateAll}
            className={cn(
              'px-6 transition-all',
              isRunning
                ? 'bg-red-600 hover:bg-red-500 text-white'
                : 'bg-gradient-to-r from-[#D4AF37] to-[#b8952f] hover:from-[#e5c86b] hover:to-[#D4AF37] text-[#001a2c] font-bold shadow-lg shadow-[#D4AF37]/20'
            )}
          >
            {isRunning ? (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Stop ({completedCount}/{PROPHET_IDS.length})
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Generate All
              </>
            )}
          </Button>

          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger className="w-[180px] bg-[#002a42]/80 border-[#4A90C2]/30 text-white">
              <SelectValue placeholder="Sort by..." />
            </SelectTrigger>
            <SelectContent className="bg-[#002a42] border-[#4A90C2]/30">
              <SelectItem value="theme-words" className="text-white data-[highlighted]:bg-[#D4AF37] data-[highlighted]:text-[#001a2c]">
                Theme Words (Mastery)
              </SelectItem>
              <SelectItem value="islamic-pct" className="text-white data-[highlighted]:bg-[#D4AF37] data-[highlighted]:text-[#001a2c]">
                Islamic %
              </SelectItem>
              <SelectItem value="grid-fill" className="text-white data-[highlighted]:bg-[#D4AF37] data-[highlighted]:text-[#001a2c]">
                Grid Fill %
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Progress Bar */}
          {isRunning && (
            <div className="flex-1 min-w-[200px]">
              <div className="flex justify-between text-xs text-[#8fc1e3] mb-1">
                <span>Generating puzzles...</span>
                <span>{completedCount}/{PROPHET_IDS.length}</span>
              </div>
              <div className="h-2 bg-[#001a2c]/60 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#4A90C2] to-[#D4AF37] transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Summary Table */}
        {summary.completed > 0 && (
          <Card className="bg-[#004d77]/40 backdrop-blur-sm border-[#4A90C2]/20 mb-6 overflow-hidden">
            <CardContent className="p-4">
              <h2 className="text-[#D4AF37] text-sm font-semibold mb-3 uppercase tracking-wider">
                Summary
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div>
                  <div className="text-[#8fc1e3] text-xs">Completed</div>
                  <div className="text-white font-medium">
                    {summary.completed}/{summary.totalProphets}
                    {summary.failed > 0 && (
                      <span className="text-red-400 text-xs ml-1">({summary.failed} failed)</span>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-[#8fc1e3] text-xs">Avg Theme Words</div>
                  <div className="text-white font-medium">{summary.avgThemeWords}</div>
                </div>
                <div>
                  <div className="text-[#8fc1e3] text-xs">Avg Islamic %</div>
                  <div className={cn(
                    'font-medium',
                    summary.avgIslamicPct >= 50 ? 'text-emerald-400'
                      : summary.avgIslamicPct >= 25 ? 'text-[#D4AF37]'
                        : 'text-red-400'
                  )}>
                    {summary.avgIslamicPct}%
                  </div>
                </div>
                <div>
                  <div className="text-[#8fc1e3] text-xs">Best</div>
                  <div className="text-emerald-400 font-medium text-sm truncate">{summary.bestProphet}</div>
                </div>
                <div>
                  <div className="text-[#8fc1e3] text-xs">Needs Work</div>
                  <div className="text-orange-400 font-medium text-sm truncate">{summary.worstProphet}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Leaderboard Table */}
        {sortedResults.some(r => r.status === 'success') && (
          <Card className="bg-[#004d77]/40 backdrop-blur-sm border-[#4A90C2]/20 mb-6 overflow-hidden">
            <CardContent className="p-4">
              <h2 className="text-[#D4AF37] text-sm font-semibold mb-3 uppercase tracking-wider">
                Leaderboard
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-[#8fc1e3] border-b border-[#4A90C2]/20">
                      <th className="text-left py-2 px-2 font-medium">#</th>
                      <th className="text-left py-2 px-2 font-medium">Prophet</th>
                      <th className="text-right py-2 px-2 font-medium">Theme Words</th>
                      <th className="text-right py-2 px-2 font-medium">Islamic %</th>
                      <th className="text-right py-2 px-2 font-medium">Fill %</th>
                      <th className="text-center py-2 px-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedResults
                      .filter(r => r.status === 'success' || r.status === 'failed')
                      .map((r, i) => (
                        <tr
                          key={r.prophetId}
                          className="border-b border-[#4A90C2]/10 hover:bg-[#4A90C2]/10 transition-colors"
                        >
                          <td className="py-1.5 px-2 text-[#6ba8d4]">{i + 1}</td>
                          <td className="py-1.5 px-2 text-white font-medium">
                            {r.displayName}
                            {r.arabicName && (
                              <span className="text-[#8fc1e3] ml-1">{r.arabicName}</span>
                            )}
                          </td>
                          <td className="py-1.5 px-2 text-right text-white">
                            {r.result?.stats.themeWordsPlaced || 0}
                          </td>
                          <td className={cn(
                            'py-1.5 px-2 text-right',
                            (r.result?.stats.islamicPercentage || 0) >= 50 ? 'text-emerald-400'
                              : (r.result?.stats.islamicPercentage || 0) >= 25 ? 'text-[#D4AF37]'
                                : 'text-red-400'
                          )}>
                            {(r.result?.stats.islamicPercentage || 0).toFixed(0)}%
                          </td>
                          <td className={cn(
                            'py-1.5 px-2 text-right',
                            (r.result?.stats.gridFillPercentage || 0) >= 99 ? 'text-emerald-400' : 'text-orange-400'
                          )}>
                            {(r.result?.stats.gridFillPercentage || 0).toFixed(0)}%
                          </td>
                          <td className="py-1.5 px-2 text-center">
                            {r.status === 'success' ? (
                              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
                            ) : (
                              <span className="inline-block w-2 h-2 rounded-full bg-red-400" />
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Card Gallery */}
        {results.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sortedResults.map(result => (
              <PuzzleExplorerCard
                key={result.prophetId}
                result={result}
                onRegenerate={handleRegenerate}
                isRegenerating={regeneratingId === result.prophetId}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-[#004d77]/40 flex items-center justify-center">
              <svg className="w-10 h-10 text-[#D4AF37]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h2 className="text-white text-lg font-serif mb-2">Puzzle Explorer</h2>
            <p className="text-[#8fc1e3] text-sm mb-6 max-w-md mx-auto">
              Generate puzzles for all 25 prophets and compare them side by side.
              See which prophets have the best keyword coverage and puzzle quality.
            </p>
            <Button
              onClick={generateAll}
              className="bg-gradient-to-r from-[#D4AF37] to-[#b8952f] hover:from-[#e5c86b] hover:to-[#D4AF37] text-[#001a2c] font-bold px-8 shadow-lg shadow-[#D4AF37]/20 transition-all hover:scale-105"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Generate All Puzzles
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
