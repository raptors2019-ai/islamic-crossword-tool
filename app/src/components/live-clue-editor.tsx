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
import { findMatchingWords, WordSuggestion } from '@/lib/constraint-suggester';
import { ClueOptionsPopover } from './clue-options-popover';

type Difficulty = 'easy' | 'medium' | 'hard';

interface ClueOptions {
  easy: string[];
  medium: string[];
  hard: string[];
}

interface ClueWord {
  word: string;
  number: number;
  direction: 'across' | 'down';
  row: number;
  col: number;
}

interface DifficultyClues {
  easy: string;
  medium: string;
  hard: string;
  options?: ClueOptions;
}

interface LiveClueEditorProps {
  cells: EditableCell[][];
  clues: Record<string, DifficultyClues>;
  selectedDifficulties: Record<string, Difficulty>;
  onClueChange: (word: string, difficulty: Difficulty, clue: string) => void;
  onDifficultyChange: (word: string, difficulty: Difficulty) => void;
  onClueOptionsUpdate?: (word: string, options: ClueOptions) => void;
  onSwapWord?: (oldWord: string, newWord: string, newClue: string, row: number, col: number, direction: 'across' | 'down') => void;
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
  selectedDifficulties,
  onClueChange,
  onDifficultyChange,
  onClueOptionsUpdate,
  onSwapWord,
  selectedWord,
  onSelectWord,
}: LiveClueEditorProps) {
  const [editingWord, setEditingWord] = useState<string | null>(null);
  const [editingDifficulty, setEditingDifficulty] = useState<Difficulty | null>(null);
  const [loadingAI, setLoadingAI] = useState<string | null>(null);
  const [showAlternatives, setShowAlternatives] = useState<string | null>(null);

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
        const result = await generateClues({ word });
        console.log('[AI Clues] Raw result for', word, ':', result);

        // API now returns arrays of clue options
        const hasOptions = result.easy.length > 0 || result.medium.length > 0 || result.hard.length > 0;
        console.log('[AI Clues] hasOptions:', hasOptions);

        if (hasOptions) {
          // Store all options for the popover
          const options: ClueOptions = {
            easy: result.easy,
            medium: result.medium,
            hard: result.hard,
          };
          console.log('[AI Clues] Storing options:', options);

          if (onClueOptionsUpdate) {
            onClueOptionsUpdate(word, options);
          } else {
            // Fallback: just set the first option as the selected clue
            if (result.easy[0]) onClueChange(word, 'easy', result.easy[0]);
            if (result.medium[0]) onClueChange(word, 'medium', result.medium[0]);
            if (result.hard[0]) onClueChange(word, 'hard', result.hard[0]);
          }
        } else if (result.error) {
          console.error('[AI Clues] API error:', result.error);
        }
      } catch (error) {
        console.error('Failed to generate clues:', error);
      } finally {
        setLoadingAI(null);
      }
    },
    [generateClues, onClueChange, onClueOptionsUpdate]
  );

  const handleStartEdit = (word: string, difficulty: Difficulty) => {
    setEditingWord(word);
    setEditingDifficulty(difficulty);
  };

  const handleFinishEdit = () => {
    setEditingWord(null);
    setEditingDifficulty(null);
  };

  // Get alternative words that could fit in the same slot
  const getAlternatives = useCallback((wordInfo: ClueWord): WordSuggestion[] => {
    // Build a pattern based on the word length with all wildcards
    // Then find words of the same length (excluding the current word)
    const pattern = '_'.repeat(wordInfo.word.length);
    const matches = findMatchingWords(pattern, 12);
    // Filter out the current word
    return matches.filter(m => m.word.toUpperCase() !== wordInfo.word.toUpperCase());
  }, []);

  const handleSwap = useCallback((
    oldWord: ClueWord,
    newWord: string,
    newClue: string
  ) => {
    if (onSwapWord) {
      onSwapWord(oldWord.word, newWord, newClue, oldWord.row, oldWord.col, oldWord.direction);
      setShowAlternatives(null);
    }
  }, [onSwapWord]);

  const renderWordItem = (word: ClueWord) => {
    const isSelected = selectedWord === word.word;
    const dictInfo = getWordInfo(word.word);
    const category = dictInfo?.category;
    const isLoading = loadingAI === word.word;
    const isIslamic = !!dictInfo; // Word exists in Islamic dictionary

    // Determine if word is likely Arabic transliteration vs English
    // Arabic transliterations often have these patterns
    const arabicPatterns = /^(AL|EL|ABU|IBN|BINT|UMM)|[AEIOU]{2}$|^[A-Z]{2,5}$/i;
    const commonEnglish = ['THE', 'AND', 'FOR', 'ARE', 'BUT', 'NOT', 'YOU', 'ALL', 'CAN', 'HER', 'WAS', 'ONE', 'OUR', 'OUT', 'DAY', 'HAD', 'HAS', 'HIS', 'HOW', 'ITS', 'MAY', 'NEW', 'NOW', 'OLD', 'SEE', 'WAY', 'WHO', 'BOY', 'DID', 'GET', 'HIM', 'LET', 'PUT', 'SAY', 'SHE', 'TOO', 'USE', 'ARK', 'AXE', 'CALF', 'CLAY', 'CROW', 'FIRE', 'FISH', 'IRON', 'WELL', 'WIND', 'STAFF', 'WHALE', 'WATER', 'EARTH'];
    const isArabicWord = category && !commonEnglish.includes(word.word.toUpperCase()) &&
      (category === 'names-of-allah' || category === 'quran' ||
       (category === 'prophets' && !['ARK', 'AXE', 'CALF', 'CLAY', 'CROW', 'FIRE', 'FISH', 'IRON', 'WELL', 'WIND', 'STAFF', 'WHALE', 'NILE', 'MANNA', 'AARON', 'SARAH', 'TORAH'].includes(word.word.toUpperCase())));

    // Get clues for this word (from state or dictionary fallback)
    const wordClues = clues[word.word] || {
      easy: dictInfo?.clue || '',
      medium: '',
      hard: '',
    };

    const currentDifficulty = selectedDifficulties[word.word] || 'easy';
    const currentClue = wordClues[currentDifficulty];

    // Category colors
    const categoryColors: Record<string, string> = {
      'prophets': 'bg-emerald-500/20 text-emerald-400',
      'names-of-allah': 'bg-violet-500/20 text-violet-400',
      'quran': 'bg-amber-500/20 text-amber-400',
      'companions': 'bg-blue-500/20 text-blue-400',
      'general': 'bg-slate-500/20 text-slate-400',
    };

    return (
      <div
        key={`${word.direction}-${word.number}-${word.word}`}
        className={cn(
          'px-3 py-2.5 rounded-lg transition-all border',
          isSelected
            ? 'bg-[#D4AF37]/20 border-[#D4AF37]/40'
            : 'bg-[#001a2c]/30 border-transparent hover:border-[#4A90C2]/30'
        )}
      >
        {/* Word header row */}
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[#D4AF37] font-mono font-bold text-xs w-6">
            {word.number}{word.direction === 'across' ? 'A' : 'D'}
          </span>
          <button
            onClick={() => onSelectWord?.(isSelected ? null : word.word)}
            className="text-white font-bold tracking-wider hover:text-[#D4AF37] transition-colors"
          >
            {word.word}
          </button>
          <span className="text-[#6ba8d4] text-[10px]">({word.word.length})</span>

          {/* Tags container */}
          <div className="ml-auto flex items-center gap-1">
            {/* Language tag */}
            {isIslamic && (
              <span className={cn(
                'px-1.5 py-0.5 rounded text-[8px] uppercase tracking-wider',
                isArabicWord
                  ? 'bg-cyan-500/20 text-cyan-400'
                  : 'bg-gray-500/20 text-gray-400'
              )}>
                {isArabicWord ? 'AR' : 'EN'}
              </span>
            )}
            {/* Category tag */}
            {category && (
              <span className={cn(
                'px-1.5 py-0.5 rounded text-[8px] uppercase tracking-wider',
                categoryColors[category] || 'bg-slate-500/20 text-slate-400'
              )}>
                {category === 'names-of-allah' ? 'ALLAH' : category}
              </span>
            )}
            {/* Non-Islamic indicator */}
            {!isIslamic && (
              <span className="px-1.5 py-0.5 rounded text-[8px] uppercase tracking-wider bg-orange-500/20 text-orange-400">
                FILLER
              </span>
            )}
          </div>
        </div>

        {/* Difficulty tabs - always visible */}
        <div className="ml-6 flex items-center gap-1 mb-1.5">
          {(['easy', 'medium', 'hard'] as Difficulty[]).map((diff) => {
            const hasClue = wordClues[diff] && wordClues[diff].length > 0;
            const isActive = currentDifficulty === diff;
            return (
              <button
                key={diff}
                onClick={() => onDifficultyChange(word.word, diff)}
                className={cn(
                  'px-2 py-0.5 rounded text-[10px] uppercase tracking-wider transition-all',
                  isActive
                    ? diff === 'easy'
                      ? 'bg-green-500/30 text-green-300 border border-green-500/40'
                      : diff === 'medium'
                      ? 'bg-amber-500/30 text-amber-300 border border-amber-500/40'
                      : 'bg-red-500/30 text-red-300 border border-red-500/40'
                    : hasClue
                    ? 'bg-[#001a2c]/60 text-[#8fc1e3] hover:text-white border border-[#4A90C2]/20'
                    : 'bg-[#001a2c]/40 text-[#4A90C2] hover:text-[#6ba8d4] border border-transparent'
                )}
              >
                {diff}
                {hasClue && !isActive && <span className="ml-0.5 text-[8px]">•</span>}
              </button>
            );
          })}

          {/* AI button with popover */}
          <ClueOptionsPopover
            word={word.word}
            options={wordClues.options}
            selectedClues={{
              easy: wordClues.easy,
              medium: wordClues.medium,
              hard: wordClues.hard,
            }}
            isLoading={isLoading}
            onSelectClue={(difficulty, clue) => onClueChange(word.word, difficulty, clue)}
            onGenerate={() => handleAskAI(word.word)}
          >
            <button
              className={cn(
                'ml-auto p-1 rounded transition-all',
                isLoading
                  ? 'text-violet-400'
                  : wordClues.options
                    ? 'text-violet-400 hover:bg-violet-500/10'
                    : 'text-[#6ba8d4] hover:text-violet-400 hover:bg-violet-500/10'
              )}
              title="Generate AI clues for all difficulties"
            >
              {isLoading ? (
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              )}
            </button>
          </ClueOptionsPopover>
        </div>

        {/* Clue display/edit */}
        <div className="ml-6">
          {editingWord === word.word && editingDifficulty === currentDifficulty ? (
            <input
              type="text"
              value={currentClue}
              onChange={(e) => onClueChange(word.word, currentDifficulty, e.target.value)}
              onBlur={handleFinishEdit}
              onKeyDown={(e) => e.key === 'Enter' && handleFinishEdit()}
              className="w-full bg-[#001a2c]/60 border border-[#4A90C2]/40 rounded px-2 py-1 text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50"
              placeholder={`Enter ${currentDifficulty} clue...`}
              autoFocus
            />
          ) : (
            <div
              onClick={() => handleStartEdit(word.word, currentDifficulty)}
              className={cn(
                'text-sm cursor-pointer rounded px-2 py-1 -mx-2 transition-colors',
                currentClue
                  ? 'text-[#c0d8e8] hover:bg-[#4A90C2]/10'
                  : 'text-[#6ba8d4] italic hover:bg-[#4A90C2]/10'
              )}
            >
              {currentClue || `Click to add ${currentDifficulty} clue...`}
            </div>
          )}
        </div>

        {/* Alternatives toggle */}
        <div className="ml-6 mt-2">
          <button
            onClick={() => setShowAlternatives(showAlternatives === word.word ? null : word.word)}
            className="text-[10px] text-[#6ba8d4] hover:text-[#D4AF37] transition-colors flex items-center gap-1"
          >
            <svg className={cn("w-3 h-3 transition-transform", showAlternatives === word.word && "rotate-90")} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            Alternatives ({getAlternatives(word).length})
          </button>

          {/* Alternatives list */}
          {showAlternatives === word.word && (
            <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
              {getAlternatives(word).map((alt) => {
                const altInfo = getWordInfo(alt.word);
                const altCategory = altInfo?.category;
                const categoryColors: Record<string, string> = {
                  'prophets': 'bg-emerald-500/20 text-emerald-400',
                  'names-of-allah': 'bg-violet-500/20 text-violet-400',
                  'quran': 'bg-amber-500/20 text-amber-400',
                  'companions': 'bg-blue-500/20 text-blue-400',
                  'general': 'bg-slate-500/20 text-slate-400',
                };
                return (
                  <button
                    key={alt.word}
                    onClick={() => handleSwap(word, alt.word, alt.clue)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded bg-[#001a2c]/40 hover:bg-[#003B5C] border border-transparent hover:border-[#D4AF37]/40 transition-all text-left group"
                  >
                    <span className="text-white font-medium text-sm">{alt.word}</span>
                    {altCategory && (
                      <span className={cn(
                        'px-1 py-0.5 rounded text-[8px] uppercase',
                        categoryColors[altCategory] || 'bg-slate-500/20 text-slate-400'
                      )}>
                        {altCategory === 'names-of-allah' ? 'Allah' : altCategory}
                      </span>
                    )}
                    <span className="text-[#6ba8d4] text-[10px] truncate flex-1">{alt.clue}</span>
                    <span className="text-[#D4AF37] text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">SWAP</span>
                  </button>
                );
              })}
              {getAlternatives(word).length === 0 && (
                <p className="text-[#6ba8d4] text-[10px] italic py-2">No alternatives found</p>
              )}
            </div>
          )}
        </div>
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
          <div className="space-y-1.5">
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
          <div className="space-y-1.5">
            {downWords.map(renderWordItem)}
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="pt-3 border-t border-[#4A90C2]/20 text-[10px] text-[#6ba8d4] flex justify-between">
        <span>{acrossWords.length + downWords.length} words</span>
        <span>
          {Object.values(clues).filter(c => c.easy || c.medium || c.hard).length} with clues
        </span>
      </div>
    </div>
  );
}
