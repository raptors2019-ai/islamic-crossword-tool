'use client';

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { RotateCw, FlipHorizontal, FlipVertical, RotateCcw, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Cell } from '@/lib/types';
import { EditableCell } from '@/lib/editable-grid';

// Grid cell from generated puzzle (new format)
interface GridCell {
  type: 'empty' | 'black' | 'letter';
  solution?: string;
  number?: number;
}

// Support both old Cell type and new GridCell type
type AnyCell = GridCell | Cell;
type AnyGrid = AnyCell[][];

// Convert old Cell to new GridCell format
function normalizeCell(cell: AnyCell): GridCell {
  // Check if it's the old Cell type (has isBlack property)
  if ('isBlack' in cell) {
    const oldCell = cell as Cell;
    return {
      type: oldCell.isBlack ? 'black' : oldCell.letter ? 'letter' : 'empty',
      solution: oldCell.letter || undefined,
      number: oldCell.number || undefined,
    };
  }
  // Already in new format
  return cell as GridCell;
}

// Convert entire grid to normalized format
function normalizeGrid(grid: AnyGrid): GridCell[][] {
  return grid.map(row => row.map(normalizeCell));
}

// Clue for highlighting
interface Clue {
  number: number;
  clue: string;
  answer: string;
  row: number;
  col: number;
  length: number;
}

// Slot warning info for visual overlay
interface SlotWarningCell {
  row: number;
  col: number;
  isWarning: boolean;
  isSuggestedBlackBox: boolean;
}

interface CrosswordGridProps {
  grid: AnyGrid;
  clues?: {
    across: Clue[];
    down: Clue[];
  };
  // Visual customization
  theme?: 'classic' | 'modern' | 'newspaper' | 'dark' | 'neon';
  showControls?: boolean;
  showNumbers?: boolean;
  showLetters?: boolean;
  // Size options
  cellSize?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  compact?: boolean;
  // Interaction callbacks (deprecated: interactive prop)
  interactive?: boolean;
  onCellClick?: (row: number, col: number, cell: GridCell) => void;
  onClueSelect?: (direction: 'across' | 'down', number: number) => void;
  // Selected state (for external control)
  selectedCell?: { row: number; col: number } | null;
  highlightedClue?: { direction: 'across' | 'down'; number: number } | null;
  className?: string;
  // Edit mode props
  editable?: boolean;
  editableGrid?: EditableCell[][];
  editDirection?: 'across' | 'down';
  onCellChange?: (row: number, col: number, letter: string) => void;
  onCellToggleBlack?: (row: number, col: number) => void;
  onCellSelect?: (row: number, col: number) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  onContextMenu?: (e: React.MouseEvent, row: number, col: number) => void;
  // Slot validation props
  slotWarningCells?: SlotWarningCell[];
}

type Rotation = 0 | 90 | 180 | 270;

// Transform grid based on rotation and flips
function transformGrid(
  grid: GridCell[][],
  rotation: Rotation,
  flipH: boolean,
  flipV: boolean
): GridCell[][] {
  let result = grid.map(row => [...row]);

  // Apply rotation
  if (rotation === 90) {
    const rows = result.length;
    const cols = result[0]?.length || 0;
    const rotated: GridCell[][] = [];
    for (let c = 0; c < cols; c++) {
      rotated[c] = [];
      for (let r = rows - 1; r >= 0; r--) {
        rotated[c][rows - 1 - r] = result[r][c];
      }
    }
    result = rotated;
  } else if (rotation === 180) {
    result = result.reverse().map(row => [...row].reverse());
  } else if (rotation === 270) {
    const rows = result.length;
    const cols = result[0]?.length || 0;
    const rotated: GridCell[][] = [];
    for (let c = cols - 1; c >= 0; c--) {
      rotated[cols - 1 - c] = [];
      for (let r = 0; r < rows; r++) {
        rotated[cols - 1 - c][r] = result[r][c];
      }
    }
    result = rotated;
  }

  // Apply flips
  if (flipH) {
    result = result.map(row => [...row].reverse());
  }
  if (flipV) {
    result = result.reverse();
  }

  return result;
}

