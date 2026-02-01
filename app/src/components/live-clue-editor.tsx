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

type Difficulty = 'easy' | 'medium' | 'hard';

interface ClueAlternatives {
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
  alternatives?: ClueAlternatives;
}

interface LiveClueEditorProps {
  cells: EditableCell[][];
  clues: Record<string, DifficultyClues>;
  selectedDifficulties: Record<string, Difficulty>;
  onClueChange: (word: string, difficulty: Difficulty, clue: string) => void;
  onDifficultyChange: (word: string, difficulty: Difficulty) => void;
  onClueOptionsUpdate?: (word: string, options: { easy: string[]; medium: string[]; hard: string[] }) => void;
  onSwapClueAlternative?: (word: string, difficulty: Difficulty, alternativeClue: string) => void;
  onSwapWord?: (oldWord: string, newWord: string, newClue: string, row: number, col: number, direction: 'across' | 'down') => void;
  onRegenerateWord?: (word: { word: string; row: number; col: number; direction: 'across' | 'down' }) => void;
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
  onSwapClueAlternative,
  onSwapWord,
  onRegenerateWord,
  selectedWord,
  onSelectWord,
}: LiveClueEditorProps) {
  const [editingWord, setEditingWord] = useState<string | null>(null);
  const [editingDifficulty, setEditingDifficulty] = useState<Difficulty | null>(null);
  const [loadingAI, setLoadingAI] = useState<string | null>(null);
  const [loadingAllClues, setLoadingAllClues] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

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
      console.log('[handleAskAI] Starting for word:', word);
      setLoadingAI(word);
      try {
        const result = await generateClues({ word });
        console.log('[handleAskAI] Raw result:', result);

        // Check for API error
        if (result.error) {
          console.error('[handleAskAI] API returned error:', result.error);
          return;
        }

        // API returns arrays of clue options
        const easyArr = Array.isArray(result.easy) ? result.easy : [];
        const mediumArr = Array.isArray(result.medium) ? result.medium : [];
        const hardArr = Array.isArray(result.hard) ? result.hard : [];

        console.log('[handleAskAI] Parsed arrays:', { easy: easyArr, medium: mediumArr, hard: hardArr });

        const hasOptions = easyArr.length > 0 || mediumArr.length > 0 || hardArr.length > 0;
        console.log('[handleAskAI] hasOptions:', hasOptions, 'onClueOptionsUpdate exists:', !!onClueOptionsUpdate);

        if (hasOptions && onClueOptionsUpdate) {
          console.log('[handleAskAI] Calling onClueOptionsUpdate');
          onClueOptionsUpdate(word, {
            easy: easyArr,
            medium: mediumArr,
            hard: hardArr,
          });
        }
      } catch (error) {
        console.error('[handleAskAI] Failed to generate clues:', error);
      } finally {
        setLoadingAI(null);
      }
    },
    [generateClues, onClueOptionsUpdate]
  );

  // Generate clues for all words at once
  const handleGenerateAllClues = useCallback(async () => {
    if (!onClueOptionsUpdate || detectedWords.length === 0) return;

    setLoadingAllClues(true);

    // Get words that need clues (don't have any yet)
    const wordsNeedingClues = detectedWords.filter(wordInfo => {
      const wordClues = clues[wordInfo.word];
      return !wordClues?.easy && !wordClues?.medium && !wordClues?.hard;
    });

    // Generate clues for each word sequentially to avoid rate limits
    for (const wordInfo of wordsNeedingClues) {
      try {
        setLoadingAI(wordInfo.word);
        const result = await generateClues({ word: wordInfo.word });

        if (!result.error) {
          const easyArr = Array.isArray(result.easy) ? result.easy : [];
          const mediumArr = Array.isArray(result.medium) ? result.medium : [];
          const hardArr = Array.isArray(result.hard) ? result.hard : [];

          if (easyArr.length > 0 || mediumArr.length > 0 || hardArr.length > 0) {
            onClueOptionsUpdate(wordInfo.word, {
              easy: easyArr,
              medium: mediumArr,
              hard: hardArr,
            });
          }
        }
      } catch (error) {
        console.error(`Failed to generate clues for ${wordInfo.word}:`, error);
      }
    }

    setLoadingAI(null);
    setLoadingAllClues(false);
  }, [detectedWords, clues, generateClues, onClueOptionsUpdate]);

  const handleStartEdit = (word: string, difficulty: Difficulty) => {
    setEditingWord(word);
    setEditingDifficulty(difficulty);
  };

  const handleFinishEdit = () => {
    setEditingWord(null);
    setEditingDifficulty(null);
  };

  // Get alternative words that could fit in the same slot
  const getWordAlternatives = useCallback((wordInfo: ClueWord): WordSuggestion[] => {
    const pattern = '_'.repeat(wordInfo.word.length);
    const matches = findMatchingWords(pattern, 8);
    return matches.filter(m => m.word.toUpperCase() !== wordInfo.word.toUpperCase());
  }, []);

  const handleSwapWordAlt = useCallback((
    oldWord: ClueWord,
    newWord: string,
    newClue: string
  ) => {
    if (onSwapWord) {
      onSwapWord(oldWord.word, newWord, newClue, oldWord.row, oldWord.col, oldWord.direction);
      setExpandedSection(null);
    }
  }, [onSwapWord]);

  const renderWordItem = (word: ClueWord) => {
    const isSelected = selectedWord === word.word;
    const dictInfo = getWordInfo(word.word);
    const category = dictInfo?.category;
    const isLoading = loadingAI === word.word;
    const isIslamic = !!dictInfo;

    const commonEnglish = ['THE', 'AND', 'FOR', 'ARE', 'BUT', 'NOT', 'YOU', 'ALL', 'CAN', 'HER', 'WAS', 'ONE', 'OUR', 'OUT', 'DAY', 'HAD', 'HAS', 'HIS', 'HOW', 'ITS', 'MAY', 'NEW', 'NOW', 'OLD', 'SEE', 'WAY', 'WHO', 'BOY', 'DID', 'GET', 'HIM', 'LET', 'PUT', 'SAY', 'SHE', 'TOO', 'USE', 'ARK', 'AXE', 'CALF', 'CLAY', 'CROW', 'FIRE', 'FISH', 'IRON', 'WELL', 'WIND', 'STAFF', 'WHALE', 'WATER', 'EARTH'];
    const isArabicWord = category && !commonEnglish.includes(word.word.toUpperCase()) &&
      (category === 'names-of-allah' || category === 'quran' ||
       (category === 'prophets' && !['ARK', 'AXE', 'CALF', 'CLAY', 'CROW', 'FIRE', 'FISH', 'IRON', 'WELL', 'WIND', 'STAFF', 'WHALE', 'NILE', 'MANNA', 'AARON', 'SARAH', 'TORAH'].includes(word.word.toUpperCase())));

    const wordClues = clues[word.word] || {
      easy: dictInfo?.clue || '',
      medium: '',
      hard: '',
    };

    const currentDifficulty = selectedDifficulties[word.word] || 'easy';
    const currentClue = wordClues[currentDifficulty];

    // Get clue alternatives for current difficulty
    const clueAlternatives = wordClues.alternatives?.[currentDifficulty] || [];
    const wordAlternatives = getWordAlternatives(word);

    const categoryColors: Record<string, string> = {
      'prophets': 'bg-emerald-500/20 text-emerald-400',
      'names-of-allah': 'bg-violet-500/20 text-violet-400',
      'quran': 'bg-amber-500/20 text-amber-400',
      'companions': 'bg-blue-500/20 text-blue-400',
      'general': 'bg-slate-500/20 text-slate-400',
    };

    const isClueAltsExpanded = expandedSection === `${word.word}-clues`;
    const isWordAltsExpanded = expandedSection === `${word.word}-words`;

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

          <div className="ml-auto flex items-center gap-1">
            {isIslamic && (
              <span className={cn(
                'px-1.5 py-0.5 rounded text-[8px] uppercase tracking-wider',
                isArabicWord ? 'bg-cyan-500/20 text-cyan-400' : 'bg-gray-500/20 text-gray-400'
              )}>
                {isArabicWord ? 'AR' : 'EN'}
              </span>
            )}
            {category && (
              <span className={cn(
                'px-1.5 py-0.5 rounded text-[8px] uppercase tracking-wider',
                categoryColors[category] || 'bg-slate-500/20 text-slate-400'
              )}>
                {category === 'names-of-allah' ? 'ALLAH' : category}
              </span>
            )}
            {!isIslamic && (
              <>
                <span className="px-1.5 py-0.5 rounded text-[8px] uppercase tracking-wider bg-orange-500/20 text-orange-400">
                  FILLER
                </span>
                {/* Regenerate button for filler words */}
                {onRegenerateWord && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRegenerateWord({
                        word: word.word,
                        row: word.row,
                        col: word.col,
                        direction: word.direction,
                      });
                    }}
                    className="p-1 rounded transition-all text-orange-400 hover:text-orange-300 hover:bg-orange-500/20"
                    title="Regenerate puzzle"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Difficulty tabs */}
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

          {/* AI button */}
          <button
            onClick={() => handleAskAI(word.word)}
            disabled={isLoading}
            className={cn(
              'ml-auto p-1 rounded transition-all',
              isLoading
                ? 'text-violet-400'
                : 'text-[#6ba8d4] hover:text-violet-400 hover:bg-violet-500/10'
            )}
            title="Generate more AI clue options"
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
        </div>

        {/* Current clue display/edit */}
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
              {isLoading && !currentClue ? (
                <span className="flex items-center gap-2 text-violet-400">
                  <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Generating clues...
                </span>
              ) : currentClue || `Click to add ${currentDifficulty} clue...`}
            </div>
          )}
        </div>

        {/* Clue Alternatives toggle */}
        {clueAlternatives.length > 0 && (
          <div className="ml-6 mt-2">
            <button
              onClick={() => setExpandedSection(isClueAltsExpanded ? null : `${word.word}-clues`)}
              className="text-[10px] text-violet-400 hover:text-violet-300 transition-colors flex items-center gap-1"
            >
              <svg className={cn("w-3 h-3 transition-transform", isClueAltsExpanded && "rotate-90")} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              Clue Alternatives ({clueAlternatives.length})
            </button>

            {isClueAltsExpanded && (
              <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                {clueAlternatives.map((altClue, idx) => (
                  <button
                    key={idx}
                    onClick={() => onSwapClueAlternative?.(word.word, currentDifficulty, altClue)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded bg-violet-500/10 hover:bg-violet-500/20 border border-transparent hover:border-violet-500/30 transition-all text-left group"
                  >
                    <span className="text-[#c0d8e8] text-sm flex-1">{altClue}</span>
                    <span className="text-violet-400 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">USE</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Word Alternatives toggle - only show if there are alternatives */}
        {wordAlternatives.length > 0 && (
          <div className="ml-6 mt-2">
            <button
              onClick={() => setExpandedSection(isWordAltsExpanded ? null : `${word.word}-words`)}
              className="text-[10px] text-[#6ba8d4] hover:text-[#D4AF37] transition-colors flex items-center gap-1"
            >
              <svg className={cn("w-3 h-3 transition-transform", isWordAltsExpanded && "rotate-90")} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              Word Alternatives ({wordAlternatives.length})
            </button>

            {isWordAltsExpanded && (
              <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                {wordAlternatives.map((alt) => {
                  const altInfo = getWordInfo(alt.word);
                  const altCategory = altInfo?.category;
                  return (
                    <button
                      key={alt.word}
                      onClick={() => handleSwapWordAlt(word, alt.word, alt.clue)}
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
              </div>
            )}
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

  // Count words without clues
  const wordsWithoutClues = detectedWords.filter(wordInfo => {
    const wordClues = clues[wordInfo.word];
    return !wordClues?.easy && !wordClues?.medium && !wordClues?.hard;
  }).length;

  return (
    <div className="space-y-4">
      {/* Generate All Clues Button */}
      <button
        onClick={handleGenerateAllClues}
        disabled={loadingAllClues || wordsWithoutClues === 0}
        className={cn(
          "w-full py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-all font-medium text-sm",
          loadingAllClues
            ? "bg-violet-600/30 text-violet-300 cursor-wait"
            : wordsWithoutClues === 0
            ? "bg-[#001a2c]/40 text-[#6ba8d4] cursor-default"
            : "bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:from-violet-500 hover:to-purple-500 hover:scale-[1.02] shadow-lg shadow-violet-500/20"
        )}
      >
        {loadingAllClues ? (
          <>
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span>Generating Clues...</span>
          </>
        ) : wordsWithoutClues === 0 ? (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>All Words Have Clues</span>
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
            <span>Generate All Clues ({wordsWithoutClues})</span>
          </>
        )}
      </button>

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

      <div className="pt-3 border-t border-[#4A90C2]/20 text-[10px] text-[#6ba8d4] flex justify-between">
        <span>{acrossWords.length + downWords.length} words</span>
        <span>
          {Object.values(clues).filter(c => c.easy || c.medium || c.hard).length} with clues
        </span>
      </div>
    </div>
  );
}
