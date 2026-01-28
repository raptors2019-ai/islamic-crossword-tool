'use client';

import { PuzzleStatistics } from '@/lib/types';
import { cn } from '@/lib/utils';

interface PuzzleStatsProps {
  statistics: PuzzleStatistics;
  className?: string;
  compact?: boolean;
}

/**
 * Get connectivity rating based on score.
 * Inspired by Crosserville's Grid Flow metric.
 * NYT averages: Mon-Thu ~28, Fri-Sat ~47, Sun ~35
 */
function getConnectivityRating(score: number): {
  label: string;
  dots: number;
  color: string;
} {
  if (score >= 50) {
    return { label: 'Excellent', dots: 5, color: 'text-green-400' };
  } else if (score >= 40) {
    return { label: 'Very Good', dots: 4, color: 'text-green-400' };
  } else if (score >= 30) {
    return { label: 'Good', dots: 3, color: 'text-[#4A90C2]' };
  } else if (score >= 20) {
    return { label: 'Fair', dots: 2, color: 'text-[#D4AF37]' };
  } else {
    return { label: 'Low', dots: 1, color: 'text-red-400' };
  }
}

/**
 * Progress bar component
 */
function ProgressBar({
  value,
  max = 100,
  className,
  barClassName,
}: {
  value: number;
  max?: number;
  className?: string;
  barClassName?: string;
}) {
  const percentage = Math.min(100, (value / max) * 100);

  return (
    <div className={cn('w-full bg-[#003B5C] rounded-full h-2', className)}>
      <div
        className={cn('rounded-full h-2 transition-all duration-300', barClassName || 'bg-[#4A90C2]')}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

/**
 * Connectivity dots indicator
 */
function ConnectivityDots({ filled, total = 5 }: { filled: number; total?: number }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'w-2 h-2 rounded-full transition-colors',
            i < filled ? 'bg-[#4A90C2]' : 'bg-[#003B5C]'
          )}
        />
      ))}
    </div>
  );
}

export function PuzzleStats({ statistics, className, compact = false }: PuzzleStatsProps) {
  const connectivity = getConnectivityRating(statistics.gridConnectivity);

  if (compact) {
    return (
      <div className={cn('bg-[#004d77]/30 rounded-xl p-3', className)}>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-[#8fc1e3]">Fill: </span>
            <span className="text-white font-medium">{statistics.gridFillPercentage}%</span>
          </div>
          <div>
            <span className="text-[#8fc1e3]">Words: </span>
            <span className="text-white font-medium">
              {statistics.placedWordCount}/{statistics.totalWordCount}
            </span>
          </div>
          <div>
            <span className="text-[#8fc1e3]">Crossings: </span>
            <span className="text-white font-medium">{statistics.totalIntersections}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[#8fc1e3]">Flow: </span>
            <ConnectivityDots filled={connectivity.dots} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('bg-[#004d77]/30 rounded-xl p-4', className)}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">📊</span>
        <h3 className="text-white font-semibold">Puzzle Statistics</h3>
      </div>

      <div className="space-y-4">
        {/* Grid Fill */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[#b3d4ed] text-sm">Grid Fill</span>
            <span className="text-white font-medium text-sm">{statistics.gridFillPercentage}%</span>
          </div>
          <ProgressBar
            value={statistics.gridFillPercentage}
            barClassName={
              statistics.gridFillPercentage >= 70
                ? 'bg-green-400'
                : statistics.gridFillPercentage >= 50
                ? 'bg-[#4A90C2]'
                : 'bg-[#D4AF37]'
            }
          />
        </div>

        {/* Words Placed */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[#b3d4ed] text-sm">Words Placed</span>
            <span className="text-white font-medium text-sm">
              {statistics.placedWordCount}/{statistics.totalWordCount}
              <span className="text-[#8fc1e3] ml-1">({statistics.wordPlacementRate}%)</span>
            </span>
          </div>
          <ProgressBar
            value={statistics.placedWordCount}
            max={statistics.totalWordCount}
            barClassName={
              statistics.wordPlacementRate >= 80
                ? 'bg-green-400'
                : statistics.wordPlacementRate >= 60
                ? 'bg-[#4A90C2]'
                : 'bg-[#D4AF37]'
            }
          />
        </div>

        {/* Intersections */}
        <div className="flex items-center justify-between">
          <span className="text-[#b3d4ed] text-sm">Intersections</span>
          <div className="text-right">
            <span className="text-white font-medium text-sm">{statistics.totalIntersections} total</span>
            <span className="text-[#8fc1e3] text-sm ml-2">
              ({statistics.avgIntersectionsPerWord} avg/word)
            </span>
          </div>
        </div>

        {/* Connectivity / Grid Flow */}
        <div className="flex items-center justify-between">
          <span className="text-[#b3d4ed] text-sm">Grid Flow</span>
          <div className="flex items-center gap-2">
            <ConnectivityDots filled={connectivity.dots} />
            <span className={cn('text-sm font-medium', connectivity.color)}>
              {connectivity.label}
            </span>
            <span className="text-[#6ba8d4] text-xs">({statistics.gridConnectivity})</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PuzzleStats;
