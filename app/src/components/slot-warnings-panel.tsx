'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { SlotValidation, formatSlot, getSlotCells } from '@/lib/perpendicular-validator';
import { AlertTriangle, CheckCircle, XCircle, Box } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SlotWarningsPanelProps {
  /** Validation results for all slots */
  validations: SlotValidation[];
  /** Callback when user applies a black box fix */
  onApplyBlackBox?: (position: { row: number; col: number }) => void;
  /** Whether to show all validations or just warnings */
  showAll?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Panel showing perpendicular slot validation warnings.
 * Used in manual typing mode to warn users about invalid slots.
 */
export function SlotWarningsPanel({
  validations,
  onApplyBlackBox,
  showAll = false,
  className,
}: SlotWarningsPanelProps) {
  const invalidValidations = validations.filter(v => !v.isValid);
  const validValidations = validations.filter(v => v.isValid);

  // Nothing to show if all valid and not showing all
  if (!showAll && invalidValidations.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        'bg-[#001a2c]/60 rounded-xl border border-[#4A90C2]/20 overflow-hidden',
        className
      )}
    >
      {/* Header */}
      <div className="px-4 py-3 bg-[#001a2c]/40 border-b border-[#4A90C2]/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {invalidValidations.length > 0 ? (
              <AlertTriangle className="w-4 h-4 text-orange-400" />
            ) : (
              <CheckCircle className="w-4 h-4 text-emerald-400" />
            )}
            <span className="text-[#8fc1e3] text-xs uppercase tracking-widest">
              Slot Validation
            </span>
          </div>
          <span
            className={cn(
              'text-xs font-medium px-2 py-0.5 rounded-full',
              invalidValidations.length > 0
                ? 'bg-orange-500/20 text-orange-400'
                : 'bg-emerald-500/20 text-emerald-400'
            )}
          >
            {invalidValidations.length > 0
              ? `${invalidValidations.length} warning${invalidValidations.length !== 1 ? 's' : ''}`
              : 'All valid'}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3 max-h-[300px] overflow-y-auto">
        {/* Invalid slots (warnings) */}
        {invalidValidations.map((validation, index) => (
          <SlotWarningItem
            key={`invalid-${index}`}
            validation={validation}
            onApplyBlackBox={onApplyBlackBox}
          />
        ))}

        {/* Valid slots (if showing all) */}
        {showAll && validValidations.length > 0 && (
          <>
            {invalidValidations.length > 0 && (
              <div className="border-t border-[#4A90C2]/20 pt-3 mt-3">
                <span className="text-[#6ba8d4] text-xs">Valid slots:</span>
              </div>
            )}
            {validValidations.map((validation, index) => (
              <SlotValidItem key={`valid-${index}`} validation={validation} />
            ))}
          </>
        )}

        {/* Empty state */}
        {validations.length === 0 && (
          <div className="text-center py-4">
            <Box className="w-8 h-8 mx-auto mb-2 text-[#4A90C2]/40" />
            <p className="text-[#6ba8d4] text-sm">
              No slots to validate yet
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Individual warning item for an invalid slot.
 */
function SlotWarningItem({
  validation,
  onApplyBlackBox,
}: {
  validation: SlotValidation;
  onApplyBlackBox?: (position: { row: number; col: number }) => void;
}) {
  const { slot, suggestedBlackBox } = validation;
  const directionIcon = slot.direction === 'across' ? '→' : '↓';
  const positionLabel = `R${slot.start.row + 1}C${slot.start.col + 1}`;

  return (
    <div className="bg-orange-500/10 rounded-lg border border-orange-500/30 p-3">
      <div className="flex items-start gap-2">
        <XCircle className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-orange-400 font-mono text-sm font-medium">
              {directionIcon} {positionLabel}
            </span>
            <span className="text-white font-mono tracking-wider bg-[#001a2c] px-2 py-0.5 rounded text-sm">
              {slot.pattern}
            </span>
          </div>
          <p className="text-orange-300/80 text-xs mt-1">
            No valid words match this pattern
          </p>

          {/* Black box suggestion */}
          {suggestedBlackBox && onApplyBlackBox && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onApplyBlackBox(suggestedBlackBox)}
              className="mt-2 h-7 text-xs border-orange-500/40 text-orange-400 hover:bg-orange-500/20 hover:text-orange-300"
            >
              <Box className="w-3 h-3 mr-1" />
              Fix: Add black box at R{suggestedBlackBox.row + 1}C{suggestedBlackBox.col + 1}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Individual item for a valid slot (shown when showAll is true).
 */
function SlotValidItem({
  validation,
}: {
  validation: SlotValidation;
}) {
  const { slot, candidates } = validation;
  const directionIcon = slot.direction === 'across' ? '→' : '↓';
  const positionLabel = `R${slot.start.row + 1}C${slot.start.col + 1}`;

  return (
    <div className="bg-[#001a2c]/40 rounded-lg border border-[#4A90C2]/20 p-3">
      <div className="flex items-start gap-2">
        <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-emerald-400 font-mono text-sm">
              {directionIcon} {positionLabel}
            </span>
            <span className="text-white font-mono tracking-wider bg-[#001a2c] px-2 py-0.5 rounded text-sm">
              {slot.pattern}
            </span>
            <span className="text-[#6ba8d4] text-xs">
              ({candidates.length}+ words)
            </span>
          </div>
          {/* Show a few candidates */}
          {candidates.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {candidates.slice(0, 5).map(word => (
                <span
                  key={word}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-[#4A90C2]/20 text-[#8fc1e3] font-mono"
                >
                  {word}
                </span>
              ))}
              {candidates.length > 5 && (
                <span className="text-[10px] text-[#6ba8d4]">
                  +{candidates.length - 5} more
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SlotWarningsPanel;
