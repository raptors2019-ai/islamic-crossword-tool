'use client';

import { useState, useMemo, useCallback } from 'react';
import { useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { cn } from '@/lib/utils';
import {
  EditableCell,
  GRID_SIZE,
  calculateCellNumbers,
} from '@/lib/editable-grid';
import { getWordInfo } from '@/lib/word-detector';

type Difficulty = 'easy' | 'medium' | 'hard';

interface ClueWord {
  word: string;
  number: number;
  direction: 'across' | 'down';
  row: number;
  col: number;
}

interface AIClue {
  clue: string;
  type: string;
  islamic: boolean;
}

interface DifficultyClues {
  easy: string;
  medium: string;
  hard: string;
}

interface LiveClueEditorProps {
  cells: EditableCell[][];
  clues: Record<string, string>;
  onClueChange: (word: string, clue: string) => void;
  selectedWord?: string | null;
  onSelectWord?: (word: string | null) => void;
}

function detectClueWords(cells: EditableCell[][]): ClueWord[] {
  const numberedCells = calculateCellNumbers(cells);
  const words: ClueWord[] = [];

  // Find across words
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const cell = numberedCells[r][c];
      if (cell.isBlack) continue;

      const isStartAcross =
        (c === 0 || numberedCells[r][c - 1].isBlack) &&
        c + 1 < GRID_SIZE &&
        !numberedCells[r][c + 1].isBlack;

      if (isStartAcross && cell.letter) {
        let word = '';
        let col = c;
        while (col < GRID_SIZE && !numberedCells[r][col].isBlack) {
          if (numberedCells[r][col].letter) {
            word += numberedCells[r][col].letter;
          } else {
            break;
          }
          col++;
        }
        const slotEnd = col === GRID_SIZE || numberedCells[r][col].isBlack;
        if (slotEnd && word.length >= 2 && word.length === col - c) {
          words.push({
            word,
            number: cell.number || 0,
            direction: 'across',
            row: r,
            col: c,
          });
        }
      }
    }
  }

  // Find down words
  for (let c = 0; c < GRID_SIZE; c++) {
    for (let r = 0; r < GRID_SIZE; r++) {
      const cell = numberedCells[r][c];
      if (cell.isBlack) continue;

      const isStartDown =
        (r === 0 || numberedCells[r - 1][c].isBlack) &&
        r + 1 < GRID_SIZE &&
        !numberedCells[r + 1][c].isBlack;

      if (isStartDown && cell.letter) {
        let word = '';
        let row = r;
        while (row < GRID_SIZE && !numberedCells[row][c].isBlack) {
          if (numberedCells[row][c].letter) {
            word += numberedCells[row][c].letter;
          } else {
            break;
          }
          row++;
        }
        const slotEnd = row === GRID_SIZE || numberedCells[row][c].isBlack;
        if (slotEnd && word.length >= 2 && word.length === row - r) {
          words.push({
            word,
            number: cell.number || 0,
            direction: 'down',
            row: r,
            col: c,
          });
        }
      }
    }
  }

  return words;
}

