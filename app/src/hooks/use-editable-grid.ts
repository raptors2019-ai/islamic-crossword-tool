'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  EditableGrid,
  EditableCell,
  createEditableGrid,
  setLetter,
  toggleBlack,
  clearCell,
  getNextCell,
  getPrevCell,
  getCellInDirection,
  getCurrentWordPattern,
  GRID_SIZE,
} from '@/lib/editable-grid';
import { buildWordIndex, WordIndex } from '@/lib/word-index';
import { ALL_WORDS_2_5 } from '@/lib/word-list-full';
import {
  SlotValidation,
  validateAllSlots,
  validatePerpendicularSlots,
} from '@/lib/perpendicular-validator';

export interface UseEditableGridReturn {
  grid: EditableGrid;
  cells: EditableCell[][];
  selectedCell: { row: number; col: number } | null;
  direction: 'across' | 'down';
  currentPattern: { pattern: string; startRow: number; startCol: number; length: number } | null;

  // Slot validation state
  slotWarnings: SlotValidation[];
  wordIndex: WordIndex;

  // Actions
  selectCell: (row: number, col: number) => void;
  typeLetter: (letter: string) => void;
  deleteLetter: () => void;
  toggleBlackCell: (row: number, col: number) => void;
  toggleDirection: () => void;
  moveSelection: (key: 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight') => void;
  setCells: (cells: EditableCell[][]) => void;
  clearGrid: () => void;
  validateCurrentSlots: () => void;

  // Keyboard handler for attaching to grid element
  handleKeyDown: (e: React.KeyboardEvent) => void;
  handleContextMenu: (e: React.MouseEvent, row: number, col: number) => void;
}

export function useEditableGrid(): UseEditableGridReturn {
  const [grid, setGrid] = useState<EditableGrid>(createEditableGrid);
  const [slotWarnings, setSlotWarnings] = useState<SlotValidation[]>([]);
  const lastTypedRef = useRef<number>(0);
  const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Build word index once at startup (memoized)
  const wordIndex = useMemo(() => buildWordIndex(ALL_WORDS_2_5), []);

  // Compute current word pattern based on selection
  const currentPattern = grid.selectedCell
    ? getCurrentWordPattern(
        grid.cells,
        grid.selectedCell.row,
        grid.selectedCell.col,
        grid.direction
      )
    : null;

  const selectCell = useCallback((row: number, col: number) => {
    if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) return;

    setGrid(prev => {
      // If clicking the same cell, toggle direction
      if (prev.selectedCell?.row === row && prev.selectedCell?.col === col) {
        return {
          ...prev,
          direction: prev.direction === 'across' ? 'down' : 'across',
        };
      }
      return {
        ...prev,
        selectedCell: { row, col },
      };
    });
  }, []);

  const typeLetter = useCallback((letter: string) => {
    const upperLetter = letter.toUpperCase();
    if (!/^[A-Z]$/.test(upperLetter)) return;

    setGrid(prev => {
      if (!prev.selectedCell) return prev;

      const { row, col } = prev.selectedCell;
      if (prev.cells[row][col].isBlack) return prev;

      const newCells = setLetter(prev.cells, row, col, upperLetter, 'user');
      const nextCell = getNextCell(row, col, prev.direction, newCells);

      return {
        ...prev,
        cells: newCells,
        selectedCell: nextCell || prev.selectedCell,
      };
    });

    lastTypedRef.current = Date.now();
  }, []);

  const deleteLetter = useCallback(() => {
    setGrid(prev => {
      if (!prev.selectedCell) return prev;

      const { row, col } = prev.selectedCell;
      const cell = prev.cells[row][col];

      // If current cell has a letter, clear it and stay
      if (cell.letter && !cell.isBlack) {
        return {
          ...prev,
          cells: clearCell(prev.cells, row, col),
        };
      }

      // Otherwise, move back and clear that cell
      const prevCell = getPrevCell(row, col, prev.direction, prev.cells);
      if (prevCell) {
        return {
          ...prev,
          cells: clearCell(prev.cells, prevCell.row, prevCell.col),
          selectedCell: prevCell,
        };
      }

      return prev;
    });
  }, []);

