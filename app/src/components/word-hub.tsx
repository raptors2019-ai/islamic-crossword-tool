'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  PROPHET_KEYWORDS,
  PROPHET_IDS,
  getKeywordsForProphet,
  ProphetKeyword,
  KeywordSource,
} from '@/lib/prophet-keywords';
import { GeneratedPuzzle, ThemeWord } from '@/lib/types';
import {
  scoreKeywords,
  ScoredKeyword,
  getFitIndicatorStyle,
  getScoredKeywordTooltip,
} from '@/lib/keyword-scorer';
import {
  SlotValidation,
  validatePlacementPerpendicularSlots,
} from '@/lib/perpendicular-validator';
import { EditableCell, findBestPlacement } from '@/lib/editable-grid';
import { WordIndex } from '@/lib/word-index';
import { getSuggestedWords } from '@/lib/word-suggestions';

interface WordHubProps {
  onKeywordSelect: (keyword: ProphetKeyword) => void;
  onKeywordDeselect?: (word: string) => void;
  onCustomWordAdd: (word: string) => void;
  onWordRemove: (wordId: string) => void;
  onWordSelect: (wordId: string) => void;
  selectedWords: ThemeWord[];
  selectedWordId: string | null;
  puzzle: GeneratedPuzzle | null;
  placedInGridIds?: Set<string>; // Words actually placed in the editable grid
  className?: string;
  // Perpendicular validation props (optional - for keyword click validation)
  editableCells?: EditableCell[][];
  wordIndex?: WordIndex;
  onInvalidPlacement?: (word: string, invalidSlots: SlotValidation[]) => void;
  // Auto-generate callback when prophet is selected
  onProphetSelect?: (prophetId: string, keywords: ProphetKeyword[]) => void;
  // Custom word generation
  onGenerateFromCustom?: () => void;
  isGenerating?: boolean;
}

// Source badge colors - more visible
const SOURCE_STYLES: Record<KeywordSource, { bg: string; text: string; label: string }> = {
  'puzzle-archive': { bg: 'bg-amber-500', text: 'text-amber-950', label: 'Proven' },
  'word-list': { bg: 'bg-sky-500', text: 'text-sky-950', label: 'Curated' },
  'scraped': { bg: 'bg-violet-500', text: 'text-violet-950', label: 'AI' },
  'local': { bg: 'bg-slate-500', text: 'text-slate-950', label: 'Local' },
};

