'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ThemeWord } from '@/lib/types';
import { useMemo } from 'react';

interface IslamicPercentBadgeProps {
  words: ThemeWord[];
  minPercentage?: number;
  className?: string;
  showIcon?: boolean;
}

/**
 * Badge that displays the percentage of Islamic words in a word list.
 * Shows green when >= minPercentage (default 50%), red otherwise.
 */
export function IslamicPercentBadge({
  words,
  minPercentage = 50,
  className,
  showIcon = true,
}: IslamicPercentBadgeProps) {
  const { percentage, isValid } = useMemo(() => {
    if (words.length === 0) {
      return { percentage: 0, isValid: false };
    }

    // Count Islamic words based on category
    const islamicCategories = new Set([
      'prophets',
      'names-of-allah',
      'quran',
      'companions',
      'general',
    ]);

    const islamicCount = words.filter((w) =>
      w.category && islamicCategories.has(w.category)
    ).length;

    // Also count words without category as Islamic if they came from the sample data
    // (since all sample data is Islamic-themed)
    const uncategorizedCount = words.filter((w) => !w.category).length;

    // For uncategorized words, assume they're Islamic if they're from sample data
    // (id starts with 'ps-', 'iw-', or 'na-')
    const likelyIslamicUncategorized = words.filter(
      (w) =>
        !w.category &&
        (w.id.startsWith('ps-') || w.id.startsWith('iw-') || w.id.startsWith('na-'))
    ).length;

    const totalIslamic = islamicCount + likelyIslamicUncategorized;
    const pct = Math.round((totalIslamic / words.length) * 100);

    return {
      percentage: pct,
      isValid: pct >= minPercentage,
    };
  }, [words, minPercentage]);

  if (words.length === 0) {
    return (
      <Badge
        className={cn('px-3 py-1 bg-gray-500 text-white', className)}
      >
        No words
      </Badge>
    );
  }

  return (
    <Badge
      className={cn(
        'px-3 py-1',
        isValid ? 'bg-green-600 text-white' : 'bg-red-500 text-white',
        className
      )}
    >
      {percentage}% Islamic {showIcon && (isValid ? '✓' : '⚠')}
    </Badge>
  );
}

/**
 * Calculate Islamic word percentage from a list of theme words.
 * Useful when you need just the number without the badge.
 */
export function calculateIslamicPercentage(words: ThemeWord[]): number {
  if (words.length === 0) return 0;

  const islamicCategories = new Set([
    'prophets',
    'names-of-allah',
    'quran',
    'companions',
    'general',
  ]);

  const islamicCount = words.filter((w) =>
    w.category && islamicCategories.has(w.category)
  ).length;

  const likelyIslamicUncategorized = words.filter(
    (w) =>
      !w.category &&
      (w.id.startsWith('ps-') || w.id.startsWith('iw-') || w.id.startsWith('na-'))
  ).length;

  const totalIslamic = islamicCount + likelyIslamicUncategorized;
  return Math.round((totalIslamic / words.length) * 100);
}