  const toggleBlackCell = useCallback((row: number, col: number) => {
    setGrid(prev => ({
      ...prev,
      cells: toggleBlack(prev.cells, row, col),
    }));
  }, []);

  const toggleDirection = useCallback(() => {
    setGrid(prev => ({
      ...prev,
      direction: prev.direction === 'across' ? 'down' : 'across',
    }));
  }, []);

  const moveSelection = useCallback((key: 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight') => {
    setGrid(prev => {
      if (!prev.selectedCell) {
        // If no selection, select the first non-black cell
        for (let r = 0; r < GRID_SIZE; r++) {
          for (let c = 0; c < GRID_SIZE; c++) {
            if (!prev.cells[r][c].isBlack) {
              return { ...prev, selectedCell: { row: r, col: c } };
            }
          }
        }
        return prev;
      }

      const nextCell = getCellInDirection(
        prev.selectedCell.row,
        prev.selectedCell.col,
        key,
        prev.cells
      );

      if (nextCell) {
        return { ...prev, selectedCell: nextCell };
      }

      return prev;
    });
  }, []);

  const setCells = useCallback((cells: EditableCell[][]) => {
    setGrid(prev => ({ ...prev, cells }));
  }, []);

  const clearGrid = useCallback(() => {
    setGrid(createEditableGrid());
    setSlotWarnings([]);
  }, []);

  // Validate all slots and set warnings
  const validateCurrentSlots = useCallback(() => {
    const validations = validateAllSlots(grid.cells, wordIndex);
    const warnings = validations.filter(v => !v.isValid);
    setSlotWarnings(warnings);
  }, [grid.cells, wordIndex]);

  // Debounced validation - triggers after typing stops
  const scheduleValidation = useCallback(() => {
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
    }
    validationTimeoutRef.current = setTimeout(() => {
      validateCurrentSlots();
    }, 500); // Wait 500ms after last action
  }, [validateCurrentSlots]);

  // Validate when grid changes (debounced)
  useEffect(() => {
    scheduleValidation();
    return () => {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
    };
  }, [grid.cells, scheduleValidation]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Handle letter input
    if (e.key.length === 1 && /^[a-zA-Z]$/.test(e.key)) {
      e.preventDefault();
      typeLetter(e.key);
      return;
    }

    // Handle special keys
    switch (e.key) {
      case 'Backspace':
      case 'Delete':
        e.preventDefault();
        deleteLetter();
        break;
      case 'Tab':
        e.preventDefault();
        toggleDirection();
        break;
      case 'ArrowUp':
      case 'ArrowDown':
      case 'ArrowLeft':
      case 'ArrowRight':
        e.preventDefault();
        moveSelection(e.key as 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight');
        break;
      case 'Escape':
        e.preventDefault();
        setGrid(prev => ({ ...prev, selectedCell: null }));
        break;
    }
  }, [typeLetter, deleteLetter, toggleDirection, moveSelection]);

  const handleContextMenu = useCallback((e: React.MouseEvent, row: number, col: number) => {
    e.preventDefault();
    toggleBlackCell(row, col);
  }, [toggleBlackCell]);

  return {
    grid,
    cells: grid.cells,
    selectedCell: grid.selectedCell,
    direction: grid.direction,
    currentPattern,
    slotWarnings,
    wordIndex,
    selectCell,
    typeLetter,
    deleteLetter,
    toggleBlackCell,
    toggleDirection,
    moveSelection,
    setCells,
    clearGrid,
    validateCurrentSlots,
    handleKeyDown,
    handleContextMenu,
  };
}

export default useEditableGrid;