export function LiveClueEditor({
  cells,
  clues,
  onClueChange,
  selectedWord,
  onSelectWord,
}: LiveClueEditorProps) {
  const [editingWord, setEditingWord] = useState<string | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<Record<string, Difficulty>>({});
  const [aiClues, setAiClues] = useState<Record<string, DifficultyClues>>({});
  const [loadingAI, setLoadingAI] = useState<string | null>(null);

  const generateClues = useAction(api.clueGeneration.generateClues);

  const detectedWords = useMemo(() => detectClueWords(cells), [cells]);

  const acrossWords = useMemo(
    () => detectedWords.filter((w) => w.direction === 'across').sort((a, b) => a.number - b.number),
    [detectedWords]
  );

  const downWords = useMemo(
    () => detectedWords.filter((w) => w.direction === 'down').sort((a, b) => a.number - b.number),
    [detectedWords]
  );

  const handleAskAI = useCallback(
    async (word: string) => {
      setLoadingAI(word);
      try {
        const result = await generateClues({
          word,
          existingClue: clues[word] || undefined,
        });

        if (result.clues && result.clues.length > 0) {
          // Categorize clues by difficulty based on type
          const easy = result.clues.find((c) => c.type === 'simple')?.clue
            || result.clues[0]?.clue || '';
          const medium = result.clues.find((c) => c.type === 'familiar_phrase' || c.type === 'idiom')?.clue
            || result.clues[1]?.clue || easy;
          const hard = result.clues.find((c) => c.type === 'sneaky' || c.type === 'analogy')?.clue
            || result.clues[2]?.clue || medium;

          setAiClues((prev) => ({
            ...prev,
            [word]: { easy, medium, hard },
          }));

          // Set to easy by default and apply it
          const currentDiff = selectedDifficulty[word] || 'easy';
          setSelectedDifficulty((prev) => ({ ...prev, [word]: currentDiff }));
          onClueChange(word, currentDiff === 'easy' ? easy : currentDiff === 'medium' ? medium : hard);
        }
      } catch (error) {
        console.error('Failed to generate clues:', error);
      } finally {
        setLoadingAI(null);
      }
    },
    [generateClues, clues, onClueChange, selectedDifficulty]
  );

  const handleDifficultyChange = useCallback(
    (word: string, difficulty: Difficulty) => {
      setSelectedDifficulty((prev) => ({ ...prev, [word]: difficulty }));
      const wordAiClues = aiClues[word];
      if (wordAiClues) {
        onClueChange(word, wordAiClues[difficulty]);
      }
    },
    [aiClues, onClueChange]
  );

  const renderWordItem = (word: ClueWord) => {
    const isEditing = editingWord === word.word;
    const isSelected = selectedWord === word.word;
    const dictInfo = getWordInfo(word.word);
    const currentClue = clues[word.word] || dictInfo?.clue || '';
    const isLoading = loadingAI === word.word;
    const category = dictInfo?.category;
    const wordAiClues = aiClues[word.word];
    const difficulty = selectedDifficulty[word.word] || 'easy';

    return (
      <div
        key={`${word.direction}-${word.number}-${word.word}`}
        className={cn(
          'px-3 py-2 rounded-lg transition-all border',
          isSelected
            ? 'bg-[#D4AF37]/20 border-[#D4AF37]/40'
            : 'bg-[#001a2c]/30 border-transparent hover:border-[#4A90C2]/30'
        )}
      >
        {/* Word header row */}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[#D4AF37] font-mono font-bold text-xs w-6">
            {word.number}{word.direction === 'across' ? 'A' : 'D'}
          </span>
          <button
            onClick={() => onSelectWord?.(isSelected ? null : word.word)}
            className="text-white font-bold tracking-wider group-hover:text-[#D4AF37] transition-colors"
          >
            {word.word}
          </button>
          <span className="text-[#6ba8d4] text-[10px]">({word.word.length})</span>
          {category && (
            <span className="ml-auto px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider bg-emerald-500/20 text-emerald-400">
              {category}
            </span>
          )}
        </div>

        {/* Clue row with AI button */}
        {isEditing ? (
          <div className="ml-6 mt-1">
            <input
              type="text"
              value={currentClue}
              onChange={(e) => onClueChange(word.word, e.target.value)}
              onBlur={() => setEditingWord(null)}
              onKeyDown={(e) => e.key === 'Enter' && setEditingWord(null)}
              className="w-full bg-[#001a2c]/60 border border-[#4A90C2]/30 rounded px-2 py-1 text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#4A90C2]/50"
              placeholder="Enter clue..."
              autoFocus
            />
          </div>
        ) : (
          <div className="ml-6 flex items-center gap-2">
            <span
              onClick={() => setEditingWord(word.word)}
              className={cn(
                'flex-1 text-sm cursor-pointer hover:text-[#D4AF37] transition-colors truncate',
                currentClue ? 'text-[#c0d8e8]' : 'text-[#6ba8d4] italic'
              )}
            >
              {currentClue || 'Click to add clue...'}
            </span>
            {!clues[word.word] && dictInfo?.clue && (
              <span className="text-[9px] text-[#6ba8d4]/50 shrink-0">dict</span>
            )}
            <button
              onClick={() => handleAskAI(word.word)}
              disabled={isLoading}
              className={cn(
                'shrink-0 p-1 rounded transition-colors',
                isLoading
                  ? 'text-violet-400 animate-pulse'
                  : 'text-[#6ba8d4] hover:text-violet-400 hover:bg-violet-500/10'
              )}
              title="Ask AI for clues"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                />
              </svg>
            </button>
          </div>
        )}

        {/* Difficulty tabs - only show when AI clues are available */}
        {wordAiClues && (
          <div className="ml-6 mt-2 flex gap-1">
            {(['easy', 'medium', 'hard'] as Difficulty[]).map((diff) => (
              <button
                key={diff}
                onClick={() => handleDifficultyChange(word.word, diff)}
                className={cn(
                  'px-2 py-0.5 rounded text-[10px] uppercase tracking-wider transition-colors',
                  difficulty === diff
                    ? diff === 'easy'
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : diff === 'medium'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : 'bg-[#001a2c]/40 text-[#6ba8d4] hover:text-white border border-transparent'
                )}
              >
                {diff}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (detectedWords.length === 0) {
    return (
      <div className="text-center py-6">
        <div className="w-12 h-12 mx-auto mb-3 rounded-lg bg-[#001a2c]/40 flex items-center justify-center">
          <svg className="w-6 h-6 text-[#6ba8d4]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </div>
        <p className="text-[#8fc1e3] text-sm">Add words to the grid to edit clues</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Across section */}
      {acrossWords.length > 0 && (
        <div>
          <h4 className="text-[#D4AF37] font-semibold mb-2 flex items-center gap-2 uppercase tracking-wider text-xs">
            <span>→</span> Across
          </h4>
          <div className="space-y-1">
            {acrossWords.map(renderWordItem)}
          </div>
        </div>
      )}

      {/* Down section */}
      {downWords.length > 0 && (
        <div>
          <h4 className="text-[#D4AF37] font-semibold mb-2 flex items-center gap-2 uppercase tracking-wider text-xs">
            <span>↓</span> Down
          </h4>
          <div className="space-y-1">
            {downWords.map(renderWordItem)}
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="pt-3 border-t border-[#4A90C2]/20 text-[10px] text-[#6ba8d4] flex justify-between">
        <span>{acrossWords.length + downWords.length} words</span>
        <span>{Object.keys(clues).filter((k) => clues[k]).length} clues</span>
      </div>
    </div>
  );
}