// Cell size configurations
const cellSizes = {
  xs: { cell: 'w-6 h-6', text: 'text-xs', number: 'text-[5px]' },
  sm: { cell: 'w-8 h-8', text: 'text-sm', number: 'text-[6px]' },
  md: { cell: 'w-10 h-10', text: 'text-base', number: 'text-[8px]' },
  lg: { cell: 'w-12 h-12', text: 'text-lg', number: 'text-[9px]' },
  xl: { cell: 'w-14 h-14', text: 'text-xl', number: 'text-[10px]' },
};

// Theme configurations with high-contrast black cells
const themes = {
  classic: {
    container: 'bg-black p-[2px]',
    letterCell: 'bg-white border border-gray-300',
    blackCell: 'bg-black',
    emptyCell: 'bg-gray-50 border border-gray-200',
    text: 'text-gray-900',
    number: 'text-gray-600',
    selectedCell: 'ring-2 ring-blue-500 ring-inset bg-blue-50',
    highlightedCell: 'bg-yellow-100',
    gap: 'gap-0',
    blackPattern: 'classic', // solid black
  },
  modern: {
    container: 'bg-slate-900 p-1 rounded-xl shadow-lg',
    letterCell: 'bg-white rounded shadow-sm',
    blackCell: 'bg-slate-900 rounded',
    emptyCell: 'bg-slate-100 rounded',
    text: 'text-slate-800',
    number: 'text-slate-500',
    selectedCell: 'ring-2 ring-indigo-500 ring-inset bg-indigo-50',
    highlightedCell: 'bg-indigo-100',
    gap: 'gap-[3px]',
    blackPattern: 'solid', // solid with rounded corners
  },
  newspaper: {
    container: 'bg-gray-900 p-[1px]',
    letterCell: 'bg-white border-r border-b border-gray-400',
    blackCell: 'bg-gray-900',
    emptyCell: 'bg-gray-100 border-r border-b border-gray-300',
    text: 'text-black font-serif',
    number: 'text-gray-700 font-serif',
    selectedCell: 'ring-2 ring-blue-600 ring-inset bg-blue-100',
    highlightedCell: 'bg-amber-100',
    gap: 'gap-0',
    blackPattern: 'newspaper', // solid black, tight grid
  },
  dark: {
    container: 'bg-gray-950 p-1 rounded-lg',
    letterCell: 'bg-gray-800 border border-gray-700 rounded-sm',
    blackCell: 'bg-gray-950 border border-gray-800 rounded-sm',
    emptyCell: 'bg-gray-900 border border-gray-800 rounded-sm',
    text: 'text-gray-100',
    number: 'text-gray-500',
    selectedCell: 'ring-2 ring-amber-400 ring-inset bg-gray-700',
    highlightedCell: 'bg-amber-900/40',
    gap: 'gap-[2px]',
    blackPattern: 'checkered', // subtle checkered pattern
  },
  neon: {
    container: 'bg-slate-950 p-1 rounded-xl',
    letterCell: 'bg-slate-900/90 rounded',
    blackCell: 'bg-slate-950 rounded',
    emptyCell: 'bg-slate-900/50 rounded',
    text: 'text-cyan-400',
    number: 'text-amber-400',
    selectedCell: 'ring-2 ring-cyan-400 ring-inset',
    highlightedCell: 'bg-cyan-900/30',
    gap: 'gap-[2px]',
    blackPattern: 'neon', // dark with subtle glow border
  },
};

