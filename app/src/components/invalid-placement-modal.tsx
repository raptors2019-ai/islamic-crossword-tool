'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { SlotValidation, formatSlot } from '@/lib/perpendicular-validator';
import { AlertTriangle, X, Trash2, RefreshCw, Box } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Suggestion types for fixing invalid placements.
 */
export type PlacementSuggestion =
  | { type: 'remove'; word: string; description: string }
  | { type: 'replace'; oldWord: string; newWord: string; description: string }
  | { type: 'blackbox'; position: { row: number; col: number }; description: string };

interface InvalidPlacementModalProps {
  /** The word that couldn't be placed */
  word: string;
  /** Invalid slots caused by the placement attempt */
  invalidSlots: SlotValidation[];
  /** Suggested fixes */
  suggestions: PlacementSuggestion[];
  /** Callback to close the modal */
  onClose: () => void;
  /** Callback when user applies a suggestion */
  onApplySuggestion: (suggestion: PlacementSuggestion) => void;
}

/**
 * Modal shown when a keyword click would create invalid perpendicular slots.
 * Blocks the placement and offers suggestions for fixing the issue.
 */
export function InvalidPlacementModal({
  word,
  invalidSlots,
  suggestions,
  onClose,
  onApplySuggestion,
}: InvalidPlacementModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-[#002a42] rounded-xl border border-orange-500/40 shadow-2xl shadow-orange-500/10 max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-orange-500/10 border-b border-orange-500/30 px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <h2 className="text-white font-semibold">Cannot Place Word</h2>
                <p className="text-orange-300/80 text-sm">
                  Perpendicular constraint violation
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5 text-[#8fc1e3]" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5">
          {/* Word being placed */}
          <div className="text-center">
            <span className="text-2xl font-bold text-white font-mono tracking-widest bg-[#001a2c] px-4 py-2 rounded-lg inline-block">
              {word}
            </span>
          </div>

          {/* Problem explanation */}
          <div className="bg-[#001a2c]/60 rounded-lg p-4">
            <p className="text-[#8fc1e3] text-sm mb-3">
              This word would cross existing letters in a way that creates
              patterns no valid word can match:
            </p>

            <div className="space-y-2">
              {invalidSlots.map((validation, index) => {
                // Format pattern for display (replace . with _)
                const displayPattern = validation.slot.pattern.replace(/\./g, '_');
                return (
                  <div
                    key={index}
                    className="flex items-center gap-2 bg-orange-500/10 rounded px-3 py-2"
                  >
                    <span className="text-orange-400 font-mono text-sm">
                      {validation.slot.direction === 'across' ? '→' : '↓'}
                    </span>
                    <span className="text-white font-mono text-sm tracking-wider">
                      {displayPattern}
                    </span>
                    <span className="text-orange-300/60 text-xs">
                      — no English word matches
                    </span>
                  </div>
                );
              })}
            </div>

            <p className="text-[#6ba8d4] text-xs mt-3">
              The letters shown are fixed; underscores are empty cells that would need to form a valid word.
            </p>
          </div>

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div>
              <h3 className="text-[#D4AF37] text-sm font-semibold mb-3 uppercase tracking-wider">
                Suggested Fixes
              </h3>
              <div className="space-y-2">
                {suggestions.map((suggestion, index) => (
                  <SuggestionButton
                    key={index}
                    suggestion={suggestion}
                    onClick={() => onApplySuggestion(suggestion)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* No suggestions fallback */}
          {suggestions.length === 0 && (
            <div className="text-center py-4">
              <p className="text-[#6ba8d4] text-sm">
                Try removing some existing words or adding black boxes to create valid slots.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 bg-[#001a2c]/40 border-t border-[#4A90C2]/20 flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-[#4A90C2]/40 text-[#8fc1e3] hover:bg-[#4A90C2]/20"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Button for a single suggestion.
 */
function SuggestionButton({
  suggestion,
  onClick,
}: {
  suggestion: PlacementSuggestion;
  onClick: () => void;
}) {
  let icon: React.ReactNode;
  let label: string;
  let sublabel: string;
  let colorClass: string;

  switch (suggestion.type) {
    case 'remove':
      icon = <Trash2 className="w-4 h-4" />;
      label = `Remove "${suggestion.word}"`;
      sublabel = suggestion.description;
      colorClass = 'hover:bg-red-500/20 hover:border-red-500/40 hover:text-red-400';
      break;
    case 'replace':
      icon = <RefreshCw className="w-4 h-4" />;
      label = `Replace "${suggestion.oldWord}" → "${suggestion.newWord}"`;
      sublabel = suggestion.description;
      colorClass = 'hover:bg-blue-500/20 hover:border-blue-500/40 hover:text-blue-400';
      break;
    case 'blackbox':
      icon = <Box className="w-4 h-4" />;
      label = `Add black box at R${suggestion.position.row + 1}C${suggestion.position.col + 1}`;
      sublabel = suggestion.description;
      colorClass = 'hover:bg-purple-500/20 hover:border-purple-500/40 hover:text-purple-400';
      break;
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left px-4 py-3 rounded-lg border border-[#4A90C2]/30 bg-[#001a2c]/40 transition-all group',
        colorClass
      )}
    >
      <div className="flex items-center gap-3">
        <div className="text-[#6ba8d4] group-hover:text-inherit transition-colors">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-white text-sm font-medium group-hover:text-inherit transition-colors">
            {label}
          </div>
          <div className="text-[#6ba8d4] text-xs truncate">
            {sublabel}
          </div>
        </div>
      </div>
    </button>
  );
}

/**
 * Generate suggestions for fixing an invalid placement.
 * Currently only suggests removing conflicting words, as black box suggestions
 * were found to be confusing in user testing.
 */
export function generatePlacementSuggestions(
  word: string,
  invalidSlots: SlotValidation[],
  placedWords: { word: string; position: { row: number; col: number }; direction: 'across' | 'down' }[]
): PlacementSuggestion[] {
  const suggestions: PlacementSuggestion[] = [];

  // Find words that might be causing conflicts
  for (const validation of invalidSlots) {
    // Find placed words that intersect with this slot
    for (const placedWord of placedWords) {
      const slotCells = getSlotCells(validation.slot);
      const wordCells = getWordCells(placedWord);

      // Check if they intersect
      const intersects = slotCells.some(sc =>
        wordCells.some(wc => wc.row === sc.row && wc.col === sc.col)
      );

      if (intersects) {
        suggestions.push({
          type: 'remove',
          word: placedWord.word,
          description: `Allows "${word}" to be placed instead`,
        });
      }
    }
  }

  // Deduplicate suggestions
  const seen = new Set<string>();
  return suggestions.filter(s => {
    const key = JSON.stringify(s);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 5); // Limit to 5 suggestions
}

/**
 * Get all cells occupied by a slot.
 */
function getSlotCells(slot: SlotValidation['slot']): { row: number; col: number }[] {
  const cells: { row: number; col: number }[] = [];
  for (let i = 0; i < slot.length; i++) {
    const r = slot.direction === 'down' ? slot.start.row + i : slot.start.row;
    const c = slot.direction === 'across' ? slot.start.col + i : slot.start.col;
    cells.push({ row: r, col: c });
  }
  return cells;
}

/**
 * Get all cells occupied by a placed word.
 */
function getWordCells(word: {
  word: string;
  position: { row: number; col: number };
  direction: 'across' | 'down';
}): { row: number; col: number }[] {
  const cells: { row: number; col: number }[] = [];
  for (let i = 0; i < word.word.length; i++) {
    const r = word.direction === 'down' ? word.position.row + i : word.position.row;
    const c = word.direction === 'across' ? word.position.col + i : word.position.col;
    cells.push({ row: r, col: c });
  }
  return cells;
}

export default InvalidPlacementModal;
