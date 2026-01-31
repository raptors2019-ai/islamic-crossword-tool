'use client';

import { useState, useCallback } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  PROPHET_KEYWORDS,
  PROPHET_IDS,
  getKeywordsForProphet,
  ProphetKeyword,
} from '@/lib/prophet-keywords';
import { KeywordPills } from './keyword-pills';
import { GeneratedPuzzle, ThemeWord } from '@/lib/types';

interface ProphetSelectorProps {
  onKeywordSelect: (keyword: ProphetKeyword) => void;
  selectedWords: ThemeWord[];
  puzzle: GeneratedPuzzle | null;
  className?: string;
}

export function ProphetSelector({
  onKeywordSelect,
  selectedWords,
  puzzle,
  className,
}: ProphetSelectorProps) {
  const [selectedProphet, setSelectedProphet] = useState<string | null>(null);
  const [showKeywords, setShowKeywords] = useState(false);

  const handleProphetChange = useCallback((prophetId: string) => {
    setSelectedProphet(prophetId);
    setShowKeywords(false);
  }, []);

  const handleShowKeywords = useCallback(() => {
    if (selectedProphet) {
      setShowKeywords(true);
    }
  }, [selectedProphet]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && selectedProphet) {
        e.preventDefault();
        setShowKeywords(true);
      }
    },
    [selectedProphet]
  );

  // Keywords are already filtered to 5x5 valid words (2-5 letters)
  const keywords = selectedProphet
    ? getKeywordsForProphet(selectedProphet)
    : [];

  const prophetData = selectedProphet
    ? PROPHET_KEYWORDS[selectedProphet]
    : null;

  const selectedWordStrings = selectedWords.map((w) => w.activeSpelling);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Prophet Dropdown */}
      <div className="flex gap-2" onKeyDown={handleKeyDown}>
        <Select
          value={selectedProphet || ''}
          onValueChange={handleProphetChange}
        >
          <SelectTrigger className="flex-1 bg-[#002a42]/80 border-[#4A90C2]/30 text-white hover:border-[#D4AF37]/50 transition-colors">
            <SelectValue placeholder="Select a Prophet" />
          </SelectTrigger>
          <SelectContent className="bg-[#002a42] border-[#4A90C2]/30 max-h-[300px]">
            {PROPHET_IDS.map((prophetId) => {
              const prophet = PROPHET_KEYWORDS[prophetId];
              return (
                <SelectItem
                  key={prophetId}
                  value={prophetId}
                  className="text-white hover:bg-[#003B5C] focus:bg-[#003B5C]"
                >
                  <div className="flex items-center gap-2">
                    <span>{prophet.displayName}</span>
                    {prophet.arabicName && (
                      <span className="text-[#D4AF37] text-sm">
                        {prophet.arabicName}
                      </span>
                    )}
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

        <Button
          onClick={handleShowKeywords}
          disabled={!selectedProphet}
          className={cn(
            'px-4 transition-all',
            selectedProphet
              ? 'bg-[#D4AF37] hover:bg-[#e5c86b] text-[#001a2c]'
              : 'bg-[#4A90C2]/30 text-[#6ba8d4]'
          )}
        >
          {showKeywords ? 'Refresh' : 'Show'}
        </Button>
      </div>

      {/* Keywords Panel */}
      {showKeywords && prophetData && (
        <Card className="glass border-[#4A90C2]/20 overflow-hidden animate-fade-in-up">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-[#D4AF37] font-medium flex items-center gap-2">
                <span>Keywords for {prophetData.displayName}</span>
                {prophetData.arabicName && (
                  <span className="text-lg">{prophetData.arabicName}</span>
                )}
              </h4>
              <span className="text-[#8fc1e3] text-xs">
                {keywords.length} keywords
              </span>
            </div>

            <KeywordPills
              keywords={keywords}
              onKeywordClick={onKeywordSelect}
              selectedWords={selectedWordStrings}
              puzzle={puzzle}
              maxVisible={16}
              showFitIndicators={true}
            />

            {/* Legend */}
            <div className="mt-4 pt-3 border-t border-[#4A90C2]/20 flex flex-wrap gap-4 text-xs text-[#8fc1e3]">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Good fit</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-yellow-400" />
                <span>May fit</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-400" />
                <span>Won&apos;t fit</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[#D4AF37]">Gold</span>
                <span>= Selected</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Hint when prophet selected but keywords not shown */}
      {selectedProphet && !showKeywords && (
        <p className="text-[#8fc1e3] text-sm">
          Press <kbd className="px-1.5 py-0.5 rounded bg-[#001a2c] border border-[#4A90C2]/30 text-xs">Enter</kbd> or click Show to see keywords
        </p>
      )}
    </div>
  );
}

// Compact version for inline display
export function ProphetSelectorCompact({
  onProphetChange,
  selectedProphet,
  className,
}: {
  onProphetChange: (prophetId: string | null) => void;
  selectedProphet: string | null;
  className?: string;
}) {
  return (
    <Select
      value={selectedProphet || ''}
      onValueChange={(v) => onProphetChange(v || null)}
    >
      <SelectTrigger
        className={cn(
          'bg-[#002a42]/80 border-[#4A90C2]/30 text-white hover:border-[#D4AF37]/50 transition-colors',
          className
        )}
      >
        <SelectValue placeholder="Select Prophet..." />
      </SelectTrigger>
      <SelectContent className="bg-[#002a42] border-[#4A90C2]/30 max-h-[250px]">
        <SelectItem value="" className="text-[#8fc1e3] hover:bg-[#003B5C]">
          All Prophets
        </SelectItem>
        {PROPHET_IDS.map((prophetId) => {
          const prophet = PROPHET_KEYWORDS[prophetId];
          return (
            <SelectItem
              key={prophetId}
              value={prophetId}
              className="text-white hover:bg-[#003B5C]"
            >
              {prophet.displayName}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