// SVG patterns for black cells
const BlackCellPattern = ({ pattern, cellKey }: { pattern: string; cellKey: string }) => {
  switch (pattern) {
    case 'checkered':
      return (
        <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
          <pattern id={`check-${cellKey}`} width="6" height="6" patternUnits="userSpaceOnUse">
            <rect width="3" height="3" fill="white" />
            <rect x="3" y="3" width="3" height="3" fill="white" />
          </pattern>
          <rect width="100%" height="100%" fill={`url(#check-${cellKey})`} />
        </svg>
      );
    case 'diagonal':
      return (
        <svg className="absolute inset-0 w-full h-full opacity-15" xmlns="http://www.w3.org/2000/svg">
          <pattern id={`diag-${cellKey}`} width="6" height="6" patternUnits="userSpaceOnUse">
            <path d="M-1,1 l2,-2 M0,6 l6,-6 M5,7 l2,-2" stroke="white" strokeWidth="1" />
          </pattern>
          <rect width="100%" height="100%" fill={`url(#diag-${cellKey})`} />
        </svg>
      );
    case 'neon':
      return (
        <div
          className="absolute inset-[1px] rounded"
          style={{
            border: '1px solid rgba(100, 200, 255, 0.15)',
            boxShadow: 'inset 0 0 8px rgba(0, 150, 255, 0.1)'
          }}
        />
      );
    default:
      return null; // solid black, no pattern
  }
};

