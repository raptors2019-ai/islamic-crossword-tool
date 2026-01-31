'use client';

import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { EditableCell, GRID_SIZE } from '@/lib/editable-grid';
import { ThemeWord } from '@/lib/types';

interface SlotInfo {
  length: number;
  count: number;
  direction: 'across' | 'down';
  positions: { row: number; col: number }[];
}

interface SlotStatsProps {
  cells: EditableCell[][];
  themeWords: ThemeWord[];
  className?: string;
}

/**
 * Analyze the grid to find available word slots
 */
function analyzeSlots(cells: EditableCell[][]): SlotInfo[] {
  const slots: SlotInfo[] = [];

  // Find across slots
  for (let row = 0; row < GRID_SIZE; row++) {
    let col = 0;
    while (col < GRID_SIZE) {
      // Skip black cells
      if (cells[row][col].isBlack) {
        col++;
        continue;
      }

      // Find the start of a potential slot
      const startCol = col;
      let length = 0;

      // Count consecutive non-black cells
      while (col < GRID_SIZE && !cells[row][col].isBlack) {
        length++;
        col++;
      }

      // Only count slots of length 2 or more
      if (length >= 2) {
        slots.push({
          length,
          count: 1,
          direction: 'across',
          positions: [{ row, col: startCol }],
        });
      }
    }
  }

  // Find down slots
  for (let col = 0; col < GRID_SIZE; col++) {
    let row = 0;
    while (row < GRID_SIZE) {
      // Skip black cells
      if (cells[row][col].isBlack) {
        row++;
        continue;
      }

      // Find the start of a potential slot
      const startRow = row;
      let length = 0;

      // Count consecutive non-black cells
      while (row < GRID_SIZE && !cells[row][col].isBlack) {
        length++;
        row++;
      }

      // Only count slots of length 2 or more
      if (length >= 2) {
        slots.push({
          length,
          count: 1,
          direction: 'down',
          positions: [{ row: startRow, col }],
        });
      }
    }
  }

  return slots;
}

/**
 * Group slots by length
 */
function groupSlotsByLength(slots: SlotInfo[]): Map<number, { across: number; down: number }> {
  const grouped = new Map<number, { across: number; down: number }>();

  for (const slot of slots) {
    const existing = grouped.get(slot.length) || { across: 0, down: 0 };
    if (slot.direction === 'across') {
      existing.across++;
    } else {
      existing.down++;
    }
    grouped.set(slot.length, existing);
  }

  return grouped;
}

/**
 * Group theme words by length
 */
function groupWordsByLength(words: ThemeWord[]): Map<number, ThemeWord[]> {
  const grouped = new Map<number, ThemeWord[]>();

  for (const word of words) {
    const length = word.activeSpelling.length;
    const existing = grouped.get(length) || [];
    existing.push(word);
    grouped.set(length, existing);
  }

  return grouped;
}

export function SlotStats({ cells, themeWords, className }: SlotStatsProps) {
  const slots = useMemo(() => analyzeSlots(cells), [cells]);
  const slotsByLength = useMemo(() => groupSlotsByLength(slots), [slots]);
  const wordsByLength = useMemo(() => groupWordsByLength(themeWords), [themeWords]);

  // Get all unique lengths, sorted descending
  const allLengths = useMemo(() => {
    const lengths = new Set<number>();
    slotsByLength.forEach((_, length) => lengths.add(length));
    wordsByLength.forEach((_, length) => lengths.add(length));
    return Array.from(lengths).sort((a, b) => b - a);
  }, [slotsByLength, wordsByLength]);

  if (allLengths.length === 0) {
    return null;
  }

  return (
    <Card className={cn('bg-[#004d77]/40 backdrop-blur-sm border-[#4A90C2]/20 overflow-hidden', className)}>
      <CardContent className="p-4">
        <h3 className="text-[#D4AF37] text-sm font-semibold mb-3 uppercase tracking-wider">
          Word Slots
        </h3>

        <div className="space-y-3">
          {/* Slot availability */}
          <div>
            <h4 className="text-[#8fc1e3] text-xs mb-2 uppercase tracking-wider">Available Slots</h4>
            <div className="grid grid-cols-2 gap-2">
              {allLengths.map(length => {
                const slotInfo = slotsByLength.get(length) || { across: 0, down: 0 };
                const total = slotInfo.across + slotInfo.down;
                const wordsOfLength = wordsByLength.get(length)?.length || 0;
                const hasMatch = wordsOfLength > 0 && total > 0;
                const hasExcess = wordsOfLength > total;

                return (
                  <div
                    key={length}
                    className={cn(
                      'px-2 py-1.5 rounded text-xs',
                      hasMatch && !hasExcess && 'bg-emerald-500/20 border border-emerald-500/30',
                      hasExcess && 'bg-amber-500/20 border border-amber-500/30',
                      !hasMatch && total > 0 && 'bg-[#001a2c]/40 border border-[#4A90C2]/20',
                      total === 0 && 'bg-red-500/20 border border-red-500/30'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-white font-mono font-bold">{length}-letter</span>
                      <span className={cn(
                        'font-medium',
                        total > 0 ? 'text-white' : 'text-red-400'
                      )}>
                        {total}
                      </span>
                    </div>
                    {total > 0 && (
                      <div className="text-[#6ba8d4] text-[10px] mt-0.5">
                        {slotInfo.across > 0 && <span>{slotInfo.across} across</span>}
                        {slotInfo.across > 0 && slotInfo.down > 0 && <span>, </span>}
                        {slotInfo.down > 0 && <span>{slotInfo.down} down</span>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* User's words by length */}
          {themeWords.length > 0 && (
            <div>
              <h4 className="text-[#8fc1e3] text-xs mb-2 uppercase tracking-wider">Your Words</h4>
              <div className="space-y-1.5">
                {allLengths.map(length => {
                  const words = wordsByLength.get(length);
                  if (!words || words.length === 0) return null;

                  const slotInfo = slotsByLength.get(length) || { across: 0, down: 0 };
                  const slotsAvailable = slotInfo.across + slotInfo.down;
                  const canFit = slotsAvailable >= words.length;

                  return (
                    <div key={length} className="flex items-center gap-2">
                      <span className={cn(
                        'text-xs font-mono px-1.5 py-0.5 rounded',
                        canFit
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-red-500/20 text-red-400'
                      )}>
                        {length}
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {words.map(word => (
                          <span
                            key={word.id}
                            className="text-xs text-white bg-[#001a2c]/60 px-1.5 py-0.5 rounded"
                          >
                            {word.activeSpelling}
                          </span>
                        ))}
                      </div>
                      {!canFit && (
                        <span className="text-red-400 text-[10px]">
                          ({words.length - slotsAvailable} won&apos;t fit)
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Summary */}
          <div className="pt-2 border-t border-[#4A90C2]/20">
            <div className="flex justify-between text-xs">
              <span className="text-[#8fc1e3]">Total slots:</span>
              <span className="text-white font-medium">{slots.length}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-[#8fc1e3]">Your words:</span>
              <span className="text-white font-medium">{themeWords.length}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
