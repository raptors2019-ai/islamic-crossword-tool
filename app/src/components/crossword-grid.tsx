'use client';

import { cn } from '@/lib/utils';
import { Cell } from '@/lib/types';

interface CrosswordGridProps {
  grid: Cell[][];
  onCellClick?: (row: number, col: number) => void;
  highlightedCells?: Set<string>;
  interactive?: boolean;
}

export function CrosswordGrid({
  grid,
  onCellClick,
  highlightedCells = new Set(),
  interactive = false,
}: CrosswordGridProps) {
  const rows = grid.length;
  const cols = grid[0]?.length || 0;

  return (
    <div
      className="inline-grid gap-0.5 bg-foreground p-0.5 rounded-sm"
      style={{
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
      }}
    >
      {grid.map((row, rowIndex) =>
        row.map((cell, colIndex) => {
          const key = `${rowIndex}-${colIndex}`;
          const isHighlighted = highlightedCells.has(key);

          return (
            <div
              key={key}
              onClick={() => onCellClick?.(rowIndex, colIndex)}
              className={cn(
                'w-9 h-9 flex items-center justify-center relative text-lg font-bold transition-colors',
                cell.isBlack
                  ? 'bg-foreground'
                  : cell.letter
                  ? 'bg-white text-primary'
                  : 'bg-muted/50',
                interactive && !cell.isBlack && 'cursor-pointer hover:bg-accent',
                isHighlighted && 'bg-yellow-100'
              )}
            >
              {cell.number && (
                <span className="absolute top-0.5 left-1 text-[9px] font-semibold text-muted-foreground">
                  {cell.number}
                </span>
              )}
              {cell.letter && <span>{cell.letter}</span>}
            </div>
          );
        })
      )}
    </div>
  );
}