export function CrosswordGrid({
  grid,
  clues,
  theme = 'classic',
  showControls = true,
  showNumbers = true,
  showLetters = true,
  cellSize = 'md',
  compact = false,
  interactive = false,
  onCellClick,
  selectedCell,
  highlightedClue,
  className,
  // Edit mode props
  editable = false,
  editableGrid,
  editDirection = 'across',
  onCellChange,
  onCellToggleBlack,
  onCellSelect,
  onKeyDown,
  onContextMenu,
  slotWarningCells = [],
}: CrosswordGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState<Rotation>(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [zoom, setZoom] = useState(1);

  // Normalize grid to ensure consistent cell format
  const normalizedGrid = useMemo(() => normalizeGrid(grid), [grid]);

  // Transform grid based on current rotation and flip state
  const transformedGrid = useMemo(() => {
    return transformGrid(normalizedGrid, rotation, flipH, flipV);
  }, [normalizedGrid, rotation, flipH, flipV]);

  // Get cells that belong to highlighted clue
  const highlightedCells = useMemo(() => {
    if (!highlightedClue || !clues) return new Set<string>();

    const cells = new Set<string>();
    const clueList = highlightedClue.direction === 'across' ? clues.across : clues.down;
    const clue = clueList.find(c => c.number === highlightedClue.number);

    if (clue) {
      for (let i = 0; i < clue.length; i++) {
        const row = highlightedClue.direction === 'down' ? clue.row + i : clue.row;
        const col = highlightedClue.direction === 'across' ? clue.col + i : clue.col;
        cells.add(`${row}-${col}`);
      }
    }

    return cells;
  }, [highlightedClue, clues]);

  // Build warning and suggestion maps for quick lookup
  const warningCellMap = useMemo(() => {
    const map = new Map<string, { isWarning: boolean; isSuggestedBlackBox: boolean }>();
    for (const cell of slotWarningCells) {
      const key = `${cell.row}-${cell.col}`;
      map.set(key, { isWarning: cell.isWarning, isSuggestedBlackBox: cell.isSuggestedBlackBox });
    }
    return map;
  }, [slotWarningCells]);

  const handleRotateRight = useCallback(() => {
    setRotation(prev => ((prev + 90) % 360) as Rotation);
  }, []);

  const handleRotateLeft = useCallback(() => {
    setRotation(prev => ((prev - 90 + 360) % 360) as Rotation);
  }, []);

  const handleFlipH = useCallback(() => {
    setFlipH(prev => !prev);
  }, []);

  const handleFlipV = useCallback(() => {
    setFlipV(prev => !prev);
  }, []);

  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev + 0.25, 2));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev - 0.25, 0.5));
  }, []);

  const handleReset = useCallback(() => {
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    setZoom(1);
  }, []);

  const themeStyles = themes[theme];
  const sizeStyles = compact ? cellSizes.sm : cellSizes[cellSize];

  const handleCellClick = useCallback((row: number, col: number, cell: GridCell) => {
    if (onCellClick && cell.type === 'letter') {
      onCellClick(row, col, cell);
    }
  }, [onCellClick]);

  const isTransformed = rotation !== 0 || flipH || flipV;

  return (
    <div className={cn('flex flex-col items-center', className)}>
      {/* Controls */}
      {showControls && !compact && (
        <div className="flex items-center gap-1 mb-4 p-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg shadow-sm">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRotateLeft}
              title="Rotate Left (90°)"
              className="h-8 w-8 p-0 hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRotateRight}
              title="Rotate Right (90°)"
              className="h-8 w-8 p-0 hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <RotateCw className="h-4 w-4" />
            </Button>
          </div>

          <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1" />

          <div className="flex items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleFlipH}
              title="Flip Horizontal"
              className={cn(
                'h-8 w-8 p-0 hover:bg-gray-200 dark:hover:bg-gray-700',
                flipH && 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
              )}
            >
              <FlipHorizontal className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleFlipV}
              title="Flip Vertical"
              className={cn(
                'h-8 w-8 p-0 hover:bg-gray-200 dark:hover:bg-gray-700',
                flipV && 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
              )}
            >
              <FlipVertical className="h-4 w-4" />
            </Button>
          </div>

          <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1" />

          <div className="flex items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleZoomOut}
              title="Zoom Out"
              className="h-8 w-8 p-0 hover:bg-gray-200 dark:hover:bg-gray-700"
              disabled={zoom <= 0.5}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-xs text-gray-600 dark:text-gray-400 min-w-[3rem] text-center font-medium">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleZoomIn}
              title="Zoom In"
              className="h-8 w-8 p-0 hover:bg-gray-200 dark:hover:bg-gray-700"
              disabled={zoom >= 2}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>

          {isTransformed && (
            <>
              <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1" />
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                title="Reset View"
                className="h-8 px-2 text-xs font-medium hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                <Maximize2 className="h-3 w-3 mr-1" />
                Reset
              </Button>
            </>
          )}
        </div>
      )}

      {/* Grid Container */}
      <div
        ref={gridRef}
        className={cn(
          'overflow-auto max-w-full transition-transform duration-200',
          editable && 'outline-none'
        )}
        style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}
        tabIndex={editable ? 0 : undefined}
        onKeyDown={editable ? onKeyDown : undefined}
      >
        {/* Direction indicator for editable mode */}
        {editable && selectedCell && (
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-[#8fc1e3] text-xs uppercase tracking-wider">Direction:</span>
            <span className={cn(
              'px-2 py-1 rounded text-xs font-bold',
              editDirection === 'across'
                ? 'bg-[#D4AF37] text-[#001a2c]'
                : 'bg-[#4A90C2] text-white'
            )}>
              {editDirection === 'across' ? '→ Across' : '↓ Down'}
            </span>
            <span className="text-[#6ba8d4] text-xs">(Tab to toggle)</span>
          </div>
        )}

        <div className={cn('inline-grid', themeStyles.container, themeStyles.gap)}>
          {/* Use editable grid if in edit mode, otherwise use transformed grid */}
          {(editable && editableGrid ? editableGrid : transformedGrid).map((row, r) => (
            <div key={r} className={cn('flex', themeStyles.gap)}>
              {row.map((cellData, c) => {
                const cellKey = `${r}-${c}`;
                const isSelected = selectedCell?.row === r && selectedCell?.col === c;
                const isHighlighted = highlightedCells.has(cellKey);

                // Handle editable cells differently
                if (editable && editableGrid) {
                  const editCell = cellData as EditableCell;
                  const isBlack = editCell.isBlack;
                  const hasLetter = !!editCell.letter;
                  const isUserTyped = editCell.source === 'user';
                  const isAutoPlaced = editCell.source === 'auto';

                  // Check for slot warnings on this cell
                  const warningInfo = warningCellMap.get(cellKey);
                  const hasWarning = warningInfo?.isWarning && !isBlack;
                  const isSuggestedBlackBox = warningInfo?.isSuggestedBlackBox && !isBlack;

                  return (
                    <div
                      key={c}
                      onClick={() => {
                        if (!isBlack && onCellSelect) {
                          onCellSelect(r, c);
                        }
                      }}
                      onContextMenu={(e) => {
                        if (onContextMenu) {
                          onContextMenu(e, r, c);
                        }
                      }}
                      className={cn(
                        sizeStyles.cell,
                        'flex items-center justify-center font-bold relative transition-all duration-150 cursor-pointer',
                        // Cell type styling
                        isBlack && themeStyles.blackCell,
                        !isBlack && hasLetter && themeStyles.letterCell,
                        !isBlack && !hasLetter && 'bg-white/90 border border-gray-300 hover:bg-blue-50',
                        // Selection state
                        isSelected && !isBlack && 'ring-2 ring-[#D4AF37] ring-inset bg-[#D4AF37]/20',
                        // Warning state - orange highlight for invalid slots
                        hasWarning && !isSelected && 'ring-2 ring-orange-500 ring-inset bg-orange-500/10',
                        // Suggested black box - dashed red outline
                        isSuggestedBlackBox && !hasWarning && !isSelected && 'ring-2 ring-dashed ring-red-400 bg-red-500/5',
                        // User vs auto styling
                        isUserTyped && 'text-[#001a2c]',
                        isAutoPlaced && 'text-[#4A90C2]',
                        // Text styling
                        sizeStyles.text,
                      )}
                    >
                      {/* Black cell pattern overlay */}
                      {isBlack && themeStyles.blackPattern !== 'classic' && themeStyles.blackPattern !== 'solid' && themeStyles.blackPattern !== 'newspaper' && (
                        <BlackCellPattern pattern={themeStyles.blackPattern} cellKey={cellKey} />
                      )}

                      {/* Warning indicator dot */}
                      {hasWarning && (
                        <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-orange-500" />
                      )}

                      {/* Suggested black box indicator */}
                      {isSuggestedBlackBox && !hasWarning && (
                        <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-sm bg-red-400/60" />
                      )}

                      {/* Cell number */}
                      {showNumbers && editCell.number && (
                        <span
                          className={cn(
                            'absolute top-0.5 left-0.5 font-semibold leading-none text-gray-600',
                            sizeStyles.number,
                          )}
                        >
                          {editCell.number}
                        </span>
                      )}

                      {/* Letter */}
                      {showLetters && editCell.letter && (
                        <span className={cn(
                          'uppercase select-none',
                          isUserTyped && 'font-bold',
                          isAutoPlaced && 'font-normal opacity-80'
                        )}>
                          {editCell.letter}
                        </span>
                      )}

                      {/* Empty cell indicator when selected */}
                      {isSelected && !hasLetter && !isBlack && (
                        <span className="text-[#D4AF37]/50 animate-pulse">|</span>
                      )}
                    </div>
                  );
                }

                // Non-editable cell rendering (original behavior)
                const cell = cellData as GridCell;
                const isClickable = cell.type === 'letter' && (onCellClick || interactive);
                const isBlack = cell.type === 'black';

                return (
                  <div
                    key={c}
                    onClick={() => handleCellClick(r, c, cell)}
                    className={cn(
                      sizeStyles.cell,
                      'flex items-center justify-center font-bold relative transition-all duration-150',
                      // Cell type styling
                      cell.type === 'letter' && themeStyles.letterCell,
                      cell.type === 'black' && themeStyles.blackCell,
                      cell.type === 'empty' && themeStyles.emptyCell,
                      // Selection and highlight states
                      isSelected && themeStyles.selectedCell,
                      isHighlighted && !isSelected && cell.type === 'letter' && themeStyles.highlightedCell,
                      // Interactivity
                      isClickable && 'cursor-pointer hover:ring-2 hover:ring-blue-400 hover:ring-inset',
                      // Text styling
                      sizeStyles.text,
                      cell.type === 'letter' && themeStyles.text
                    )}
                    style={theme === 'neon' && cell.type === 'letter' ? {
                      textShadow: '0 0 8px rgba(0, 220, 255, 0.8)',
                      boxShadow: 'inset 0 0 15px rgba(0, 180, 255, 0.15), 0 0 1px rgba(0, 200, 255, 0.4)'
                    } : undefined}
                  >
                    {/* Black cell pattern overlay */}
                    {isBlack && themeStyles.blackPattern !== 'classic' && themeStyles.blackPattern !== 'solid' && themeStyles.blackPattern !== 'newspaper' && (
                      <BlackCellPattern pattern={themeStyles.blackPattern} cellKey={cellKey} />
                    )}

                    {/* Cell number */}
                    {showNumbers && cell.number && (
                      <span
                        className={cn(
                          'absolute top-0.5 left-0.5 font-semibold leading-none',
                          sizeStyles.number,
                          themeStyles.number
                        )}
                        style={theme === 'neon' ? { textShadow: '0 0 6px rgba(255, 200, 0, 0.8)' } : undefined}
                      >
                        {cell.number}
                      </span>
                    )}

                    {/* Letter */}
                    {showLetters && cell.type === 'letter' && cell.solution && (
                      <span className="uppercase select-none">{cell.solution}</span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Edit mode instructions */}
      {editable && (
        <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-xs text-[#8fc1e3]">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-[#001a2c] rounded border border-[#4A90C2]/30">Type</kbd>
            to fill letters
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-[#001a2c] rounded border border-[#4A90C2]/30">Tab</kbd>
            toggle direction
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-[#001a2c] rounded border border-[#4A90C2]/30">Right-click</kbd>
            toggle black cell
          </span>
        </div>
      )}

      {/* Transform indicator */}
      {showControls && !compact && isTransformed && (
        <div className="mt-3 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          {rotation !== 0 && (
            <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">
              Rotated {rotation}°
            </span>
          )}
          {flipH && (
            <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">
              Flipped H
            </span>
          )}
          {flipV && (
            <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">
              Flipped V
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// Simplified grid for preview/thumbnail
export function CrosswordGridPreview({
  grid,
  className,
}: {
  grid: GridCell[][];
  className?: string;
}) {
  return (
    <div className={cn('inline-grid gap-px bg-gray-800 p-0.5 rounded', className)}>
      {grid.map((row, r) => (
        <div key={r} className="flex gap-px">
          {row.map((cell, c) => (
            <div
              key={c}
              className={cn(
                'w-2 h-2',
                cell.type === 'letter' && 'bg-white',
                cell.type === 'black' && 'bg-gray-900',
                cell.type === 'empty' && 'bg-gray-300'
              )}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// Mini grid for icons/badges
export function CrosswordGridMini({
  grid,
  size = 3,
  className,
}: {
  grid: GridCell[][];
  size?: number;
  className?: string;
}) {
  // Sample the grid to fit in size x size
  const rows = grid.length;
  const cols = grid[0]?.length || 0;
  const rowStep = Math.ceil(rows / size);
  const colStep = Math.ceil(cols / size);

  const sampledGrid: GridCell[][] = [];
  for (let r = 0; r < size && r * rowStep < rows; r++) {
    sampledGrid[r] = [];
    for (let c = 0; c < size && c * colStep < cols; c++) {
      sampledGrid[r][c] = grid[r * rowStep][c * colStep];
    }
  }

  return (
    <div className={cn('inline-grid gap-[1px] bg-gray-700 p-[1px] rounded-sm', className)}>
      {sampledGrid.map((row, r) => (
        <div key={r} className="flex gap-[1px]">
          {row.map((cell, c) => (
            <div
              key={c}
              className={cn(
                'w-1.5 h-1.5',
                cell.type === 'letter' && 'bg-white',
                cell.type === 'black' && 'bg-gray-900',
                cell.type === 'empty' && 'bg-gray-400'
              )}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export default CrosswordGrid;