export function WordHub({
  onKeywordSelect,
  onKeywordDeselect,
  onCustomWordAdd,
  onWordRemove,
  onWordSelect,
  selectedWords,
  selectedWordId,
  puzzle,
  placedInGridIds,
  className,
  editableCells,
  wordIndex,
  onInvalidPlacement,
  onProphetSelect,
  onGenerateFromCustom,
  isGenerating,
}: WordHubProps) {
  const [selectedProphet, setSelectedProphet] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [customWordInput, setCustomWordInput] = useState('');
  // Track which prophet we've triggered generation for (to avoid duplicate triggers)
  const [hasTriggeredGeneration, setHasTriggeredGeneration] = useState<string | null>(null);

  // Query Convex for keywords when a prophet is selected
  const convexKeywords = useQuery(
    api.prophetKeywords.listByProphet,
    selectedProphet ? { prophetId: selectedProphet } : 'skip'
  );

  const handleProphetChange = useCallback((prophetId: string) => {
    setSelectedProphet(prophetId);
    setShowAll(false);
    // Reset trigger tracking when prophet changes - useEffect will handle generation
    setHasTriggeredGeneration(null);
  }, []);

  // Trigger puzzle generation when Convex keywords load (or fallback to local after timeout)
  useEffect(() => {
    if (!selectedProphet || !onProphetSelect || hasTriggeredGeneration === selectedProphet) {
      return;
    }

    // If Convex keywords are available, use them
    if (convexKeywords && convexKeywords.length > 0) {
      const keywords: ProphetKeyword[] = convexKeywords.map((kw) => ({
        word: kw.word,
        clue: kw.clue,
        relevance: kw.relevance,
        source: kw.source as KeywordSource,
        sourceDetails: kw.sourceDetails,
        isApproved: kw.isApproved,
      }));
      onProphetSelect(selectedProphet, keywords);
      setHasTriggeredGeneration(selectedProphet);
      return;
    }

    // Fallback: If Convex hasn't loaded after 500ms, use local keywords
    const timeoutId = setTimeout(() => {
      if (hasTriggeredGeneration !== selectedProphet) {
        const localKeywords = getKeywordsForProphet(selectedProphet);
        onProphetSelect(selectedProphet, localKeywords);
        setHasTriggeredGeneration(selectedProphet);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [convexKeywords, selectedProphet, onProphetSelect, hasTriggeredGeneration]);

  const handleAddCustomWord = useCallback(() => {
    const word = customWordInput.trim().toUpperCase();
    if (!word || word.length > 5 || word.length < 2) return;
    onCustomWordAdd(word);
    setCustomWordInput('');
  }, [customWordInput, onCustomWordAdd]);

  // Use Convex keywords if available, fall back to local data
  const keywords: ProphetKeyword[] = useMemo(() => {
    if (convexKeywords && convexKeywords.length > 0) {
      return convexKeywords.map((kw) => ({
        word: kw.word,
        clue: kw.clue,
        relevance: kw.relevance,
        source: kw.source as KeywordSource,
        sourceDetails: kw.sourceDetails,
        isApproved: kw.isApproved,
      }));
    }
    return selectedProphet
      ? getKeywordsForProphet(selectedProphet).map((kw) => ({
          ...kw,
          source: 'local' as KeywordSource,
        }))
      : [];
  }, [convexKeywords, selectedProphet]);

  // Score and sort keywords based on grid fit (including perpendicular feasibility)
  const scoredKeywords: ScoredKeyword[] = useMemo(() => {
    if (keywords.length === 0) return [];
    return scoreKeywords(keywords, puzzle, selectedWords, {
      editableCells,
      wordIndex,
    });
  }, [keywords, puzzle, selectedWords, editableCells, wordIndex]);

  const prophetData = selectedProphet
    ? PROPHET_KEYWORDS[selectedProphet]
    : null;

  const selectedWordStrings = selectedWords.map((w) => w.activeSpelling.toUpperCase());

  // Custom words are those with IDs starting with "custom-"
  const customWords = selectedWords.filter((w) => w.id.startsWith('custom-'));

  // Suggested Islamic words based on shared letters with custom words
  const suggestedWords = useMemo(() => {
    if (customWords.length === 0) return [];
    return getSuggestedWords(
      customWords.map(w => w.activeSpelling),
      12
    );
  }, [customWords]);

  // Show more keywords when expanded
  const visibleCount = showAll ? scoredKeywords.length : 20;
  const visibleKeywords = scoredKeywords.slice(0, visibleCount);
  const hasMore = scoredKeywords.length > visibleCount;

  return (
    <div className={cn('space-y-5', className)}>
      {/* Header with word count */}
      <div className="flex items-center justify-between">
        <h3 className="text-[#D4AF37] text-lg font-serif font-semibold tracking-wide">
          Build Your Puzzle
        </h3>
        <span className="text-white font-bold bg-[#4A90C2]/30 px-3 py-1 rounded-full text-sm">
          {selectedWords.length}/12 words
        </span>
      </div>

      {/* Prophet Dropdown */}
      <div className="flex items-center gap-2">
        <span className="text-[#8fc1e3] text-sm">Prophet:</span>
        <Select
          value={selectedProphet || ''}
          onValueChange={handleProphetChange}
        >
          <SelectTrigger className="flex-1 bg-[#002a42]/80 border-[#4A90C2]/30 text-white hover:border-[#D4AF37]/50 transition-colors h-10">
            <SelectValue placeholder="Choose a Prophet..." />
          </SelectTrigger>
          <SelectContent className="bg-[#002a42] border-[#4A90C2]/30 max-h-[400px]">
            {PROPHET_IDS.map((prophetId) => {
              const prophet = PROPHET_KEYWORDS[prophetId];
              return (
                <SelectItem
                  key={prophetId}
                  value={prophetId}
                  className="text-white hover:bg-[#003B5C] focus:bg-[#003B5C] py-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{prophet.displayName}</span>
                    {prophet.arabicName && (
                      <span className="text-[#D4AF37] text-base">
                        {prophet.arabicName}
                      </span>
                    )}
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Keywords Display - MOVED UP above Your Words */}
      {selectedProphet && prophetData && (
        <div className="bg-[#001a2c]/60 rounded-xl p-4 border border-[#4A90C2]/20">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-[#8fc1e3] text-xs uppercase tracking-widest">
              Keywords (sorted by fit)
            </span>
            <span className="text-[#6ba8d4] text-xs">
              {scoredKeywords.length} available
            </span>
          </div>

          {/* Keywords Grid */}
          <div className="flex flex-wrap gap-2 mb-3">
            {visibleKeywords.map((scored) => {
              const { keyword, fitResult, hasPerpendicularConflict } = scored;
              const isSelected = selectedWordStrings.includes(keyword.word.toUpperCase());

              // Check if the keyword is placed in the grid
              const selectedWord = selectedWords.find(w => w.activeSpelling.toUpperCase() === keyword.word.toUpperCase());
              const isPlacedInGrid = selectedWord && placedInGridIds?.has(selectedWord.id);

              const sourceStyle = SOURCE_STYLES[keyword.source || 'local'];
              const fitStyle = getFitIndicatorStyle(fitResult.quality, hasPerpendicularConflict);
              const tooltipText = isPlacedInGrid
                ? `✓ Placed in grid. Click to remove.\n${keyword.clue}`
                : getScoredKeywordTooltip(scored);

              const handleClick = () => {
                if (isSelected && onKeywordDeselect) {
                  // Remove keyword from selection (works for both placed and unplaced)
                  onKeywordDeselect(keyword.word);
                } else if (!isSelected && fitResult.canFit) {
                  // If we have editable cells and word index, validate perpendicular slots
                  if (editableCells && wordIndex && onInvalidPlacement) {
                    // Find the best placement position
                    const placement = findBestPlacement(editableCells, keyword.word);
                    if (placement) {
                      // Validate perpendicular slots for this placement
                      const validations = validatePlacementPerpendicularSlots(
                        editableCells,
                        keyword.word,
                        { row: placement.row, col: placement.col },
                        placement.direction,
                        wordIndex
                      );
                      const invalidSlots = validations.filter(v => !v.isValid);

                      if (invalidSlots.length > 0) {
                        // Block placement and show modal
                        onInvalidPlacement(keyword.word, invalidSlots);
                        return;
                      }
                    }
                  }
                  // Placement is valid or no validation available
                  onKeywordSelect(keyword);
                }
              };

              return (
                <button
                  key={`${keyword.word}-${keyword.source}`}
                  onClick={handleClick}
                  disabled={!isSelected && !fitResult.canFit}
                  className={cn(
                    'group relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-all',
                    // Placed in grid - gold highlight
                    isPlacedInGrid
                      ? 'bg-[#D4AF37] text-[#001a2c] hover:bg-[#e5c86b] cursor-pointer border border-[#D4AF37]'
                      // Selected but not placed - warning state
                      : isSelected
                      ? 'bg-red-500/30 text-white hover:bg-red-500/40 cursor-pointer border border-red-500/50'
                      // Can fit - normal state
                      : fitResult.canFit
                      ? 'bg-[#002a42] text-white hover:bg-[#003B5C] hover:scale-105 cursor-pointer border border-[#4A90C2]/30 hover:border-[#D4AF37]/50'
                      // Cannot fit - disabled
                      : 'bg-[#002a42]/50 text-white/40 cursor-not-allowed border border-[#4A90C2]/10',
                    !isSelected && !fitResult.canFit && fitStyle.opacity
                  )}
                >
                  {/* Checkmark for placed words */}
                  {isPlacedInGrid && (
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                    </svg>
                  )}

                  {/* Warning icon for selected but not placed */}
                  {isSelected && !isPlacedInGrid && (
                    <svg className="w-3.5 h-3.5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  )}

                  {/* Fit indicator dot (only for non-selected keywords that can fit) */}
                  {!isSelected && fitResult.canFit && fitStyle.dotColor && (
                    <span
                      className={cn(
                        'w-2 h-2 rounded-full flex-shrink-0',
                        fitStyle.dotColor
                      )}
                    />
                  )}

                  {/* Word */}
                  <span className="font-mono tracking-wide">{keyword.word}</span>

                  {/* Source indicator (hide for placed words to save space) */}
                  {!isPlacedInGrid && keyword.source && keyword.source !== 'local' && fitResult.canFit && (
                    <span
                      className={cn(
                        'text-[10px] font-bold px-1 py-0.5 rounded',
                        sourceStyle.bg,
                        sourceStyle.text
                      )}
                    >
                      {keyword.source === 'puzzle-archive' ? 'P' : keyword.source === 'word-list' ? 'W' : 'AI'}
                    </span>
                  )}

                  {/* X button for placed/selected keywords */}
                  {isSelected && (
                    <span className="opacity-60 hover:opacity-100 transition-opacity ml-0.5">×</span>
                  )}

                  {/* Tooltip with clue and fit info */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-lg bg-[#001a2c] border border-[#4A90C2]/30 shadow-xl text-xs text-[#b3d4ed] max-w-[250px] text-center opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none whitespace-pre-line">
                    {tooltipText}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Show more button */}
          {hasMore && !showAll && (
            <button
              onClick={() => setShowAll(true)}
              className="w-full py-2 text-sm text-[#D4AF37] hover:text-[#e5c86b] transition-colors"
            >
              Show {scoredKeywords.length - visibleCount} more...
            </button>
          )}

          {/* Legend */}
          <div className="pt-3 border-t border-[#4A90C2]/20 space-y-2">
            {/* Placement status */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-[#8fc1e3]">
              <div className="flex items-center gap-1">
                <span className="px-1.5 py-0.5 rounded bg-[#D4AF37] text-[#001a2c] text-[10px] font-bold">✓</span>
                <span>Placed</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="px-1.5 py-0.5 rounded bg-red-500/30 text-white text-[10px] border border-red-500/50">!</span>
                <span>No fit</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>2+ shared</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-yellow-400" />
                <span>1 shared</span>
              </div>
            </div>
            {/* Source badges */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-[#8fc1e3]">
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-bold px-1 py-0.5 rounded bg-amber-500 text-amber-950">P</span>
                <span>= Proven</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-bold px-1 py-0.5 rounded bg-sky-500 text-sky-950">W</span>
                <span>= Word list</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-bold px-1 py-0.5 rounded bg-violet-500 text-violet-950">AI</span>
                <span>= AI-generated</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty state for keywords - shown when no prophet selected */}
      {!selectedProphet && (
        <div className="bg-[#001a2c]/40 rounded-xl p-6 border border-[#4A90C2]/20 text-center">
          <div className="text-3xl mb-2">📖</div>
          <p className="text-[#8fc1e3] text-sm">Select a prophet above to see story keywords</p>
        </div>
      )}

      {/* Custom Word Input + Added Custom Words */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-[#8fc1e3] text-xs uppercase tracking-widest">Custom:</span>
          <div className="flex items-center gap-1">
            <Input
              placeholder="Add word..."
              value={customWordInput}
              onChange={(e) => setCustomWordInput(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && handleAddCustomWord()}
              maxLength={5}
              className="w-28 h-8 px-2 text-sm bg-[#002a42]/80 border-[#4A90C2]/30 text-white placeholder:text-[#6ba8d4] uppercase tracking-widest focus:ring-2 focus:ring-[#D4AF37]/30"
            />
            {customWordInput.trim() && customWordInput.length >= 2 && customWordInput.length <= 5 && (
              <button
                onClick={handleAddCustomWord}
                className="w-8 h-8 rounded-lg bg-[#D4AF37] hover:bg-[#e5c86b] text-[#001a2c] font-bold flex items-center justify-center transition-colors"
              >
                +
              </button>
            )}
          </div>
        </div>

        {/* Display added custom words as chips */}
        {customWords.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {customWords.map((cw) => {
              const isPlaced = placedInGridIds?.has(cw.id);
              return (
                <button
                  key={cw.id}
                  onClick={() => onKeywordDeselect?.(cw.activeSpelling)}
                  className={cn(
                    'group relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer',
                    isPlaced
                      ? 'bg-[#D4AF37] text-[#001a2c] hover:bg-[#e5c86b] border border-[#D4AF37]'
                      : 'bg-violet-500/30 text-white hover:bg-violet-500/40 border border-violet-500/50'
                  )}
                >
                  {isPlaced && (
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                    </svg>
                  )}
                  <span className="font-mono tracking-wide">{cw.activeSpelling}</span>
                  <span className="opacity-60 hover:opacity-100 transition-opacity ml-0.5">&times;</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Generate Puzzle button — appears with 2+ custom words */}
        {customWords.length >= 2 && onGenerateFromCustom && (
          <button
            onClick={onGenerateFromCustom}
            disabled={isGenerating}
            className={cn(
              'w-full py-2.5 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2',
              isGenerating
                ? 'bg-[#D4AF37]/50 text-[#001a2c]/60 cursor-wait'
                : 'bg-[#D4AF37] text-[#001a2c] hover:bg-[#e5c86b] hover:scale-[1.02]'
            )}
          >
            {isGenerating ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Generating...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Generate Puzzle
              </>
            )}
          </button>
        )}

        {/* Suggested Words — Islamic words sharing letters with custom words */}
        {suggestedWords.length > 0 && (
          <div className="pt-2 border-t border-[#4A90C2]/20">
            <span className="text-[#8fc1e3] text-xs uppercase tracking-widest">
              Suggested Words
            </span>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {suggestedWords.map((sw) => (
                <button
                  key={sw.word}
                  onClick={() => onCustomWordAdd(sw.word)}
                  className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-[#002a42] text-[#8fc1e3] hover:bg-[#003B5C] hover:text-white border border-[#4A90C2]/20 hover:border-[#D4AF37]/40 transition-all"
                >
                  <span className="font-mono tracking-wide">{sw.word}</span>
                  <span className="text-[#6ba8d4] text-[10px]">+{sw.sharedLetters}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default WordHub;
